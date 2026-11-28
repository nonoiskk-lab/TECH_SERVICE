import type { Metadata } from "next";
import { getPackage } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { bookingDates } from "@/lib/booking-dates";
import { flowEnv } from "@/lib/flow-env";
import { PageHeader, Section } from "@/components/ui";
import { PodcastScene } from "@/components/illustrations";
import { BookingFlow } from "@/components/booking-flow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.visit.metaTitle, description: t.visit.metaDescription, alternates: { canonical: "/visit" } };
}

export default async function VisitPage() {
  const { t, locale } = await getDict();
  const tour = getPackage("visit-tour")!;
  return (
    <>
      <PageHeader title={t.visit.title} intro={t.visit.intro} art={<PodcastScene className="h-full w-full" />} />
      <Section>
        <BookingFlow t={t} locale={locale} mode="visit" packages={[tour]} {...bookingDates()} {...flowEnv()} />
      </Section>
    </>
  );
}
