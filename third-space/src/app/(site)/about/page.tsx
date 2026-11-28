import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/locale";
import { publicBusiness } from "@/lib/business";
import { PageHeader, Section } from "@/components/ui";
import { RoomScene } from "@/components/illustrations";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.aboutTitle} | THIRD SPACE`, description: t.pages.positioning, alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const { t, locale } = await getDict();
  const biz = publicBusiness(locale);
  return (
    <>
      <PageHeader eyebrow={t.pages.endorsement} title={t.pages.aboutTitle} intro={t.pages.positioning} art={<RoomScene className="h-full w-full" />} />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4 text-lg text-muted">
            {t.pages.aboutBody.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="font-heading text-2xl text-warm">Your Voice. Your Space. Your Story.</p>
          </div>
          <div className="ts-card h-fit space-y-3 p-6 text-sm">
            <p>{t.pages.aboutVisit}</p>
            <p className="text-muted">
              {t.common.address}: <span data-consistency="address">{biz.address}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/visit" className="ts-btn ts-btn-ghost">
                {t.nav.visit}
              </Link>
              <Link href="/book" className="ts-btn ts-btn-primary">
                {t.nav.book}
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
