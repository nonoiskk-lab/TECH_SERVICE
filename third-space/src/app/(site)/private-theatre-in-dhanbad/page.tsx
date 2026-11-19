import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLegalGateOpen } from "@/config/site";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { theatreSeo } from "@/i18n/seo";
import { publicBusiness } from "@/lib/business";
import { SeoPage } from "@/components/seo-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  if (!isLegalGateOpen()) return { title: t.notFound.title, robots: { index: false, follow: false } };
  return { title: `${t.seo.theatreTitle} | THIRD SPACE`, description: t.seo.theatreMeta, alternates: { canonical: "/private-theatre-in-dhanbad" } };
}

export default async function TheatreSeoPage() {
  // While the Legal Gate is closed this page does not exist (no copy, no sitemap entry).
  if (!isLegalGateOpen()) notFound();
  const { t, locale } = await getDict();
  return (
    <SeoPage
      t={t}
      locale={locale}
      title={t.seo.theatreTitle}
      intro={t.watch.intro}
      copy={theatreSeo(locale)}
      pkgs={packages.filter((p) => p.mode === "watch")}
      ctaHref="/watch"
      hoursLabel={publicBusiness(locale).hoursLabel}
    />
  );
}
