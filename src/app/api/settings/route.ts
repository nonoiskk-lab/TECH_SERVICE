import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    await requireSession();
    const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    const { twilioAuthToken, ...safe } = settings;
    return NextResponse.json({
      settings: { ...safe, twilioAuthTokenSet: !!twilioAuthToken },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

const schema = z.object({
  companyName: z.string().trim().min(1).max(150).optional(),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  gstNumber: z.string().trim().max(30).optional().or(z.literal("")),
  invoicePrefix: z.string().trim().min(1).max(10).optional(),
  jobPrefix: z.string().trim().min(1).max(10).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  defaultTaxPercent: z.coerce.number().min(0).max(100).optional(),
  defaultWarrantyDays: z.coerce.number().int().min(0).optional(),
  autoSendWhatsAppOnStatus: z.boolean().optional(),
  twilioAccountSid: z.string().trim().max(100).optional().or(z.literal("")),
  twilioAuthToken: z.string().trim().max(100).optional().or(z.literal("")),
  twilioWhatsAppFrom: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function PATCH(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = schema.parse(await request.json());

    const data: Record<string, unknown> = { ...parsed };
    // Empty-string optionals mean "clear the field" for nullable columns.
    for (const key of ["address", "phone", "whatsappNumber", "email", "gstNumber", "twilioAccountSid", "twilioAuthToken", "twilioWhatsAppFrom"]) {
      if (data[key] === "") data[key] = null;
    }
    // Never overwrite a saved token with nothing if the field was left untouched.
    if (data.twilioAuthToken === undefined) delete data.twilioAuthToken;

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    const { twilioAuthToken, ...safe } = settings;
    return NextResponse.json({ settings: { ...safe, twilioAuthTokenSet: !!twilioAuthToken } });
  } catch (err) {
    return errorResponse(err);
  }
}
