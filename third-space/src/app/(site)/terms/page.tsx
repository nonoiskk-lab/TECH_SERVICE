import type { Metadata } from "next";
import { isLegalGateOpen, termsPoints, venueRules } from "@/config/site";
import { DECLARATION_CLOSING, DECLARATION_INTRO, DECLARATION_POINTS, DECLARATION_TITLE, type PolicyDocId } from "@/config/policies";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { flowEnv } from "@/lib/flow-env";
import { BulletList, PageHeader, Section } from "@/components/ui";
import { PolicyDocLinks, PolicyStatusBanner } from "@/components/policy-bits";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.termsTitle} | THIRD SPACE`, alternates: { canonical: "/terms" } };
}

export default async function TermsPage() {
  const { t, locale } = await getDict();
  const L = (xs: { en: string; hi: string }[]) => xs.map((x) => tl(x, locale));
  const terms = flowEnv().advancePercent === 0 ? [t.policies.venueTerm, ...L(termsPoints).slice(2)] : L(termsPoints);
  return (
    <>
      <PageHeader title={t.pages.termsTitle} />
      <Section>
        <PolicyStatusBanner t={t} />
        <div className="ts-card p-6">
          <BulletList items={terms} />
        </div>
      </Section>
      <Section title={t.policies.venueTitle} id="venue">
        <div className="ts-card p-6">
          <BulletList items={L(venueRules)} />
        </div>
      </Section>
      <Section title={DECLARATION_TITLE} id="declaration">
        <div className="ts-card space-y-3 p-6" lang="en">
          <p>{DECLARATION_INTRO}</p>
          <ol className="list-decimal space-y-2 pl-5 text-muted">
            {DECLARATION_POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <p className="text-muted">{DECLARATION_CLOSING}</p>
        </div>
      </Section>
      <Section title={t.policies.fullDocs} id="docs">
        <PolicyDocLinks t={t} ids={["safety", ...(isLegalGateOpen() ? ["theatre"] : []), "podcast", "creator"] as PolicyDocId[]} />
      </Section>
    </>
  );
}
