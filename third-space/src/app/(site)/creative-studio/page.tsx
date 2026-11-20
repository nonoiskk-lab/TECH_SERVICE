import type { Metadata } from "next";
import Link from "next/link";
import { enquiryPurposes, isLegalGateOpen } from "@/config/site";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { bookingDates } from "@/lib/booking-dates";
import { flowEnv } from "@/lib/flow-env";
import { BulletList, PackageCard, PageHeader, Section } from "@/components/ui";
import { CreatorScene } from "@/components/illustrations";
import { BookingFlow } from "@/components/booking-flow";
import { EnquiryForm } from "@/components/enquiry-form";
import { currentCustomer } from "@/server/customer-auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.creative.metaTitle, description: t.creative.metaDescription, alternates: { canonical: "/creative-studio" } };
}

export default async function CreativeStudioPage() {
  const { t, locale } = await getDict();
  const c = t.creative;
  const shoot = packages.filter((p) => p.id === "creator-shoot");
  const me = await currentCustomer();
  const purposes = enquiryPurposes.filter((p) => !p.gated || isLegalGateOpen()).map((p) => ({ id: p.id, label: tl(p.label, locale) }));
  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} intro={c.intro} art={<CreatorScene className="h-full w-full" />} />
      <Section title={c.usesTitle} id="uses">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="ts-card p-6">
            <BulletList items={c.uses} />
            <Link href="/creator-plans" className="ts-btn ts-btn-text mt-4">
              {c.planCta} →
            </Link>
          </div>
          {shoot.map((p) => (
            <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref="#book" />
          ))}
        </div>
      </Section>
      <Section title={c.bookTitle} id="book" className="ts-band-light">
        <p className="mb-6 max-w-2xl text-muted">{c.bookText}</p>
        {shoot.length > 0 && (
          <BookingFlow
            t={t}
            locale={locale}
            mode="create"
            packages={shoot}
            prefill={me ? { name: me.name, phone: me.phone, email: me.email } : undefined}
            {...bookingDates()}
            {...flowEnv()}
          />
        )}
      </Section>
      <Section title={c.customTitle} id="custom">
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <p className="text-lg text-muted">{c.customText}</p>
          <EnquiryForm t={t} purposes={purposes} initialPurpose="creator" />
        </div>
      </Section>
    </>
  );
}
