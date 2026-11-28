import Link from "next/link";
import { POLICY_DOCS, POLICY_PACK_DATE, POLICY_PACK_VERSION, policyStatus, type PolicyDocId } from "@/config/policies";
import type { Dict } from "@/i18n";

export function PolicyStatusBanner({ t }: { t: Dict }) {
  return (
    <p className="ts-card mb-6 px-4 py-3 text-sm text-muted" data-testid="policy-version">
      {t.policies.versionLabel} {POLICY_PACK_VERSION} · {POLICY_PACK_DATE}
      {policyStatus() === "draft" && <span className="ml-2 text-warm">· {t.policies.draftNote}</span>}
    </p>
  );
}

export function PolicyDocLinks({ ids, t }: { ids: PolicyDocId[]; t: Dict }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {ids.map((id) => (
        <li key={id}>
          <Link href={POLICY_DOCS[id].path} className="ts-card flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:border-warm">
            <span>{POLICY_DOCS[id].title}</span>
            <span className="text-sm text-warm">{t.common.learnMore} →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
