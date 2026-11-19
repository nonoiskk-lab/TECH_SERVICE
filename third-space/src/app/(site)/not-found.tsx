import Link from "next/link";
import { getDict } from "@/lib/locale";
import { PageHeader, Section } from "@/components/ui";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <>
      <PageHeader title={t.notFound.title} intro={t.notFound.text} />
      <Section>
        <Link href="/" className="ts-btn ts-btn-primary">
          {t.notFound.cta}
        </Link>
      </Section>
    </>
  );
}
