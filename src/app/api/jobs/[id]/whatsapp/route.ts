import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { buildTemplateVars, buildWaLink, isTwilioConfigured, renderTemplate, sendViaTwilio } from "@/lib/whatsapp";
import { JOB_STATUS_CUSTOMER_LABELS, WHATSAPP_TEMPLATE_KEYS, type JobStatus } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";

const schema = z.object({
  templateKey: z.enum(WHATSAPP_TEMPLATE_KEYS),
  customMessage: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"]);
    const { id } = await params;
    const { templateKey, customMessage } = schema.parse(await request.json());

    const [job, settings, template] = await Promise.all([
      prisma.serviceJob.findUnique({
        where: { id },
        include: { customer: true, device: true, diagnosis: true, payments: true },
      }),
      prisma.settings.findUnique({ where: { id: 1 } }),
      prisma.whatsAppTemplate.findUnique({ where: { key: templateKey } }),
    ]);
    if (!job) throw new ApiError(404, "Service job not found.");
    if (!job.customer.whatsapp && !job.customer.mobile) {
      throw new ApiError(400, "This customer has no WhatsApp or mobile number on file.");
    }

    const paidTotal = job.payments.reduce((s, p) => s + p.amount, 0);
    const total = job.approvedCost ?? job.estimatedCost ?? 0;
    const vars = buildTemplateVars({
      customerName: job.customer.name,
      companyName: settings?.companyName ?? "RepairFlow Service Center",
      jobNumber: job.jobNumber,
      publicToken: job.publicToken,
      deviceBrand: job.device.brand,
      deviceModel: job.device.model,
      status: JOB_STATUS_CUSTOMER_LABELS[job.status as JobStatus] ?? job.status,
      diagnosisSummary: job.diagnosis?.diagnosisText ?? safeJsonParse<string[]>(job.quickIssues, []).join(", "),
      estimatedCost: total,
      expectedDate: job.expectedCompletionDate,
      pendingAmount: Math.max(0, total - paidTotal),
    });

    const messageText =
      templateKey === "CUSTOM" && customMessage
        ? customMessage
        : renderTemplate(template?.body ?? "Hi {{customerName}}, update from {{companyName}} on {{jobNumber}}.", vars);

    const targetNumber = job.customer.whatsapp || job.customer.mobile;

    let method: "TWILIO" | "LINK" = "LINK";
    let status: "SENT" | "FAILED" | "LINK_OPENED" = "LINK_OPENED";
    let waLink: string | undefined;
    let errorDetail: string | undefined;

    if (settings && isTwilioConfigured(settings)) {
      method = "TWILIO";
      const result = await sendViaTwilio({
        accountSid: settings.twilioAccountSid!,
        authToken: settings.twilioAuthToken!,
        from: settings.twilioWhatsAppFrom!,
        to: targetNumber,
        message: messageText,
      });
      status = result.ok ? "SENT" : "FAILED";
      errorDetail = result.error;
    } else {
      waLink = buildWaLink(targetNumber, messageText);
    }

    const logged = await prisma.whatsAppMessage.create({
      data: {
        jobId: id,
        customerId: job.customerId,
        templateKey,
        messageText,
        method,
        status,
        sentById: session.sub,
      },
    });

    if (status === "FAILED") {
      return NextResponse.json(
        { error: `WhatsApp send failed via Twilio: ${errorDetail ?? "unknown error"}`, message: logged },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: logged, waLink });
  } catch (err) {
    return errorResponse(err);
  }
}
