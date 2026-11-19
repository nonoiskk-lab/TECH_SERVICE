import type { Metadata } from "next";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { podcastSeo } from "@/i18n/seo";
import { publicBusiness } from "@/lib/business";
import { SeoPage } from "@/components/seo-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.seo.podcastTitle} | THIRD SPACE`, description: t.seo.podcastMeta, alternates: { canonical: "/podcast-studio-in-dhanbad" } };
}

export default async function PodcastSeoPage() {
  const { t, locale } = await getDict();
  return (
    <SeoPage
      t={t}
      locale={locale}
      title={t.seo.podcastTitle}
      intro={t.create.intro}
      copy={podcastSeo(locale)}
      pkgs={packages.filter((p) => p.mode === "create")}
      ctaHref="/create#estimator"
      hoursLabel={publicBusiness(locale).hoursLabel}
    />
  );
}
