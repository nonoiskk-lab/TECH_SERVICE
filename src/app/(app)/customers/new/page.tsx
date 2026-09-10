"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea, Select, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    mobile: "",
    whatsapp: "",
    email: "",
    address: "",
    customerType: "INDIVIDUAL",
    notes: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create customer.");
        return;
      }
      if (data.existed) {
        toast.info("A customer with this mobile number already exists — opening their profile.");
      } else {
        toast.success("Customer created.");
      }
      router.push(`/customers/${data.customer.id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <Card>
        <CardHeader title="New Customer" description="Register a new customer before creating a service job." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label htmlFor="name" required>
                  Full Name
                </Label>
                <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label htmlFor="mobile" required>
                  Mobile
                </Label>
                <Input
                  id="mobile"
                  required
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value)}
                />
              </FormRow>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  placeholder="Same as mobile if blank"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </FormRow>
            </div>
            <FormRow>
              <Label htmlFor="customerType">Customer Type</Label>
              <Select id="customerType" value={form.customerType} onChange={(e) => set("customerType", e.target.value)}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
              </Select>
            </FormRow>
            <FormRow>
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </FormRow>
            <FormRow>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </FormRow>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/customers">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={loading}>
                Save Customer
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
