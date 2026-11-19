import type { Metadata } from "next";
import { contentRule, isLegalGateOpen, privacyPoints, recordingConsent, refundTiers, termsPoints, venueRules } from "@/config/site";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { publicBusiness } from "@/lib/business";
import { BulletList, PageHeader, Section } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.policies.metaTitle, description: t.policies.metaDescription, alternates: { canonical: "/policies" } };
}

export default async function PoliciesPage() {
  const { t, locale } = await getDict();
  const biz = publicBusiness(locale);
  const L = (xs: { en: string; hi: string }[]) => xs.map((x) => tl(x, locale));
  return (
    <>
      <PageHeader title={t.policies.title} intro={t.policies.intro} />
      <Section title={t.policies.venueTitle} id="venue">
        <div className="ts-card space-y-3 p-5">
          <BulletList items={L(venueRules)} />
          <p className="text-sm text-faint">
            {t.common.hours_label}: <span data-consistency="hours">{biz.hoursLabel}</span> · {t.common.address}:{" "}
            <span data-consistency="address">{biz.address}</span>
          </p>
        </div>
      </Section>
      <Section title={t.policies.cancelTitle} id="cancellation">
        <div className="ts-card p-5">
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
        </div>
      </Section>
      <Section title={t.policies.consentTitle} id="consent">
        <div className="ts-card space-y-3 p-5">
          <BulletList items={L(recordingConsent.points)} />
          <p className="text-muted">{tl(recordingConsent.delivery, locale)}</p>
        </div>
      </Section>
      {isLegalGateOpen() && (
        <Section title={t.policies.contentTitle} id="content">
          <p className="ts-card p-5 text-muted">{tl(contentRule, locale)}</p>
        </Section>
      )}
      <Section title={t.policies.termsTitle} id="terms">
        <div className="ts-card p-5">
          <BulletList items={L(termsPoints)} />
        </div>
      </Section>
      <Section title={t.policies.privacyTitle} id="privacy">
        <div className="ts-card p-5">
          <BulletList items={L(privacyPoints)} />
        </div>
      </Section>
    </>
  );
}
