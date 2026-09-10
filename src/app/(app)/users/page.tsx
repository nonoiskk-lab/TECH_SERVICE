"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { SectionHeading } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select, FormRow } from "@/components/ui/field";
import { Avatar } from "@/components/ui/misc";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";

type StaffUser = { id: string; name: string; email: string; role: Role; phone: string | null; isActive: boolean };

export default function UsersPage() {
  const [users, setUsers] = React.useState<StaffUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "FRONT_DESK" as Role, phone: "" });
  const [saving, setSaving] = React.useState(false);

  function load() {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }

  React.useEffect(load, []);

  async function createUser() {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create user.");
        return;
      }
      toast.success("Team member added.");
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", role: "FRONT_DESK", phone: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: StaffUser) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Could not update user.");
      return;
    }
    toast.success(user.isActive ? "User deactivated." : "User reactivated.");
    load();
  }

  return (
    <div>
      <SectionHeading
        title="Team & Roles"
        description="Manage staff accounts and their access level."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="size-4" /> New Team Member
          </Button>
        }
      />

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-ink-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} />
                        <div>
                          <p className="font-medium text-ink-900">{u.name}</p>
                          <p className="text-xs text-ink-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="info">{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Team Member"
        description="Create a staff login with a specific role."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createUser} loading={saving}>
              Create Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormRow>
            <Label required>Full Name</Label>
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormRow>
          <FormRow>
            <Label required>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </FormRow>
          <FormRow>
            <Label required>Temporary Password</Label>
            <Input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </FormRow>
          <FormRow>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </FormRow>
        </div>
      </Modal>
    </div>
  );
}
