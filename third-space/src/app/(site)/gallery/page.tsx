import type { Metadata } from "next";
import { getDict } from "@/lib/locale";
import { galleryImages } from "@/server/content";
import { PageHeader, Section } from "@/components/ui";
import { GalleryGrid } from "@/components/site-sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.pages.galleryTitle} | THIRD SPACE`, description: t.pages.galleryIntro, alternates: { canonical: "/gallery" } };
}

export default async function GalleryPage() {
  const { t } = await getDict();
  return (
    <>
      <PageHeader title={t.pages.galleryTitle} intro={t.pages.galleryIntro} />
      <Section>
        <GalleryGrid images={await galleryImages()} t={t} />
      </Section>
    </>
  );
}
