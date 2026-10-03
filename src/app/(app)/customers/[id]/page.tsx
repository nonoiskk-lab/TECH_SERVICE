import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, MessageCircle, Plus, Laptop2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canDeleteRecords } from "@/lib/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobsTable } from "@/components/jobs/jobs-table";
import { Avatar } from "@/components/ui/misc";
import { formatCurrency, formatDate, toWhatsAppNumber } from "@/lib/utils";
import { SendStatusLinkButton } from "@/components/jobs/send-status-link-button";
import { CustomerActions } from "@/components/customers/customer-actions";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      devices: { orderBy: { createdAt: "desc" } },
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { device: true, assignedTechnician: true, payments: true },
      },
    },
  });

  if (!customer) notFound();

  const session = await getSession();
  const role = session?.role ?? "FRONT_DESK";
  const canEdit = role === "ADMIN" || role === "SERVICE_MANAGER" || role === "FRONT_DESK";
  const canDelete = canDeleteRecords(role);

  const totalSpending = customer.jobs.reduce((s, j) => s + j.payments.reduce((s2, p) => s2 + p.amount, 0), 0);
  const lastService = customer.jobs[0]?.createdAt;
  const waLink = customer.whatsapp
    ? `https://wa.me/${toWhatsAppNumber(customer.whatsapp)}?text=${encodeURIComponent(`Hi ${customer.name}, `)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="size-4" /> Back to customers
        </Link>
        {(canEdit || canDelete) && (
          <CustomerActions
            customer={{
              id: customer.id,
              name: customer.name,
              mobile: customer.mobile,
              whatsapp: customer.whatsapp,
              email: customer.email,
              address: customer.address,
              customerType: customer.customerType,
              notes: customer.notes,
              isArchived: customer.isArchived,
            }}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <Card className="lg:w-80 lg:shrink-0">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={customer.name} className="size-12 text-base" />
              <div>
                <p className="text-lg font-bold text-ink-900">{customer.name}</p>
                <p className="text-xs text-ink-500">{customer.customerCode}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={customer.customerType === "BUSINESS" ? "info" : "neutral"}>{customer.customerType}</Badge>
              {customer.isArchived && <Badge tone="danger">Deleted</Badge>}
            </div>
            <div className="space-y-2 text-sm text-ink-700">
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-ink-400" /> {customer.mobile}
              </p>
              {customer.email && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-ink-400" /> {customer.email}
                </p>
              )}
              {customer.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" /> {customer.address}
                </p>
              )}
            </div>
            {customer.notes && (
              <div className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">{customer.notes}</div>
            )}
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4">
              <div>
                <p className="text-xs text-ink-500">Total Services</p>
                <p className="text-lg font-bold text-ink-900">{customer.jobs.length}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Total Spending</p>
                <p className="text-lg font-bold text-ink-900">{formatCurrency(totalSpending)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-ink-500">Last Service</p>
                <p className="text-sm font-medium text-ink-900">{lastService ? formatDate(lastService) : "—"}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link href={`/jobs/new?customerId=${customer.id}`}>
                <Button className="w-full">
                  <Plus className="size-4" /> New Service Job
                </Button>
              </Link>
              {customer.jobs[0] && <SendStatusLinkButton jobId={customer.jobs[0].id} label="Send Status Link on WhatsApp" />}
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="size-4" /> Message on WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="flex-1 space-y-5">
          <Card>
            <CardHeader title="Devices" description="Every device this customer has registered" />
            <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customer.devices.length === 0 && <p className="text-sm text-ink-500">No devices registered yet.</p>}
              {customer.devices.map((d) => (
                <div key={d.id} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Laptop2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {d.brand} {d.model}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {d.serialNumber ? `S/N ${d.serialNumber}` : "No serial number"}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {[d.processor, d.ram, d.storage].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Service History" description="Every job for this customer, most recent first" />
            <div className="mt-4">
              <JobsTable
                jobs={customer.jobs.map((j) => ({ ...j, customer: { name: customer.name, mobile: customer.mobile } }))}
                emptyMessage="No service jobs yet for this customer."
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
