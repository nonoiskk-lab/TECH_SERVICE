import Link from "next/link";
import { db } from "@/server/db";
import { declarationText, missingLegalFields, POLICY_DOCS, POLICY_HISTORY, POLICY_PACK_VERSION, policyStatus } from "@/config/policies";
import { Card, H1 } from "@/components/admin/ui";

export default async function PoliciesAdmin() {
  const counts = await db.policyAcceptance.groupBy({ by: ["policyPackVersion"], _count: { _all: true } });
  const optional = await db.policyAcceptance.aggregate({ _count: { _all: true }, where: { promotionalConsent: true } });
  const missing = missingLegalFields();
  return (
    <>
      <H1>Policies</H1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Current pack: version ${POLICY_PACK_VERSION} (${policyStatus()})`}>
          <ul className="space-y-1 text-sm">
            {Object.values(POLICY_DOCS).map((d) => (
              <li key={d.path}>
                <Link href={d.path} target="_blank" className="underline">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
          {missing.length > 0 && <p className="mt-3 text-sm text-warm">Before go-live set: {missing.join(", ")}</p>}
        </Card>
        <Card title="Acceptances by version" testId="acceptance-counts">
          <ul className="text-sm">
            {counts.map((c) => (
              <li key={c.policyPackVersion}>
                Version {c.policyPackVersion}: {c._count._all} booking(s)
              </li>
            ))}
            {counts.length === 0 && <li className="text-muted">No bookings yet.</li>}
          </ul>
          <p className="mt-2 text-sm text-muted">Optional promotional consent given: {optional._count._all}</p>
        </Card>
        <Card title="Mandatory Customer Declaration">
          <pre className="whitespace-pre-wrap text-xs text-muted">{declarationText()}</pre>
        </Card>
        <Card title="Version history">
          {POLICY_HISTORY.map((v) => (
            <div key={v.version} className="text-sm">
              <p className="font-semibold">
                {v.version} · {v.date}
              </p>
              <ul className="list-disc pl-5 text-muted">
                {v.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
