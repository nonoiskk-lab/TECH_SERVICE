import { toWhatsAppNumber, formatCurrency, formatDate } from "./utils";
import { statusUrlFor } from "./qr";
import type { WhatsAppTemplateKey } from "./constants";

export type TemplateVars = {
  customerName: string;
  companyName: string;
  jobNumber: string;
  deviceBrand?: string;
  deviceModel?: string;
  status?: string;
  diagnosisSummary?: string;
  estimatedCost?: string;
  expectedDate?: string;
  pendingAmount?: string;
  statusLink?: string;
};

/** Replaces {{variable}} placeholders in a template body with real values. */
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = (vars as Record<string, string | undefined>)[key];
    return value ?? "";
  });
}

export function buildTemplateVars(opts: {
  customerName: string;
  companyName: string;
  jobNumber: string;
  publicToken: string;
  deviceBrand?: string;
  deviceModel?: string;
  status?: string;
  diagnosisSummary?: string;
  estimatedCost?: number | null;
  expectedDate?: Date | null;
  pendingAmount?: number;
}): TemplateVars {
  return {
    customerName: opts.customerName,
    companyName: opts.companyName,
    jobNumber: opts.jobNumber,
    deviceBrand: opts.deviceBrand,
    deviceModel: opts.deviceModel,
    status: opts.status,
    diagnosisSummary: opts.diagnosisSummary,
    estimatedCost: opts.estimatedCost != null ? formatCurrency(opts.estimatedCost) : undefined,
    expectedDate: opts.expectedDate ? formatDate(opts.expectedDate) : undefined,
    pendingAmount: opts.pendingAmount != null ? formatCurrency(opts.pendingAmount) : undefined,
    statusLink: statusUrlFor(opts.publicToken),
  };
}

/** Zero-config WhatsApp send: opens wa.me with the message prefilled for staff to hit send. */
export function buildWaLink(mobile: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(mobile)}?text=${encodeURIComponent(message)}`;
}

export function isTwilioConfigured(settings: { twilioAccountSid: string | null; twilioAuthToken: string | null; twilioWhatsAppFrom: string | null }) {
  return !!(settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioWhatsAppFrom);
}

/**
 * Sends via the Twilio WhatsApp Cloud API using a plain fetch (no SDK
 * dependency). Only called when Settings has Twilio credentials configured;
 * otherwise the caller falls back to the free wa.me deep-link flow.
 */
export async function sendViaTwilio(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
  const auth = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64");
  const body = new URLSearchParams({
    From: `whatsapp:${opts.from}`,
    To: `whatsapp:+${toWhatsAppNumber(opts.to)}`,
    Body: opts.message,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 300) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export const DEFAULT_TEMPLATE_KEY_FOR_QUICK_ACTION: Record<string, WhatsAppTemplateKey> = {
  status: "STATUS_LINK",
  estimate: "ESTIMATE_SENT",
  ready: "READY_FOR_PICKUP",
  payment: "PAYMENT_REMINDER",
};
