import type { Metadata } from "next";
import { privacyPoints, recordingConsent } from "@/config/site";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { BulletList, PageHeader, Section } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.privacyTitle} | THIRD SPACE`, alternates: { canonical: "/privacy" } };
}

export default async function PrivacyPage() {
  const { t, locale } = await getDict();
  const L = (xs: { en: string; hi: string }[]) => xs.map((x) => tl(x, locale));
  return (
    <>
      <PageHeader title={t.pages.privacyTitle} />
      <Section>
        <div className="ts-card p-6">
          <BulletList items={L(privacyPoints)} />
        </div>
      </Section>
      <Section title={t.policies.consentTitle} id="recording">
        <div className="ts-card space-y-3 p-6">
          <BulletList items={L(recordingConsent.points)} />
          <p className="text-muted">{tl(recordingConsent.delivery, locale)}</p>
        </div>
      </Section>
    </>
  );
}
