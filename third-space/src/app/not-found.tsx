import Link from "next/link";
import { getDict } from "@/lib/locale";
import { PageHeader, Section } from "@/components/ui";
import { NotFoundArt } from "@/components/state-art";
import { SiteChrome } from "@/components/site-chrome";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <SiteChrome>
      <PageHeader title={t.notFound.title} intro={t.notFound.text} />
      <Section className="text-center">
        <NotFoundArt className="mx-auto mb-8 h-auto w-full max-w-xs" />
        <Link href="/" className="ts-btn ts-btn-primary">
          {t.notFound.cta}
        </Link>
      </Section>
    </SiteChrome>
  );
}
