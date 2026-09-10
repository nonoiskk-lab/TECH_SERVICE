import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";
import { deviceInputSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const devices = await prisma.device.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ devices });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = deviceInputSchema.parse(body);

    const device = await prisma.device.create({
      data: {
        customerId: id,
        deviceType: parsed.deviceType,
        brand: parsed.brand,
        model: parsed.model,
        serialNumber: parsed.serialNumber || null,
        serviceTag: parsed.serviceTag || null,
        operatingSystem: parsed.operatingSystem || null,
        processor: parsed.processor || null,
        ram: parsed.ram || null,
        storage: parsed.storage || null,
        color: parsed.color || null,
        deviceAgeYears: parsed.deviceAgeYears ?? null,
      },
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
