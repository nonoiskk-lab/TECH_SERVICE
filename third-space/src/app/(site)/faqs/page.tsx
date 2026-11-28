import type { Metadata } from "next";
import { getDict } from "@/lib/locale";
import { faqItems } from "@/lib/faq";
import { flowEnv } from "@/lib/flow-env";
import { Faq, PageHeader, Section } from "@/components/ui";
import { JsonLd, faqLd } from "@/components/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.faqsTitle} | THIRD SPACE`, description: t.pages.positioning, alternates: { canonical: "/faqs" } };
}

export default async function FaqsPage() {
  const { t, locale } = await getDict();
  const faqs = faqItems(t, locale, flowEnv().advancePercent);
  return (
    <>
      <PageHeader title={t.pages.faqsTitle} />
      <Section>
        <Faq items={faqs} />
      </Section>
      <JsonLd data={faqLd(faqs)} />
    </>
  );
}
