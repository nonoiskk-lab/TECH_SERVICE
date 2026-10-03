import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { JobDetailView } from "@/components/jobs/job-detail-view";
import { jobDetailInclude } from "@/lib/job-types";
import type { Role } from "@/lib/constants";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const [job, technicians, parts] = await Promise.all([
    prisma.serviceJob.findUnique({
      where: { id },
      include: jobDetailInclude,
    }),
    prisma.user.findMany({ where: { role: "TECHNICIAN", isActive: true }, select: { id: true, name: true } }),
    prisma.part.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, quantity: true, sellingPrice: true, purchasePrice: true } }),
  ]);

  if (!job) notFound();

  return (
    <JobDetailView
      job={job}
      technicians={technicians}
      parts={parts}
      currentUser={{ id: session?.sub ?? "", role: (session?.role ?? "FRONT_DESK") as Role, name: session?.name ?? "" }}
    />
  );
}
