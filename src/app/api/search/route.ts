import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [customers, jobs, parts, suppliers] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { mobile: { contains: q } },
          { customerCode: { contains: q } },
          { whatsapp: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.serviceJob.findMany({
      where: {
        OR: [
          { jobNumber: { contains: q } },
          { customer: { name: { contains: q } } },
          { customer: { mobile: { contains: q } } },
          { device: { brand: { contains: q } } },
          { device: { model: { contains: q } } },
          { device: { serialNumber: { contains: q } } },
        ],
      },
      include: { customer: true, device: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    prisma.part.findMany({
      where: { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }] },
      take: 5,
    }),
    prisma.supplier.findMany({
      where: { OR: [{ name: { contains: q } }, { company: { contains: q } }, { city: { contains: q } }] },
      take: 5,
    }),
  ]);

  const results = [
    ...customers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: c.name,
      subtitle: `${c.customerCode} · ${c.mobile}`,
      href: `/customers/${c.id}`,
    })),
    ...jobs.map((j) => ({
      type: "job" as const,
      id: j.id,
      title: `${j.jobNumber} — ${j.device.brand} ${j.device.model}`,
      subtitle: `${j.customer.name} · ${j.status.replaceAll("_", " ")}`,
      href: `/jobs/${j.id}`,
    })),
    ...parts.map((p) => ({
      type: "part" as const,
      id: p.id,
      title: p.name,
      subtitle: `${p.category.replaceAll("_", " ")} · Stock: ${p.quantity}`,
      href: `/inventory/${p.id}`,
    })),
    ...suppliers.map((s) => ({
      type: "supplier" as const,
      id: s.id,
      title: s.name,
      subtitle: `${s.company}${s.city ? " · " + s.city : ""}`,
      href: `/suppliers/${s.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
