"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Input, Label, Textarea, Select, FormRow } from "@/components/ui/field";
import { JOB_PRIORITIES } from "@/lib/constants";

type Technician = { id: string; name: string };

type Job = {
  id: string;
  jobNumber: string;
  priority: string;
  assignedTechnicianId: string | null;
  expectedCompletionDate: Date | string | null;
  complaintText: string | null;
  additionalNotes: string | null;
  estimatedCost: number | null;
  isArchived: boolean;
};

function toDateInputValue(value: Date | string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function JobActions({
  job,
  technicians,
  canEdit,
  canDelete,
}: {
  job: Job;
  technicians: Technician[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [form, setForm] = React.useState({
    priority: job.priority,
    assignedTechnicianId: job.assignedTechnicianId ?? "",
    expectedCompletionDate: toDateInputValue(job.expectedCompletionDate),
    complaintText: job.complaintText ?? "",
    additionalNotes: job.additionalNotes ?? "",
    estimatedCost: job.estimatedCost != null ? String(job.estimatedCost) : "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: form.priority,
          assignedTechnicianId: form.assignedTechnicianId || null,
          expectedCompletionDate: form.expectedCompletionDate || null,
          complaintText: form.complaintText,
          additionalNotes: form.additionalNotes,
          estimatedCost: form.estimatedCost === "" ? null : Number(form.estimatedCost),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update job.");
        return;
      }
      toast.success("Job updated.");
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function setArchived(value: boolean) {
    setArchiving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success(value ? "Job deleted." : "Job restored.");
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Edit Job
        </Button>
      )}
      {canDelete &&
        (job.isArchived ? (
          <Button variant="outline" onClick={() => setArchived(false)} loading={archiving}>
            <RotateCcw className="size-4" /> Restore
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
        ))}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Job"
        description={`Update details for ${job.jobNumber}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow>
              <Label htmlFor="job-priority">Priority</Label>
              <Select id="job-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {JOB_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <Label htmlFor="job-technician">Assigned Technician</Label>
              <Select
                id="job-technician"
                value={form.assignedTechnicianId}
                onChange={(e) => set("assignedTechnicianId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FormRow>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow>
              <Label htmlFor="job-expected">Expected Completion</Label>
              <Input
                id="job-expected"
                type="date"
                value={form.expectedCompletionDate}
                onChange={(e) => set("expectedCompletionDate", e.target.value)}
              />
            </FormRow>
            <FormRow>
              <Label htmlFor="job-estimated">Estimated Cost (₹)</Label>
              <Input
                id="job-estimated"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCost}
                onChange={(e) => set("estimatedCost", e.target.value)}
              />
            </FormRow>
          </div>
          <FormRow>
            <Label htmlFor="job-complaint">Complaint</Label>
            <Textarea id="job-complaint" value={form.complaintText} onChange={(e) => set("complaintText", e.target.value)} />
          </FormRow>
          <FormRow>
            <Label htmlFor="job-notes">Additional Notes</Label>
            <Textarea id="job-notes" value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} />
          </FormRow>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setArchived(true)}
        title="Delete this job?"
        description={`"${job.jobNumber}" will be removed from the active jobs list. Its payments, invoice, parts usage and status history stay on record, and an Admin can restore it any time.`}
        confirmLabel="Delete Job"
        tone="danger"
        loading={archiving}
      />
    </div>
  );
}
