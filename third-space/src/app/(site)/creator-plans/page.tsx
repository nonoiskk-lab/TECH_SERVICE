import type { Metadata } from "next";
import Link from "next/link";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { BulletList, PackageCard, PageHeader, Section } from "@/components/ui";
import { CreatorScene } from "@/components/illustrations";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.creatorTitle} | THIRD SPACE`, description: t.pages.creatorIntro, alternates: { canonical: "/creator-plans" } };
}

export default async function CreatorPlansPage() {
  const { t, locale } = await getDict();
  const plans = packages.filter((p) => p.prepaidHours);
  const hourly = packages.filter((p) => p.mode === "create" && !p.prepaidHours);
  return (
    <>
      <PageHeader title={t.pages.creatorTitle} intro={t.pages.creatorIntro} art={<CreatorScene className="h-full w-full" />} />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
          ))}
          <div className="ts-card p-6">
            <BulletList items={t.pages.creatorHow} />
            <Link href="/policies/creator" className="mt-5 inline-block text-sm font-semibold text-warm">
              {t.nav.policies} →
            </Link>
          </div>
        </div>
      </Section>
      {hourly.length > 0 && (
        <Section title={t.nav.create} id="hourly">
          <div className="grid gap-4 md:grid-cols-2">
            {hourly.map((p) => (
              <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
