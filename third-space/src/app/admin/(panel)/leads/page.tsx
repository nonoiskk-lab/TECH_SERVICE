import { db } from "@/server/db";
import { leadStatusAction } from "@/server/admin/actions";
import { whatsappHref } from "@/lib/business";
import { Card, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function LeadsPage() {
  const rows = await db.lead.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <>
      <H1>Enquiries</H1>
      <Card>
        {rows.length === 0 && <p className="text-sm text-muted">No enquiries yet.</p>}
        <ul className="divide-y divide-line/60" data-testid="lead-rows">
          {rows.map((l) => {
            const utm = l.utm as Record<string, string>;
            const wa = whatsappHref(`91${l.phone}`, `Hi ${l.name}, this is THIRD SPACE about your enquiry.`);
            return (
              <li key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-semibold">
                    {l.name} · {l.purpose} <Status value={l.status} />
                  </p>
                  <p className="text-muted">
                    {fmtDateTime(l.createdAt)} · {l.phone} · source {l.source}
                    {utm.utm_source ? ` · ${utm.utm_source}/${utm.utm_campaign ?? ""}` : ""}
                  </p>
                  {l.message && <p className="mt-1 whitespace-pre-wrap">{l.message}</p>}
                </div>
                <div className="flex gap-2">
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn-ghost text-sm">
                      WhatsApp
                    </a>
                  )}
                  {(["contacted", "closed"] as const)
                    .filter((s) => s !== l.status)
                    .map((s) => (
                      <form key={s} action={leadStatusAction}>
                        <input type="hidden" name="leadId" value={l.id} />
                        <input type="hidden" name="status" value={s} />
                        <button className="ts-btn ts-btn-ghost text-sm">Mark {s}</button>
                      </form>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
