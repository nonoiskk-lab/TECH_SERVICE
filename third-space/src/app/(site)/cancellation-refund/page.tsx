import type { Metadata } from "next";
import Link from "next/link";
import { refundTiers } from "@/config/site";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { flowEnv } from "@/lib/flow-env";
import { PageHeader, Section } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.refundTitle} | THIRD SPACE`, alternates: { canonical: "/cancellation-refund" } };
}

export default async function RefundPage() {
  const { t, locale } = await getDict();
  return (
    <>
      <PageHeader title={t.pages.refundTitle} />
      <Section>
        <div className="ts-card p-6" data-testid="refund-tiers">
          {flowEnv().advancePercent === 0 && (
            <p className="mb-3 rounded-xl bg-raised px-4 py-3 text-sm" data-testid="venue-policy-note">
              {t.policies.venueNote}
            </p>
          )}
          <p className="mb-3 text-muted">{t.policies.cancelIntro}</p>
          <ul className="space-y-2">
            {refundTiers.map((r) => (
              <li key={r.minHoursBefore} className="flex justify-between gap-3 border-b border-line/50 pb-2">
                <span>{tl(r.label, locale)}</span>
                <strong>
                  {r.refundPercentOfAdvance}% {t.policies.refundOf}
                </strong>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-muted">{t.pages.refundProcess}</p>
          <Link href="/my-booking" className="ts-btn ts-btn-primary mt-5">
            {t.nav.myBooking}
          </Link>
        </div>
      </Section>
    </>
  );
}
