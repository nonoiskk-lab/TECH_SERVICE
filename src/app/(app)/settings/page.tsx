"use client";

import * as React from "react";
import { toast } from "sonner";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import { SectionHeading, Tabs } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Textarea, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WHATSAPP_TEMPLATE_LABELS, type WhatsAppTemplateKey } from "@/lib/constants";

type Settings = {
  companyName: string;
  address: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  gstNumber: string | null;
  invoicePrefix: string;
  jobPrefix: string;
  currency: string;
  defaultTaxPercent: number;
  defaultWarrantyDays: number;
  autoSendWhatsAppOnStatus: boolean;
  twilioAccountSid: string | null;
  twilioWhatsAppFrom: string | null;
  twilioAuthTokenSet: boolean;
};

type Template = { key: string; name: string; body: string; isActive: boolean };

export default function SettingsPage() {
  const [tab, setTab] = React.useState("company");
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [savingCompany, setSavingCompany] = React.useState(false);
  const [savingIntegration, setSavingIntegration] = React.useState(false);
  const [twilioToken, setTwilioToken] = React.useState("");

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
    fetch("/api/whatsapp-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []));
  }, []);

  function setField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingCompany(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: settings.companyName,
          address: settings.address ?? "",
          phone: settings.phone ?? "",
          whatsappNumber: settings.whatsappNumber ?? "",
          email: settings.email ?? "",
          gstNumber: settings.gstNumber ?? "",
          invoicePrefix: settings.invoicePrefix,
          jobPrefix: settings.jobPrefix,
          currency: settings.currency,
          defaultTaxPercent: settings.defaultTaxPercent,
          defaultWarrantyDays: settings.defaultWarrantyDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save settings.");
        return;
      }
      toast.success("Company settings saved.");
      setSettings(data.settings);
    } finally {
      setSavingCompany(false);
    }
  }

  async function saveIntegration(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingIntegration(true);
    try {
      const payload: Record<string, unknown> = {
        autoSendWhatsAppOnStatus: settings.autoSendWhatsAppOnStatus,
        twilioAccountSid: settings.twilioAccountSid ?? "",
        twilioWhatsAppFrom: settings.twilioWhatsAppFrom ?? "",
      };
      if (twilioToken.trim()) payload.twilioAuthToken = twilioToken.trim();

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save integration settings.");
        return;
      }
      toast.success("Integration settings saved.");
      setSettings(data.settings);
      setTwilioToken("");
    } finally {
      setSavingIntegration(false);
    }
  }

  async function saveTemplate(key: string, body: string) {
    try {
      const res = await fetch("/api/whatsapp-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save template.");
        return;
      }
      toast.success("Template saved.");
      setTemplates((prev) => prev.map((t) => (t.key === key ? data.template : t)));
    } catch {
      toast.error("Network error.");
    }
  }

  if (!settings) return <p className="text-sm text-ink-500">Loading settings…</p>;

  const twilioConfigured = !!(settings.twilioAccountSid && settings.twilioAuthTokenSet && settings.twilioWhatsAppFrom);

  return (
    <div>
      <SectionHeading title="Settings" description="Company profile, WhatsApp templates and integrations." />

      <div className="mb-5 border-b border-[var(--color-border)]">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "company", label: "Company" },
            { key: "templates", label: "WhatsApp Templates" },
            { key: "integrations", label: "Integrations" },
          ]}
        />
      </div>

      {tab === "company" && (
        <Card className="max-w-2xl">
          <CardHeader title="Company Profile" description="Used on invoices, receipts and the customer status page." />
          <CardBody>
            <form onSubmit={saveCompany} className="space-y-4">
              <FormRow>
                <Label required>Company Name</Label>
                <Input required value={settings.companyName} onChange={(e) => setField("companyName", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Address</Label>
                <Textarea value={settings.address ?? ""} onChange={(e) => setField("address", e.target.value)} />
              </FormRow>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormRow>
                  <Label>Phone</Label>
                  <Input value={settings.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>WhatsApp Number</Label>
                  <Input value={settings.whatsappNumber ?? ""} onChange={(e) => setField("whatsappNumber", e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>Email</Label>
                  <Input type="email" value={settings.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>GST Number</Label>
                  <Input value={settings.gstNumber ?? ""} onChange={(e) => setField("gstNumber", e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>Job Number Prefix</Label>
                  <Input value={settings.jobPrefix} onChange={(e) => setField("jobPrefix", e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>Invoice Number Prefix</Label>
                  <Input value={settings.invoicePrefix} onChange={(e) => setField("invoicePrefix", e.target.value)} />
                </FormRow>
                <FormRow>
                  <Label>Currency</Label>
                  <Select value={settings.currency} onChange={(e) => setField("currency", e.target.value)}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </Select>
                </FormRow>
                <FormRow>
                  <Label>Default Tax %</Label>
                  <Input type="number" min={0} value={settings.defaultTaxPercent} onChange={(e) => setField("defaultTaxPercent", Number(e.target.value))} />
                </FormRow>
                <FormRow>
                  <Label>Default Warranty (days)</Label>
                  <Input type="number" min={0} value={settings.defaultWarrantyDays} onChange={(e) => setField("defaultWarrantyDays", Number(e.target.value))} />
                </FormRow>
              </div>
              <Button type="submit" loading={savingCompany}>
                <Save className="size-4" /> Save Company Settings
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <TemplateEditor key={t.key} template={t} onSave={saveTemplate} />
          ))}
        </div>
      )}

      {tab === "integrations" && (
        <Card className="max-w-2xl">
          <CardHeader
            title="WhatsApp Sending"
            description="Free by default via wa.me deep links. Add Twilio credentials for fully automatic sending."
            action={
              <Badge tone={twilioConfigured ? "success" : "neutral"}>
                {twilioConfigured ? (
                  <>
                    <CheckCircle2 className="mr-1 inline size-3.5" /> Twilio Connected
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 inline size-3.5" /> Using wa.me Links
                  </>
                )}
              </Badge>
            }
          />
          <CardBody>
            <form onSubmit={saveIntegration} className="space-y-4">
              <FormRow>
                <Label>Twilio Account SID</Label>
                <Input value={settings.twilioAccountSid ?? ""} onChange={(e) => setField("twilioAccountSid", e.target.value)} placeholder="ACxxxxxxxxxxxxxxxx" />
              </FormRow>
              <FormRow>
                <Label>Twilio Auth Token</Label>
                <Input
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder={settings.twilioAuthTokenSet ? "•••••••••••••• (saved — leave blank to keep)" : "Enter auth token"}
                />
              </FormRow>
              <FormRow>
                <Label>Twilio WhatsApp Number</Label>
                <Input value={settings.twilioWhatsAppFrom ?? ""} onChange={(e) => setField("twilioWhatsAppFrom", e.target.value)} placeholder="+14155238886" />
              </FormRow>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="size-4 rounded"
                  checked={settings.autoSendWhatsAppOnStatus}
                  onChange={(e) => setField("autoSendWhatsAppOnStatus", e.target.checked)}
                />
                Automatically notify customers on status changes (requires Twilio)
              </label>
              <Button type="submit" loading={savingIntegration}>
                <Save className="size-4" /> Save Integration Settings
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave }: { template: Template; onSave: (key: string, body: string) => Promise<void> }) {
  const [body, setBody] = React.useState(template.body);
  const [saving, setSaving] = React.useState(false);
  const dirty = body !== template.body;

  return (
    <Card>
      <CardHeader title={WHATSAPP_TEMPLATE_LABELS[template.key as WhatsAppTemplateKey] ?? template.name} />
      <CardBody>
        <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-xs text-ink-400">
          Variables: {"{{customerName}} {{companyName}} {{jobNumber}} {{status}} {{estimatedCost}} {{pendingAmount}} {{expectedDate}} {{statusLink}}"}
        </p>
        <Button
          size="sm"
          className="mt-2"
          disabled={!dirty}
          loading={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(template.key, body);
            setSaving(false);
          }}
        >
          Save Template
        </Button>
      </CardBody>
    </Card>
  );
}
