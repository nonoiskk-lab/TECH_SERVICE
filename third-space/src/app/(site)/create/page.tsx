import type { Metadata } from "next";
import { recordingConsent } from "@/config/site";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { bookingDates } from "@/lib/booking-dates";
import { flowEnv } from "@/lib/flow-env";
import { BulletList, PackageCard, PageHeader, Section } from "@/components/ui";
import { BookingFlow } from "@/components/booking-flow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.create.metaTitle, description: t.create.metaDescription, alternates: { canonical: "/create" } };
}

export default async function CreatePage() {
  const { t, locale } = await getDict();
  const createPkgs = packages.filter((p) => p.mode === "create");
  return (
    <>
      <PageHeader title={t.create.title} intro={t.create.intro} />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {createPkgs.map((p) => (
            <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`#estimator`} />
          ))}
        </div>
      </Section>
      <Section title={t.create.consentTitle} id="consent">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ts-card p-5">
            <BulletList items={recordingConsent.points.map((p) => tl(p, locale))} />
          </div>
          <div className="ts-card p-5">
            <h3 className="mb-2 font-bold">{t.create.deliveryTitle}</h3>
            <p className="text-muted">{tl(recordingConsent.delivery, locale)}</p>
          </div>
        </div>
      </Section>
      <Section id="stories">
        <div className="ts-card p-6">
          <h2 className="text-2xl font-bold">{t.home.storiesTitle}</h2>
          <p className="mt-2 text-muted">{t.home.storiesText}</p>
        </div>
      </Section>
      <Section title={t.create.estimatorTitle} id="estimator">
        <p className="mb-6 max-w-2xl text-muted">{t.create.estimatorText}</p>
        <BookingFlow t={t} locale={locale} mode="create" packages={createPkgs} {...bookingDates()} {...flowEnv()} />
      </Section>
    </>
  );
}
