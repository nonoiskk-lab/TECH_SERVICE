"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Laptop2,
  Wrench,
  Save,
  Send,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  StickyNote,
  ShieldCheck,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Input, Label, Textarea, Select, FormRow } from "@/components/ui/field";
import { Tabs, Avatar, EmptyState } from "@/components/ui/misc";
import { StatusTimeline } from "@/components/jobs/timeline";
import { formatCurrency, formatDate, formatDateTime, safeJsonParse, cn } from "@/lib/utils";
import {
  CONDITION_ITEM_LABELS,
  CONDITION_ITEMS,
  ESTIMATE_ITEM_TYPES,
  JOB_STATUS_LABELS,
  JOB_STATUS_TRANSITIONS,
  type ConditionItem,
  type ConditionValue,
  type JobStatus,
  type Role,
} from "@/lib/constants";
import type { JobDetail } from "@/lib/job-types";

type Technician = { id: string; name: string };
type PartLite = { id: string; name: string; quantity: number; sellingPrice: number; purchasePrice: number };

export function JobDetailView({
  job,
  technicians,
  parts,
  currentUser,
}: {
  job: JobDetail;
  technicians: Technician[];
  parts: PartLite[];
  currentUser: { id: string; role: Role; name: string };
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState("overview");

  const canEditTechnical = ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"].includes(currentUser.role);
  const canEditFinancial = ["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"].includes(currentUser.role);

  const condition = safeJsonParse<Record<ConditionItem, ConditionValue>>(job.conditionChecklist, {} as Record<ConditionItem, ConditionValue>);
  const accessories = safeJsonParse<string[]>(job.accessoriesReceived, []);
  const quickIssues = safeJsonParse<string[]>(job.quickIssues, []);

  const paidTotal = job.payments.reduce((s, p) => s + p.amount, 0);
  const cost = job.approvedCost ?? job.estimatedCost ?? 0;
  const pending = Math.max(0, cost - paidTotal);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
            <ArrowLeft className="size-4" /> Back to jobs
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{job.jobNumber}</h1>
            <StatusBadge status={job.status} />
            <Badge tone={job.priority === "URGENT" || job.priority === "HIGH" ? "danger" : "neutral"}>{job.priority}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {job.customer.name} · {job.device.brand} {job.device.model} · Created {formatDate(job.createdAt)}
          </p>
        </div>
        <Link href={`/status/${job.publicToken}`} target="_blank">
          <Button variant="outline">
            <ExternalLink className="size-4" /> Customer Status Page
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Customer" />
          <CardBody className="space-y-3">
            <Link href={`/customers/${job.customer.id}`} className="flex items-center gap-3">
              <Avatar name={job.customer.name} />
              <div>
                <p className="text-sm font-semibold text-ink-900 hover:underline">{job.customer.name}</p>
                <p className="text-xs text-ink-500">{job.customer.customerCode}</p>
              </div>
            </Link>
            <div className="space-y-1.5 text-sm text-ink-600">
              <p className="flex items-center gap-2">
                <Phone className="size-3.5 text-ink-400" /> {job.customer.mobile}
              </p>
              {job.customer.email && (
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5 text-ink-400" /> {job.customer.email}
                </p>
              )}
              {job.customer.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-400" /> {job.customer.address}
                </p>
              )}
            </div>
            <div className="border-t border-[var(--color-border)] pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                <Laptop2 className="size-3.5" /> Device
              </p>
              <p className="text-sm font-medium text-ink-900">
                {job.device.brand} {job.device.model}
              </p>
              <p className="text-xs text-ink-500">
                {job.device.serialNumber ? `S/N ${job.device.serialNumber}` : "No serial number"}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {[job.device.processor, job.device.ram, job.device.storage, job.device.operatingSystem].filter(Boolean).join(" · ")}
              </p>
            </div>
            {job.previousJob && (
              <Link href={`/jobs/${job.previousJob.id}`} className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline">
                <ShieldCheck className="size-3.5" /> Warranty return of {job.previousJob.jobNumber}
              </Link>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status Timeline" />
          <CardBody>
            <StatusTimeline history={job.statusHistory} currentStatus={job.status} />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Cost & Payment" />
            <CardBody className="space-y-2 text-sm">
              <Row label="Estimated Cost" value={formatCurrency(job.estimatedCost)} />
              <Row label="Approved Cost" value={formatCurrency(job.approvedCost)} />
              <Row label="Paid So Far" value={formatCurrency(paidTotal)} />
              <Row label="Pending" value={formatCurrency(pending)} strong tone={pending > 0 ? "text-danger-600" : "text-success-600"} />
              {canEditFinancial && (
                <Link href={`/payments/new?jobId=${job.id}`}>
                  <Button variant="secondary" size="sm" className="mt-2 w-full">
                    Receive Payment
                  </Button>
                </Link>
              )}
            </CardBody>
          </Card>

          <ChangeStatusCard job={job} router={router} technicians={technicians} canEdit={canEditTechnical || canEditFinancial} />
        </div>
      </div>

      <Card>
        <div className="border-b border-[var(--color-border)] px-5 pt-3">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "diagnosis", label: "Diagnosis" },
              { key: "estimate", label: "Estimate" },
              { key: "parts", label: "Parts", count: job.jobParts.length || undefined },
              { key: "payments", label: "Payments", count: job.payments.length || undefined },
              { key: "photos", label: "Photos", count: job.photos.length || undefined },
              { key: "communication", label: "Communication", count: job.whatsappMessages.length || undefined },
              { key: "history", label: "History" },
            ]}
          />
        </div>
        <CardBody>
          {tab === "overview" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-ink-900">Customer Complaint</p>
                <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
                  {job.complaintText || "No complaint description recorded."}
                </p>
                {job.additionalNotes && (
                  <>
                    <p className="mt-3 mb-2 text-sm font-semibold text-ink-900">Additional Notes</p>
                    <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-700">{job.additionalNotes}</p>
                  </>
                )}
                {quickIssues.length > 0 && (
                  <>
                    <p className="mt-3 mb-2 text-sm font-semibold text-ink-900">Quick Issues</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickIssues.map((q) => (
                        <Badge key={q} tone="warning">
                          {q}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
                {accessories.length > 0 && (
                  <>
                    <p className="mt-3 mb-2 text-sm font-semibold text-ink-900">Accessories Received</p>
                    <div className="flex flex-wrap gap-1.5">
                      {accessories.map((a) => (
                        <Badge key={a} tone="neutral">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-ink-900">Device Condition at Intake</p>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITION_ITEMS.map((item) => {
                    const value = condition[item] ?? "NOT_CHECKED";
                    return (
                      <div key={item} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm">
                        <span className="text-ink-600">{CONDITION_ITEM_LABELS[item]}</span>
                        <Badge tone={value === "GOOD" ? "success" : value === "FAIR" ? "warning" : value === "DAMAGED" ? "danger" : "neutral"}>
                          {value.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "diagnosis" && <DiagnosisTab job={job} router={router} canEdit={canEditTechnical} />}
          {tab === "estimate" && <EstimateTab job={job} router={router} parts={parts} canEdit={canEditTechnical} canRespond={canEditFinancial} />}
          {tab === "parts" && <PartsTab job={job} router={router} parts={parts} canEdit={canEditTechnical} />}
          {tab === "payments" && <PaymentsTab job={job} canEdit={canEditFinancial} />}
          {tab === "photos" && <PhotosTab job={job} />}
          {tab === "communication" && <CommunicationTab job={job} router={router} />}
          {tab === "history" && <HistoryTab job={job} router={router} canEdit={canEditTechnical} />}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className={cn(strong ? "text-base font-bold" : "font-medium text-ink-900", tone)}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change status
// ---------------------------------------------------------------------------

function ChangeStatusCard({
  job,
  router,
  technicians,
  canEdit,
}: {
  job: JobDetail;
  router: ReturnType<typeof useRouter>;
  technicians: Technician[];
  canEdit: boolean;
}) {
  const allowed = JOB_STATUS_TRANSITIONS[job.status as JobStatus] ?? [];
  const [nextStatus, setNextStatus] = React.useState<string>(allowed[0] ?? "");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [technicianId, setTechnicianId] = React.useState(job.assignedTechnicianId ?? "");
  const [savingTech, setSavingTech] = React.useState(false);

  React.useEffect(() => {
    setNextStatus(allowed[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.status]);

  async function submitStatus() {
    if (!nextStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update status.");
        return;
      }
      toast.success(`Status updated to ${JOB_STATUS_LABELS[nextStatus as JobStatus]}.`);
      setNote("");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTechnician() {
    setSavingTech(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTechnicianId: technicianId || null }),
      });
      if (!res.ok) {
        toast.error("Could not update technician.");
        return;
      }
      toast.success("Technician updated.");
      router.refresh();
    } finally {
      setSavingTech(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Update Status" />
      <CardBody className="space-y-3">
        {canEdit && allowed.length > 0 ? (
          <>
            <FormRow>
              <Label>Move to</Label>
              <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                {allowed.map((s) => (
                  <option key={s} value={s}>
                    {JOB_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </FormRow>
            <Button className="w-full" onClick={submitStatus} loading={saving} disabled={!nextStatus}>
              <Clock className="size-4" /> Update Status
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink-500">This job has reached a final status.</p>
        )}

        <div className="border-t border-[var(--color-border)] pt-3">
          <FormRow>
            <Label>Assigned Technician</Label>
            <div className="flex gap-2">
              <Select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} disabled={!canEdit}>
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={saveTechnician} loading={savingTech}>
                  Save
                </Button>
              )}
            </div>
          </FormRow>
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Diagnosis tab
// ---------------------------------------------------------------------------

function DiagnosisTab({ job, router, canEdit }: { job: JobDetail; router: ReturnType<typeof useRouter>; canEdit: boolean }) {
  const d = job.diagnosis;
  const [form, setForm] = React.useState({
    diagnosisText: d?.diagnosisText ?? "",
    rootCause: d?.rootCause ?? "",
    recommendedRepair: d?.recommendedRepair ?? "",
    partsRequired: safeJsonParse<string[]>(d?.partsRequired, []).join(", "),
    labourRequired: d?.labourRequired ?? "",
    estimatedTimeHours: d?.estimatedTimeHours?.toString() ?? "",
    estimatedCost: d?.estimatedCost?.toString() ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/diagnosis`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partsRequired: form.partsRequired
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          estimatedTimeHours: form.estimatedTimeHours ? Number(form.estimatedTimeHours) : null,
          estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not save diagnosis.");
        return;
      }
      toast.success("Diagnosis saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit && !d) {
    return <EmptyState icon={Wrench} title="No diagnosis yet" description="A technician hasn't recorded a diagnosis for this job yet." />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <FormRow>
        <Label>Diagnosis</Label>
        <Textarea disabled={!canEdit} value={form.diagnosisText} onChange={(e) => setForm((f) => ({ ...f, diagnosisText: e.target.value }))} placeholder='e.g. "Cooling fan blocked and thermal paste degraded."' />
      </FormRow>
      <FormRow>
        <Label>Root Cause</Label>
        <Textarea disabled={!canEdit} value={form.rootCause} onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))} />
      </FormRow>
      <FormRow>
        <Label>Recommended Repair</Label>
        <Textarea disabled={!canEdit} value={form.recommendedRepair} onChange={(e) => setForm((f) => ({ ...f, recommendedRepair: e.target.value }))} />
      </FormRow>
      <FormRow>
        <Label>Parts Required (comma separated)</Label>
        <Input disabled={!canEdit} value={form.partsRequired} onChange={(e) => setForm((f) => ({ ...f, partsRequired: e.target.value }))} />
      </FormRow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormRow>
          <Label>Labour Required</Label>
          <Input disabled={!canEdit} value={form.labourRequired} onChange={(e) => setForm((f) => ({ ...f, labourRequired: e.target.value }))} />
        </FormRow>
        <FormRow>
          <Label>Estimated Time (hours)</Label>
          <Input disabled={!canEdit} type="number" min={0} value={form.estimatedTimeHours} onChange={(e) => setForm((f) => ({ ...f, estimatedTimeHours: e.target.value }))} />
        </FormRow>
        <FormRow>
          <Label>Estimated Cost</Label>
          <Input disabled={!canEdit} type="number" min={0} value={form.estimatedCost} onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))} />
        </FormRow>
      </div>
      {d?.diagnosedBy && <p className="text-xs text-ink-400">Last updated by {d.diagnosedBy.name}</p>}
      {canEdit && (
        <Button onClick={save} loading={saving}>
          <Save className="size-4" /> Save Diagnosis
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estimate tab
// ---------------------------------------------------------------------------

type EstimateLine = { type: string; description: string; quantity: string; unitPrice: string; partId?: string | null };

function EstimateTab({
  job,
  router,
  parts,
  canEdit,
  canRespond,
}: {
  job: JobDetail;
  router: ReturnType<typeof useRouter>;
  parts: PartLite[];
  canEdit: boolean;
  canRespond: boolean;
}) {
  const est = job.estimate;
  const [lines, setLines] = React.useState<EstimateLine[]>(
    est && est.items.length > 0
      ? est.items.map((i) => ({ type: i.type, description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice), partId: i.partId }))
      : [{ type: "LABOUR", description: "", quantity: "1", unitPrice: "0", partId: null }]
  );
  const [discount, setDiscount] = React.useState(est?.discount?.toString() ?? "0");
  const [taxPercent, setTaxPercent] = React.useState(est?.taxPercent?.toString() ?? "0");
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [responding, setResponding] = React.useState(false);

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const discountNum = Math.min(Number(discount) || 0, subtotal);
  const taxAmount = ((subtotal - discountNum) * (Number(taxPercent) || 0)) / 100;
  const total = subtotal - discountNum + taxAmount;

  function updateLine(i: number, patch: Partial<EstimateLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { type: "PART", description: "", quantity: "1", unitPrice: "0", partId: null }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/estimate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.filter((l) => l.description.trim()).map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
          discount: discountNum,
          taxPercent: Number(taxPercent) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save estimate.");
        return;
      }
      toast.success("Estimate saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function sendEstimate() {
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/estimate/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send estimate.");
        return;
      }
      toast.success("Estimate marked as sent.");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function respond(status: "APPROVED" | "REJECTED" | "NEED_MORE_TIME") {
    setResponding(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/estimate/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not record response.");
        return;
      }
      toast.success(`Estimate marked as ${status.replaceAll("_", " ").toLowerCase()}.`);
      router.refresh();
    } finally {
      setResponding(false);
    }
  }

  return (
    <div className="space-y-4">
      {est && (
        <div className="flex items-center gap-2">
          <Badge tone={est.status === "APPROVED" ? "success" : est.status === "REJECTED" ? "danger" : est.status === "SENT" ? "info" : "neutral"}>
            {est.status.replaceAll("_", " ")}
          </Badge>
          {est.sentAt && <span className="text-xs text-ink-500">Sent {formatDateTime(est.sentAt)}</span>}
          {est.respondedAt && <span className="text-xs text-ink-500">Responded {formatDateTime(est.respondedAt)}</span>}
        </div>
      )}

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              <th className="py-2 pr-2">Type</th>
              <th className="py-2 pr-2">Description</th>
              <th className="w-20 py-2 pr-2">Qty</th>
              <th className="w-28 py-2 pr-2">Unit Price</th>
              <th className="w-28 py-2 pr-2">Total</th>
              {canEdit && <th className="w-10 py-2" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-[var(--color-border)]">
                <td className="py-1.5 pr-2">
                  <Select disabled={!canEdit} value={l.type} onChange={(e) => updateLine(i, { type: e.target.value })}>
                    {ESTIMATE_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-1.5 pr-2">
                  {l.type === "PART" ? (
                    <Select
                      disabled={!canEdit}
                      value={l.partId ?? ""}
                      onChange={(e) => {
                        const part = parts.find((p) => p.id === e.target.value);
                        updateLine(i, { partId: e.target.value || null, description: part?.name ?? l.description, unitPrice: part ? String(part.sellingPrice) : l.unitPrice });
                      }}
                    >
                      <option value="">Select a part…</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (stock {p.quantity})
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input disabled={!canEdit} value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  <Input disabled={!canEdit} type="number" min={0} value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2">
                  <Input disabled={!canEdit} type="number" min={0} value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2 font-medium text-ink-900">
                  {formatCurrency((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                </td>
                {canEdit && (
                  <td className="py-1.5">
                    <button onClick={() => removeLine(i)} className="text-ink-400 hover:text-danger-600">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="size-4" /> Add Line
        </Button>
      )}

      <div className="flex flex-col items-end gap-1 border-t border-[var(--color-border)] pt-3 text-sm">
        <div className="flex w-full max-w-xs items-center justify-between">
          <span className="text-ink-500">Subtotal</span>
          <span className="font-medium text-ink-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex w-full max-w-xs items-center justify-between gap-2">
          <span className="text-ink-500">Discount</span>
          <Input disabled={!canEdit} type="number" min={0} className="h-8 w-28 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="flex w-full max-w-xs items-center justify-between gap-2">
          <span className="text-ink-500">Tax %</span>
          <Input disabled={!canEdit} type="number" min={0} className="h-8 w-28 text-right" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
        </div>
        <div className="flex w-full max-w-xs items-center justify-between border-t border-[var(--color-border)] pt-1.5">
          <span className="font-semibold text-ink-900">Total</span>
          <span className="text-base font-bold text-ink-900">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Button variant="outline" onClick={saveDraft} loading={saving}>
            <Save className="size-4" /> Save Draft
          </Button>
        )}
        {canEdit && est && est.status === "DRAFT" && (
          <Button onClick={sendEstimate} loading={sending}>
            <Send className="size-4" /> Send to Customer
          </Button>
        )}
        {canRespond && est && (est.status === "SENT" || est.status === "NEED_MORE_TIME") && (
          <>
            <Button variant="success" onClick={() => respond("APPROVED")} loading={responding}>
              <ThumbsUp className="size-4" /> Customer Approved
            </Button>
            <Button variant="danger" onClick={() => respond("REJECTED")} loading={responding}>
              <ThumbsDown className="size-4" /> Customer Rejected
            </Button>
            <Button variant="outline" onClick={() => respond("NEED_MORE_TIME")} loading={responding}>
              Need More Time
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parts tab (basic — full consumption flow lives in Phase 4 inventory work)
// ---------------------------------------------------------------------------

function PartsTab({
  job,
  router,
  parts,
  canEdit,
}: {
  job: JobDetail;
  router: ReturnType<typeof useRouter>;
  parts: PartLite[];
  canEdit: boolean;
}) {
  const [partId, setPartId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [saving, setSaving] = React.useState(false);
  const selectedPart = parts.find((p) => p.id === partId);

  async function addPart() {
    if (!partId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId, quantity: Number(quantity) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add part.");
        return;
      }
      toast.success("Part added and stock updated.");
      setPartId("");
      setQuantity("1");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const totalPartsCost = job.jobParts.reduce((s, jp) => s + jp.quantity * jp.unitPrice, 0);

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
          <FormRow className="min-w-[220px] flex-1">
            <Label>Part</Label>
            <Select value={partId} onChange={(e) => setPartId(e.target.value)}>
              <option value="">Select a part…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                  {p.name} ({p.quantity} in stock){p.quantity <= 0 ? " — out of stock" : ""}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow className="w-24">
            <Label>Qty</Label>
            <Input type="number" min={1} max={selectedPart?.quantity ?? 999} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </FormRow>
          <Button onClick={addPart} loading={saving} disabled={!partId}>
            <Plus className="size-4" /> Add Part
          </Button>
        </div>
      )}

      {job.jobParts.length === 0 ? (
        <EmptyState icon={Wrench} title="No parts used yet" description="Parts added here automatically reduce inventory stock." />
      ) : (
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                <th className="py-2">Part</th>
                <th className="py-2">Technician</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {job.jobParts.map((jp) => (
                <tr key={jp.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 font-medium text-ink-900">{jp.part.name}</td>
                  <td className="py-2 text-ink-600">{jp.technician.name}</td>
                  <td className="py-2 text-ink-600">{jp.quantity}</td>
                  <td className="py-2 text-ink-600">{formatCurrency(jp.unitPrice)}</td>
                  <td className="py-2 font-medium text-ink-900">{formatCurrency(jp.quantity * jp.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--color-border)] font-semibold text-ink-900">
                <td className="py-2" colSpan={4}>
                  Total Parts Cost
                </td>
                <td className="py-2">{formatCurrency(totalPartsCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payments tab (recording lives in Phase 5; this view is read-only + link)
// ---------------------------------------------------------------------------

function PaymentsTab({ job, canEdit }: { job: JobDetail; canEdit: boolean }) {
  const paidTotal = job.payments.reduce((s, p) => s + p.amount, 0);
  const revenue = job.approvedCost ?? job.estimatedCost ?? 0;
  const partsCost = job.jobParts.reduce((s, jp) => s + jp.quantity * jp.unitCost, 0);
  const profit = revenue - partsCost;

  return (
    <div className="space-y-4">
      {canEdit && (
        <Link href={`/payments/new?jobId=${job.id}`}>
          <Button size="sm">
            <Plus className="size-4" /> Record Payment
          </Button>
        </Link>
      )}

      {canEdit && revenue > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-ink-50 p-3 text-sm">
          <div>
            <p className="text-xs text-ink-500">Revenue</p>
            <p className="font-semibold text-ink-900">{formatCurrency(revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Parts Cost</p>
            <p className="font-semibold text-ink-900">{formatCurrency(partsCost)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Estimated Profit</p>
            <p className={`font-semibold ${profit >= 0 ? "text-success-600" : "text-danger-600"}`}>{formatCurrency(profit)}</p>
          </div>
        </div>
      )}

      {job.warranty && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Warranty</p>
            <p className="text-xs text-ink-500">
              {formatDate(job.warranty.startDate)} – {formatDate(job.warranty.endDate)} ({job.warranty.periodDays} days)
            </p>
            {job.warranty.terms && <p className="mt-1 text-xs text-ink-500">{job.warranty.terms}</p>}
          </div>
          <Badge tone={new Date(job.warranty.endDate) > new Date() ? "success" : "danger"}>
            {new Date(job.warranty.endDate) > new Date() ? "Warranty Active" : "Warranty Expired"}
          </Badge>
        </div>
      )}
      {job.payments.length === 0 ? (
        <EmptyState title="No payments recorded" description="Advance and final payments for this job will show here." />
      ) : (
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                <th className="py-2">Date</th>
                <th className="py-2">Type</th>
                <th className="py-2">Method</th>
                <th className="py-2">Received By</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {job.payments.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 text-ink-600">{formatDateTime(p.createdAt)}</td>
                  <td className="py-2">
                    <Badge tone="neutral">{p.type}</Badge>
                  </td>
                  <td className="py-2 text-ink-600">{p.method.replaceAll("_", " ")}</td>
                  <td className="py-2 text-ink-600">{p.receivedBy.name}</td>
                  <td className="py-2 font-medium text-ink-900">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--color-border)] font-semibold text-ink-900">
                <td className="py-2" colSpan={4}>
                  Total Paid
                </td>
                <td className="py-2">{formatCurrency(paidTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {job.invoice && (
        <Link href={`/jobs/${job.id}/invoice`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline">
          View Invoice {job.invoice.invoiceNumber} <ExternalLink className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photos tab
// ---------------------------------------------------------------------------

function PhotosTab({ job }: { job: JobDetail }) {
  if (job.photos.length === 0) {
    return <EmptyState title="No photos yet" description="Device intake photos help protect against disputes over pre-existing damage." />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {job.photos.map((photo) => (
        <div key={photo.id} className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.filePath} alt={photo.angle} className="aspect-square w-full object-cover" />
          <div className="p-2">
            <Badge tone="neutral">{photo.angle}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Communication tab (WhatsApp log; sending is wired up in the WhatsApp phase)
// ---------------------------------------------------------------------------

const TEMPLATE_OPTIONS: { key: string; label: string }[] = [
  { key: "JOB_RECEIVED", label: "Job Received" },
  { key: "DIAGNOSIS_COMPLETE", label: "Diagnosis Complete" },
  { key: "ESTIMATE_SENT", label: "Estimate Sent" },
  { key: "REPAIR_STARTED", label: "Repair Started" },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "PAYMENT_REMINDER", label: "Payment Reminder" },
  { key: "STATUS_LINK", label: "Send Status Check Link" },
  { key: "CUSTOM", label: "Custom Message" },
];

function CommunicationTab({ job, router }: { job: JobDetail; router: ReturnType<typeof useRouter> }) {
  const [templateKey, setTemplateKey] = React.useState("STATUS_LINK");
  const [customMessage, setCustomMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, customMessage: templateKey === "CUSTOM" ? customMessage : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send WhatsApp message.");
        return;
      }
      if (data.waLink) {
        window.open(data.waLink, "_blank", "noopener,noreferrer");
        toast.success("Opening WhatsApp with the message ready to send.");
      } else {
        toast.success("WhatsApp message sent.");
      }
      setCustomMessage("");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3">
        <p className="mb-2 text-sm font-semibold text-ink-900">Send WhatsApp Update</p>
        <div className="flex flex-wrap items-end gap-2">
          <FormRow className="min-w-[220px] flex-1">
            <Label>Message Template</Label>
            <Select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
              {TEMPLATE_OPTIONS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormRow>
          <Button onClick={send} loading={sending}>
            Send
          </Button>
        </div>
        {templateKey === "CUSTOM" && (
          <Textarea
            className="mt-2"
            placeholder="Write a custom message…"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        )}
        <p className="mt-2 text-xs text-ink-400">
          Sends via your configured WhatsApp API if set up in Settings, otherwise opens wa.me with the message ready for you to send from your own WhatsApp.
        </p>
      </div>

      {job.whatsappMessages.length === 0 ? (
        <EmptyState title="No messages sent yet" description="WhatsApp updates sent to this customer will be logged here." />
      ) : (
        <div className="space-y-3">
          {job.whatsappMessages.map((m) => (
            <div key={m.id} className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="mb-1 flex items-center justify-between">
                <Badge tone={m.status === "SENT" || m.status === "LINK_OPENED" ? "success" : m.status === "FAILED" ? "danger" : "neutral"}>
                  {m.status.replaceAll("_", " ")}
                </Badge>
                <span className="text-xs text-ink-400">{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-line text-sm text-ink-700">{m.messageText}</p>
              <p className="mt-1 text-xs text-ink-400">via {m.method} · sent by {m.sentBy.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History tab — status changes + repair notes
// ---------------------------------------------------------------------------

function HistoryTab({ job, router, canEdit }: { job: JobDetail; router: ReturnType<typeof useRouter>; canEdit: boolean }) {
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add note.");
        return;
      }
      setNote("");
      toast.success("Note added.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-3 text-sm font-semibold text-ink-900">Status Changes</p>
        <div className="space-y-3">
          {[...job.statusHistory].reverse().map((h) => (
            <div key={h.id} className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={h.status} />
                <span className="text-xs text-ink-400">{formatDateTime(h.createdAt)}</span>
              </div>
              {h.note && <p className="mt-1.5 text-sm text-ink-600">{h.note}</p>}
              <p className="mt-1 text-xs text-ink-400">by {h.changedBy.name}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <StickyNote className="size-4" /> Repair Notes
        </p>
        {canEdit && (
          <div className="mb-3 flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a repair note…" />
            <Button onClick={addNote} loading={saving} disabled={!note.trim()}>
              Add
            </Button>
          </div>
        )}
        <div className="space-y-3">
          {job.repairNotes.length === 0 && <p className="text-sm text-ink-500">No repair notes yet.</p>}
          {job.repairNotes.map((n) => (
            <div key={n.id} className="rounded-xl bg-ink-50 p-3">
              <p className="text-sm text-ink-700">{n.note}</p>
              <p className="mt-1 text-xs text-ink-400">
                {n.technician.name} · {formatDateTime(n.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
