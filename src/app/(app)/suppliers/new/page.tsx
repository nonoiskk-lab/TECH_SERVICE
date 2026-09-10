"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    company: "",
    contactPerson: "",
    mobile: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    gst: "",
    paymentTerms: "",
    notes: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create supplier.");
        return;
      }
      toast.success("Supplier added.");
      router.push(`/suppliers/${data.supplier.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/suppliers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to suppliers
      </Link>
      <Card>
        <CardHeader title="New Supplier" description="Add a company or location you purchase parts from." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label required>Supplier Name</Label>
                <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label required>Company</Label>
                <Input required value={form.company} onChange={(e) => set("company", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>GST Number</Label>
                <Input value={form.gst} onChange={(e) => set("gst", e.target.value)} />
              </FormRow>
              <FormRow className="sm:col-span-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Payment Terms</Label>
                <Input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="Net 15, Advance…" />
              </FormRow>
            </div>
            <FormRow>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </FormRow>
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/suppliers">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={loading}>
                Save Supplier
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
