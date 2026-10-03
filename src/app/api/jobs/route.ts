import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { newJobSchema } from "@/lib/validation";
import { nextCustomerCode, randomToken } from "@/lib/sequence";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const sp = request.nextUrl.searchParams;
    const status = sp.get("status");
    const priority = sp.get("priority");
    const technicianId = sp.get("technicianId");
    const q = sp.get("q")?.trim();
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(50, Number(sp.get("pageSize") ?? 20));
    const mine = sp.get("mine") === "true";
    const includeArchived = sp.get("includeArchived") === "true";

    const where: Prisma.ServiceJobWhereInput = {};
    if (!includeArchived) where.isArchived = false;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (technicianId) where.assignedTechnicianId = technicianId;
    if (mine && session.role === "TECHNICIAN") where.assignedTechnicianId = session.sub;
    if (q) {
      where.OR = [
        { jobNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { mobile: { contains: q } } },
        { device: { brand: { contains: q } } },
        { device: { model: { contains: q } } },
        { device: { serialNumber: { contains: q } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.serviceJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: true, device: true, assignedTechnician: true },
      }),
      prisma.serviceJob.count({ where }),
    ]);

    return NextResponse.json({ jobs, total, page, pageSize });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"]);
    const body = await request.json();
    const parsed = newJobSchema.parse(body);

    if (!parsed.customerId && !parsed.customer) {
      throw new ApiError(400, "Provide an existing customer or new customer details.");
    }
    if (!parsed.deviceId && !parsed.device) {
      throw new ApiError(400, "Provide an existing device or new device details.");
    }

    const job = await prisma.$transaction(async (tx) => {
      let customerId = parsed.customerId;
      if (!customerId && parsed.customer) {
        const existing = await tx.customer.findFirst({ where: { mobile: parsed.customer.mobile } });
        if (existing) {
          customerId = existing.id;
        } else {
          const created = await tx.customer.create({
            data: {
              customerCode: await nextCustomerCode(tx),
              name: parsed.customer.name,
              mobile: parsed.customer.mobile,
              whatsapp: parsed.customer.whatsapp || parsed.customer.mobile,
              email: parsed.customer.email || null,
              address: parsed.customer.address || null,
              customerType: parsed.customer.customerType,
              notes: parsed.customer.notes || null,
            },
          });
          customerId = created.id;
        }
      }
      if (!customerId) throw new ApiError(400, "Could not resolve customer.");

      let deviceId = parsed.deviceId;
      if (!deviceId && parsed.device) {
        const created = await tx.device.create({
          data: {
            customerId,
            deviceType: parsed.device.deviceType,
            brand: parsed.device.brand,
            model: parsed.device.model,
            serialNumber: parsed.device.serialNumber || null,
            serviceTag: parsed.device.serviceTag || null,
            operatingSystem: parsed.device.operatingSystem || null,
            processor: parsed.device.processor || null,
            ram: parsed.device.ram || null,
            storage: parsed.device.storage || null,
            color: parsed.device.color || null,
            deviceAgeYears: parsed.device.deviceAgeYears ?? null,
          },
        });
        deviceId = created.id;
      }
      if (!deviceId) throw new ApiError(400, "Could not resolve device.");

      const year = new Date().getFullYear();
      const likePrefix = `JOB-${year}-`;
      const existingCount = await tx.serviceJob.count({ where: { jobNumber: { startsWith: likePrefix } } });
      const jobNumber = `${likePrefix}${String(existingCount + 1).padStart(5, "0")}`;

      const created = await tx.serviceJob.create({
        data: {
          jobNumber,
          publicToken: randomToken(),
          customerId,
          deviceId,
          status: "RECEIVED",
          priority: parsed.priority,
          createdByUserId: session.sub,
          assignedTechnicianId: parsed.assignedTechnicianId || null,
          conditionChecklist: parsed.conditionChecklist ? JSON.stringify(parsed.conditionChecklist) : null,
          accessoriesReceived: JSON.stringify(parsed.accessoriesReceived ?? []),
          quickIssues: JSON.stringify(parsed.quickIssues ?? []),
          complaintText: parsed.complaintText || null,
          additionalNotes: parsed.additionalNotes || null,
          estimatedCost: parsed.estimatedCost ?? null,
          expectedCompletionDate: parsed.expectedCompletionDate ?? null,
          previousJobId: parsed.previousJobId || null,
        },
        include: { customer: true, device: true },
      });

      await tx.serviceJobStatusHistory.create({
        data: { jobId: created.id, status: "RECEIVED", changedById: session.sub, note: "Job created." },
      });

      await tx.notification.create({
        data: {
          type: "NEW_JOB",
          title: "New service job created",
          message: `${created.jobNumber} — ${created.customer.name}'s ${created.device.brand} ${created.device.model}.`,
          jobId: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
