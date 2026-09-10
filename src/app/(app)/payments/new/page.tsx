"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/lib/constants";

type JobLite = {
  id: string;
  jobNumber: string;
  status: string;
  approvedCost: number | null;
  estimatedCost: number | null;
  customer: { name: string; mobile: string };
  device: { brand: string; model: string };
  payments?: { amount: number }[];
};

export default function NewPaymentPage() {
  return (
    <React.Suspense fallback={null}>
      <NewPaymentForm />
    </React.Suspense>
  );
}

function NewPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [job, setJob] = React.useState<JobLite | null>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<JobLite[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<string>("CASH");
  const [type, setType] = React.useState<string>("ADVANCE");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!preselectedJobId) return;
    fetch(`/api/jobs/${preselectedJobId}`)
      .then((r) => r.json())
      .then((d) => d.job && setJob(d.job));
  }, [preselectedJobId]);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}&pageSize=8`);
        const data = await res.json();
        setResults(data.jobs ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const paid = job?.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const total = job?.approvedCost ?? job?.estimatedCost ?? 0;
  const pending = Math.max(0, total - paid);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) {
      toast.error("Select a service job first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, amount: Number(amount), method, type, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not record payment.");
        return;
      }
      toast.success("Payment recorded.");
      router.push(`/jobs/${job.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/payments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to payments
      </Link>
      <Card>
        <CardHeader title="Receive Payment" description="Record an advance, partial or final payment for a service job." />
        <CardBody className="space-y-4">
          {!job ? (
            <div>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by job ID, customer or mobile…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {searching && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-ink-400" />}
              </div>
              <div className="mt-3 space-y-1.5">
                {results.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setJob(j)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left hover:border-primary-300 hover:bg-primary-50/40"
                  >
                    <Avatar name={j.customer.name} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{j.jobNumber} — {j.customer.name}</p>
                      <p className="text-xs text-ink-500">
                        {j.device.brand} {j.device.model} · {j.customer.mobile}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50/60 p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{job.jobNumber} — {job.customer.name}</p>
                  <p className="text-xs text-ink-500">
                    {job.device.brand} {job.device.model}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setJob(null)}>
                  Change
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-ink-50 p-3 text-sm">
                <div>
                  <p className="text-xs text-ink-500">Total</p>
                  <p className="font-semibold text-ink-900">{formatCurrency(total)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Paid</p>
                  <p className="font-semibold text-ink-900">{formatCurrency(paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Pending</p>
                  <p className="font-semibold text-danger-600">{formatCurrency(pending)}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormRow>
                  <Label required>Amount</Label>
                  <Input type="number" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
                </FormRow>
                <div className="grid grid-cols-2 gap-4">
                  <FormRow>
                    <Label>Payment Type</Label>
                    <Select value={type} onChange={(e) => setType(e.target.value)}>
                      {PAYMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </FormRow>
                  <FormRow>
                    <Label>Method</Label>
                    <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </FormRow>
                </div>
                <FormRow>
                  <Label>Note</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </FormRow>
                <Button type="submit" className="w-full" loading={saving}>
                  Record Payment
                </Button>
              </form>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
