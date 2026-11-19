import { isLegalGateOpen } from "@/config/site";
import { packages } from "@/config/packages";
import { db } from "@/server/db";
import { createTitleAction, toggleTitleAction } from "@/server/admin/actions";
import { durationText, resolveSession } from "@/lib/session";
import { formatINR } from "@/lib/pricing";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1, Status } from "@/components/admin/ui";

export default async function TitlesPage() {
  const rows = await db.title.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const theatre = packages.filter((p) => p.pricing.kind === "title");
  const asInfo = rows.map((r) => ({ id: r.id, name: r.name, runtimeMinutes: r.runtimeMinutes, language: r.language }));
  return (
    <>
      <H1>Titles for the private room</H1>
      {!isLegalGateOpen() && (
        <p className="ts-card mb-4 p-4 text-sm text-warm">
          The Legal Gate is closed, so guests cannot see or book these yet. You can prepare the list now.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Listed titles">
          {rows.length === 0 && <p className="text-sm text-muted">No titles yet.</p>}
          <ul className="divide-y divide-line/60" data-testid="title-rows">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-semibold">{r.name}</span> <Status value={r.active ? "active" : "hidden"} />
                  <span className="block text-muted">
                    {durationText(r.runtimeMinutes)} {r.language && `· ${r.language}`} {r.certification && `· ${r.certification}`} · licence {r.licenceRef}
                  </span>
                  <span className="block text-faint">
                    {theatre
                      .map((p) => {
                        const q = resolveSession(p, { titleId: r.id }, asInfo);
                        return q.ok ? `${p.name.en}: ${durationText(q.session.durationMinutes)}, ${formatINR(q.session.basePrice)}` : "";
                      })
                      .join(" · ")}
                  </span>
                </span>
                <form action={toggleTitleAction}>
                  <input type="hidden" name="titleId" value={r.id} />
                  <button className="ts-btn ts-btn-ghost text-sm">{r.active ? "Hide" : "Show"}</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Add a title" testId="title-form">
          <ActionForm action={createTitleAction} submit="Add title">
            <Field label="Title">
              <input name="name" className="ts-input" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Runtime (minutes)">
                <input name="runtimeMinutes" type="number" min={10} max={420} className="ts-input" />
              </Field>
              <Field label="Language">
                <input name="language" className="ts-input" />
              </Field>
              <Field label="Certification">
                <input name="certification" className="ts-input" />
              </Field>
              <Field label="Licence reference">
                <input name="licenceRef" className="ts-input" />
              </Field>
            </div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" name="licenceConfirmed" className="mt-1 h-5 w-5" />
              The licence covers private exhibition of this title at THIRD SPACE for paying guests.
            </label>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
