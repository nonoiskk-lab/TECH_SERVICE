import type { Metadata } from "next";
import Link from "next/link";
import { themes } from "@/config/site";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { bookingDates } from "@/lib/booking-dates";
import { flowEnv } from "@/lib/flow-env";
import { PageHeader, Section } from "@/components/ui";
import { CelebrationScene } from "@/components/illustrations";
import { BookingFlow } from "@/components/booking-flow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.celebrate.metaTitle, description: t.celebrate.metaDescription, alternates: { canonical: "/celebrations" } };
}

export default async function CelebratePage() {
  const { t, locale } = await getDict();
  const celebrationPkgs = packages.filter((p) => p.mode === "celebrate");
  return (
    <>
      <PageHeader title={t.celebrate.title} intro={t.celebrate.intro} art={<CelebrationScene className="h-full w-full" />} />
      <Section title={t.celebrate.themeTitle} id="themes">
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((th) => (
            <div key={th.id} className="ts-card p-5">
              <h3 className="font-bold">{tl(th.name, locale)}</h3>
              <p className="mt-1 text-sm text-muted">{tl(th.description, locale)}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t.celebrate.builderTitle} id="builder">
        <BookingFlow t={t} locale={locale} mode="celebrate" packages={celebrationPkgs} themes={themes} {...bookingDates()} {...flowEnv()} />
      </Section>
      <Section id="quote">
        <div className="ts-card ts-glow p-6">
          <h2 className="text-2xl font-bold">{t.celebrate.quoteTitle}</h2>
          <p className="mt-2 text-muted">{t.celebrate.quoteText}</p>
          <Link href="/contact?purpose=custom-decor" className="ts-btn ts-btn-primary mt-4">
            {t.celebrate.quoteCta}
          </Link>
        </div>
      </Section>
    </>
  );
}
