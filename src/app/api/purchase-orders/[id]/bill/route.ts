import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { MAX_BILL_FILE_BYTES, ALLOWED_BILL_FILE_TYPES } from "@/lib/constants";
import type { Role } from "@/lib/constants";

// Admin + Service Manager are the "approved purchase user" roles already
// trusted to create/update a purchase order (see the PATCH handler on
// /api/purchase-orders/[id]) — bill upload follows the same permission.
const ALLOWED_ROLES: Role[] = ["ADMIN", "SERVICE_MANAGER"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(ALLOWED_ROLES);
    const { id } = await params;

    const existing = await prisma.purchaseOrder.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new ApiError(404, "Purchase order not found.");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file was uploaded.");

    if (!ALLOWED_BILL_FILE_TYPES.includes(file.type as (typeof ALLOWED_BILL_FILE_TYPES)[number])) {
      throw new ApiError(400, "Unsupported file type. Upload a JPG, PNG, WebP or PDF.");
    }
    if (file.size > MAX_BILL_FILE_BYTES) {
      throw new ApiError(400, `File is too large. Maximum size is ${Math.floor(MAX_BILL_FILE_BYTES / (1024 * 1024))}MB.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        billFileUrl: dataUrl,
        billFileName: file.name || "bill",
        billUploadedById: session.sub,
        billUploadedAt: new Date(),
      },
      select: { id: true, billFileUrl: true, billFileName: true, billUploadedAt: true, billUploadedBy: { select: { name: true } } },
    });

    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    return errorResponse(err);
  }
}
