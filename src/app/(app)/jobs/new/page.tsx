"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  UserPlus,
  Laptop2,
  Plus,
  Loader2,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FormRow } from "@/components/ui/field";
import { Checkbox, Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import {
  ACCESSORY_OPTIONS,
  CONDITION_ITEMS,
  CONDITION_ITEM_LABELS,
  CONDITION_VALUES,
  DEVICE_TYPES,
  JOB_PRIORITIES,
  QUICK_ISSUES,
  type ConditionItem,
  type ConditionValue,
} from "@/lib/constants";

const STEPS = ["Customer", "Device", "Condition & Accessories", "Complaint"] as const;

type CustomerLite = { id: string; name: string; mobile: string; customerCode: string };
type DeviceLite = {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  operatingSystem: string | null;
};

const emptyDeviceForm = {
  deviceType: "LAPTOP",
  brand: "",
  model: "",
  serialNumber: "",
  serviceTag: "",
  operatingSystem: "",
  processor: "",
  ram: "",
  storage: "",
  color: "",
  deviceAgeYears: "",
};

export default function NewJobWizard() {
  return (
    <React.Suspense fallback={null}>
      <Wizard />
    </React.Suspense>
  );
}

function Wizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  // Step 1 — customer
  const [customerMode, setCustomerMode] = React.useState<"search" | "new">("search");
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerResults, setCustomerResults] = React.useState<CustomerLite[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerLite | null>(null);
  const [newCustomer, setNewCustomer] = React.useState({
    name: "",
    mobile: "",
    whatsapp: "",
    email: "",
    address: "",
    customerType: "INDIVIDUAL",
    notes: "",
  });

  // Step 2 — device
  const [deviceMode, setDeviceMode] = React.useState<"existing" | "new">("new");
  const [existingDevices, setExistingDevices] = React.useState<DeviceLite[]>([]);
  const [loadingDevices, setLoadingDevices] = React.useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
  const [newDevice, setNewDevice] = React.useState(emptyDeviceForm);

  // Step 3 — condition & accessories
  const [condition, setCondition] = React.useState<Record<ConditionItem, ConditionValue>>(
    () => Object.fromEntries(CONDITION_ITEMS.map((c) => [c, "GOOD"])) as Record<ConditionItem, ConditionValue>
  );
  const [accessories, setAccessories] = React.useState<string[]>([]);

  // Step 4 — complaint
  const [quickIssues, setQuickIssues] = React.useState<string[]>([]);
  const [complaintText, setComplaintText] = React.useState("");
  const [additionalNotes, setAdditionalNotes] = React.useState("");
  const [priority, setPriority] = React.useState("NORMAL");
  const [expectedDate, setExpectedDate] = React.useState("");
  const [technicianId, setTechnicianId] = React.useState("");
  const [estimatedCost, setEstimatedCost] = React.useState("");
  const [technicians, setTechnicians] = React.useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    fetch("/api/technicians")
      .then((r) => r.json())
      .then((d) => setTechnicians(d.technicians ?? []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!preselectedCustomerId) return;
    fetch(`/api/customers/${preselectedCustomerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.customer) {
          setSelectedCustomer({
            id: d.customer.id,
            name: d.customer.name,
            mobile: d.customer.mobile,
            customerCode: d.customer.customerCode,
          });
        }
      })
      .catch(() => {});
  }, [preselectedCustomerId]);

  // Debounced customer search
  React.useEffect(() => {
    if (customerMode !== "search" || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}&pageSize=8`);
        const data = await res.json();
        setCustomerResults(data.customers ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [customerQuery, customerMode]);

  // Load devices when an existing customer is chosen
  React.useEffect(() => {
    if (!selectedCustomer) {
      setExistingDevices([]);
      return;
    }
    setLoadingDevices(true);
    fetch(`/api/customers/${selectedCustomer.id}/devices`)
      .then((r) => r.json())
      .then((d) => {
        setExistingDevices(d.devices ?? []);
        setDeviceMode(d.devices?.length ? "existing" : "new");
      })
      .finally(() => setLoadingDevices(false));
  }, [selectedCustomer]);

  function toggleQuickIssue(issue: string) {
    setQuickIssues((prev) => (prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]));
  }
  function toggleAccessory(item: string) {
    setAccessories((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  function canProceed() {
    if (step === 0) {
      return !!selectedCustomer || (newCustomer.name.trim().length > 1 && /^[6-9]\d{9}$/.test(newCustomer.mobile.replace(/\D/g, "")));
    }
    if (step === 1) {
      if (deviceMode === "existing") return !!selectedDeviceId;
      return newDevice.brand.trim().length > 0 && newDevice.model.trim().length > 0;
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        priority,
        conditionChecklist: condition,
        accessoriesReceived: accessories,
        quickIssues,
        complaintText,
        additionalNotes,
        expectedCompletionDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        assignedTechnicianId: technicianId || undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      };

      if (selectedCustomer) {
        payload.customerId = selectedCustomer.id;
      } else {
        payload.customer = newCustomer;
      }

      if (deviceMode === "existing" && selectedDeviceId) {
        payload.deviceId = selectedDeviceId;
      } else {
        payload.device = {
          ...newDevice,
          deviceAgeYears: newDevice.deviceAgeYears ? Number(newDevice.deviceAgeYears) : undefined,
        };
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create the service job.");
        return;
      }
      toast.success(`Job ${data.job.jobNumber} created.`);
      router.push(`/jobs/${data.job.id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto scroll-thin">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex shrink-0 items-center gap-2">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                  i < step
                    ? "bg-success-600 text-white"
                    : i === step
                    ? "bg-primary-600 text-white"
                    : "bg-ink-100 text-ink-400"
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </div>
              <span className={cn("text-sm font-medium", i === step ? "text-ink-900" : "text-ink-500")}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-8 shrink-0 bg-[var(--color-border)]" />}
          </React.Fragment>
        ))}
      </div>

      <Card>
        <CardBody>
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={customerMode === "search" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setCustomerMode("search")}
                >
                  <Search className="size-4" /> Find Existing
                </Button>
                <Button
                  type="button"
                  variant={customerMode === "new" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCustomerMode("new");
                    setSelectedCustomer(null);
                  }}
                >
                  <UserPlus className="size-4" /> New Customer
                </Button>
              </div>

              {customerMode === "search" && !selectedCustomer && (
                <div>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name, mobile or customer ID…"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />
                    {searching && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-ink-400" />}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left hover:border-primary-300 hover:bg-primary-50/40"
                      >
                        <Avatar name={c.name} />
                        <div>
                          <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                          <p className="text-xs text-ink-500">
                            {c.customerCode} · {c.mobile}
                          </p>
                        </div>
                      </button>
                    ))}
                    {customerQuery && !searching && customerResults.length === 0 && (
                      <p className="py-3 text-center text-sm text-ink-500">
                        No matches. Switch to &ldquo;New Customer&rdquo; to register them.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedCustomer && (
                <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedCustomer.name} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{selectedCustomer.name}</p>
                      <p className="text-xs text-ink-500">
                        {selectedCustomer.customerCode} · {selectedCustomer.mobile}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                    Change
                  </Button>
                </div>
              )}

              {customerMode === "new" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow>
                    <Label required>Full Name</Label>
                    <Input
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
                    />
                  </FormRow>
                  <FormRow>
                    <Label required>Mobile</Label>
                    <Input
                      inputMode="numeric"
                      value={newCustomer.mobile}
                      onChange={(e) => setNewCustomer((c) => ({ ...c, mobile: e.target.value }))}
                    />
                  </FormRow>
                  <FormRow>
                    <Label>WhatsApp</Label>
                    <Input
                      value={newCustomer.whatsapp}
                      onChange={(e) => setNewCustomer((c) => ({ ...c, whatsapp: e.target.value }))}
                      placeholder="Same as mobile if blank"
                    />
                  </FormRow>
                  <FormRow>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))}
                    />
                  </FormRow>
                  <FormRow className="sm:col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))}
                    />
                  </FormRow>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {loadingDevices && <p className="text-sm text-ink-500">Loading devices…</p>}

              {!loadingDevices && existingDevices.length > 0 && (
                <div className="flex gap-2">
                  <Button type="button" variant={deviceMode === "existing" ? "primary" : "outline"} size="sm" onClick={() => setDeviceMode("existing")}>
                    Existing Device
                  </Button>
                  <Button type="button" variant={deviceMode === "new" ? "primary" : "outline"} size="sm" onClick={() => setDeviceMode("new")}>
                    <Plus className="size-4" /> Add New Device
                  </Button>
                </div>
              )}

              {deviceMode === "existing" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {existingDevices.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeviceId(d.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left",
                        selectedDeviceId === d.id
                          ? "border-primary-400 bg-primary-50/50"
                          : "border-[var(--color-border)] hover:border-primary-200"
                      )}
                    >
                      <Laptop2 className="mt-0.5 size-4 text-primary-600" />
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {d.brand} {d.model}
                        </p>
                        <p className="text-xs text-ink-500">{d.serialNumber ? `S/N ${d.serialNumber}` : "No serial number"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {deviceMode === "new" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormRow>
                    <Label>Device Type</Label>
                    <Select
                      value={newDevice.deviceType}
                      onChange={(e) => setNewDevice((d) => ({ ...d, deviceType: e.target.value }))}
                    >
                      {DEVICE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </FormRow>
                  <FormRow>
                    <Label required>Brand</Label>
                    <Input value={newDevice.brand} onChange={(e) => setNewDevice((d) => ({ ...d, brand: e.target.value }))} placeholder="HP, Dell, Lenovo…" />
                  </FormRow>
                  <FormRow>
                    <Label required>Model</Label>
                    <Input value={newDevice.model} onChange={(e) => setNewDevice((d) => ({ ...d, model: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Serial Number</Label>
                    <Input value={newDevice.serialNumber} onChange={(e) => setNewDevice((d) => ({ ...d, serialNumber: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Service Tag</Label>
                    <Input value={newDevice.serviceTag} onChange={(e) => setNewDevice((d) => ({ ...d, serviceTag: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Operating System</Label>
                    <Input value={newDevice.operatingSystem} onChange={(e) => setNewDevice((d) => ({ ...d, operatingSystem: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Processor</Label>
                    <Input value={newDevice.processor} onChange={(e) => setNewDevice((d) => ({ ...d, processor: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>RAM</Label>
                    <Input value={newDevice.ram} onChange={(e) => setNewDevice((d) => ({ ...d, ram: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Storage</Label>
                    <Input value={newDevice.storage} onChange={(e) => setNewDevice((d) => ({ ...d, storage: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Colour</Label>
                    <Input value={newDevice.color} onChange={(e) => setNewDevice((d) => ({ ...d, color: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Label>Device Age (years)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newDevice.deviceAgeYears}
                      onChange={(e) => setNewDevice((d) => ({ ...d, deviceAgeYears: e.target.value }))}
                    />
                  </FormRow>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-ink-900">Device Condition at Intake</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CONDITION_ITEMS.map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
                      <span className="text-sm text-ink-700">{CONDITION_ITEM_LABELS[item]}</span>
                      <div className="flex gap-1">
                        {CONDITION_VALUES.filter((v) => v !== "NOT_CHECKED").map((v) => (
                          <button
                            key={v}
                            onClick={() => setCondition((c) => ({ ...c, [item]: v }))}
                            className={cn(
                              "rounded-lg px-2 py-1 text-xs font-semibold",
                              condition[item] === v
                                ? v === "GOOD"
                                  ? "bg-success-600 text-white"
                                  : v === "FAIR"
                                  ? "bg-warning-600 text-white"
                                  : "bg-danger-600 text-white"
                                : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                            )}
                          >
                            {v === "GOOD" ? "Good" : v === "FAIR" ? "Fair" : "Damaged"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-ink-900">Accessories Received</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {ACCESSORY_OPTIONS.map((item) => (
                    <Checkbox key={item} checked={accessories.includes(item)} onChange={() => toggleAccessory(item)} label={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-semibold text-ink-900">Quick Issue</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      onClick={() => toggleQuickIssue(issue)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium",
                        quickIssues.includes(issue)
                          ? "border-primary-400 bg-primary-50 text-primary-700"
                          : "border-[var(--color-border)] text-ink-600 hover:bg-ink-50"
                      )}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              </div>
              <FormRow>
                <Label>Customer Complaint (custom description)</Label>
                <Textarea
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder='e.g. "Laptop automatically shuts down after 20-30 minutes."'
                />
              </FormRow>
              <FormRow>
                <Label>Additional Notes</Label>
                <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
              </FormRow>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormRow>
                  <Label>Priority</Label>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {JOB_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                <FormRow>
                  <Label>Expected Completion Date</Label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>Assign Technician</Label>
                  <Select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                <FormRow>
                  <Label>Initial Estimated Cost (optional)</Label>
                  <Input type="number" min={0} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                </FormRow>
              </div>
            </div>
          )}
        </CardBody>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] p-4">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>
              Create Service Job
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
