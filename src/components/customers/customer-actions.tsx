"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Input, Label, Textarea, Select, FormRow } from "@/components/ui/field";

type Customer = {
  id: string;
  name: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  customerType: string;
  notes: string | null;
  isArchived: boolean;
};

export function CustomerActions({ customer, canEdit, canDelete }: { customer: Customer; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: customer.name,
    mobile: customer.mobile,
    whatsapp: customer.whatsapp ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    customerType: customer.customerType,
    notes: customer.notes ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update customer.");
        return;
      }
      toast.success("Customer updated.");
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function setArchived(value: boolean) {
    setArchiving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success(value ? "Customer deleted." : "Customer restored.");
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Edit
        </Button>
      )}
      {canDelete &&
        (customer.isArchived ? (
          <Button variant="outline" size="sm" onClick={() => setArchived(false)} loading={archiving}>
            <RotateCcw className="size-4" /> Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
        ))}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Customer"
        description="Update this customer's details."
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
              <Label htmlFor="edit-name" required>
                Full Name
              </Label>
              <Input id="edit-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </FormRow>
            <FormRow>
              <Label htmlFor="edit-mobile" required>
                Mobile
              </Label>
              <Input id="edit-mobile" required inputMode="numeric" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </FormRow>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow>
              <Label htmlFor="edit-whatsapp">WhatsApp Number</Label>
              <Input id="edit-whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </FormRow>
            <FormRow>
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </FormRow>
          </div>
          <FormRow>
            <Label htmlFor="edit-customerType">Customer Type</Label>
            <Select id="edit-customerType" value={form.customerType} onChange={(e) => set("customerType", e.target.value)}>
              <option value="INDIVIDUAL">Individual</option>
              <option value="BUSINESS">Business</option>
            </Select>
          </FormRow>
          <FormRow>
            <Label htmlFor="edit-address">Address</Label>
            <Textarea id="edit-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </FormRow>
          <FormRow>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </FormRow>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setArchived(true)}
        title="Delete this customer?"
        description={`"${customer.name}" will be removed from the active customer list. Their past jobs, payments and devices stay on record, and an Admin can restore them any time.`}
        confirmLabel="Delete Customer"
        tone="danger"
        loading={archiving}
      />
    </div>
  );
}
