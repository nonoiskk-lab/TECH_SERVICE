import { z } from "zod";
import { enquiryPurposes, isLegalGateOpen } from "@/config/site";
import { leads } from "@/server/slots";
import { json } from "@/lib/api";

const Body = z.object({
  purpose: z.string(),
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  message: z.string().trim().max(1000).default(""),
  source: z.string().max(60).default("contact"),
  utm: z.record(z.string(), z.string().max(120)).default({}),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "BAD_REQUEST" }, 400);
  const purpose = enquiryPurposes.find((p) => p.id === parsed.data.purpose && (!p.gated || isLegalGateOpen()));
  if (!purpose) return json({ error: "BAD_PURPOSE" }, 400);
  const lead = await leads.create(parsed.data);
  return json({ ok: true, id: lead.id }, 201);
}
