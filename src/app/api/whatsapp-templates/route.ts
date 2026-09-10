import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";
import { WHATSAPP_TEMPLATE_KEYS } from "@/lib/constants";

export async function GET() {
  try {
    await requireSession();
    const templates = await prisma.whatsAppTemplate.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ templates });
  } catch (err) {
    return errorResponse(err);
  }
}

const schema = z.object({
  key: z.enum(WHATSAPP_TEMPLATE_KEYS),
  body: z.string().trim().min(1, "Template body cannot be empty.").max(2000),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const { key, body, isActive } = schema.parse(await request.json());

    const template = await prisma.whatsAppTemplate.update({
      where: { key },
      data: { body, ...(isActive !== undefined && { isActive }) },
    });

    return NextResponse.json({ template });
  } catch (err) {
    return errorResponse(err);
  }
}
