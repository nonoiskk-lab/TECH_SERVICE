import type { Metadata } from "next";
import { enquiryPurposes, isLegalGateOpen } from "@/config/site";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { publicBusiness, telHref, whatsappHref } from "@/lib/business";
import { PageHeader, Section } from "@/components/ui";
import { EnquiryForm } from "@/components/enquiry-form";
import { TrackedAnchor } from "@/components/client-bits";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.contact.metaTitle, description: t.contact.metaDescription, alternates: { canonical: "/contact" } };
}

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { t, locale } = await getDict();
  const sp = await searchParams;
  const biz = publicBusiness(locale);
  const open = isLegalGateOpen();
  const purposes = enquiryPurposes.filter((p) => open || !p.gated).map((p) => ({ id: p.id, label: tl(p.label, locale) }));
  const wa = whatsappHref(biz.whatsapp, t.whatsappPrefill);
  const tel = telHref(biz.phone);
  return (
    <>
      <PageHeader title={t.contact.title} intro={t.contact.intro} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <EnquiryForm t={t} purposes={purposes} initialPurpose={typeof sp.purpose === "string" ? sp.purpose : undefined} />
          <div className="space-y-4">
            <div className="ts-card space-y-3 p-5">
              <h2 className="text-xl font-bold">{t.contact.mapTitle}</h2>
              <p>
                <span className="text-faint">{t.common.address}: </span>
                <span data-consistency="address">{biz.address}</span>
              </p>
              <p>
                <span className="text-faint">{t.common.hours_label}: </span>
                <span data-consistency="hours">{biz.hoursLabel}</span>
              </p>
              {tel && (
                <p>
                  <span className="text-faint">{t.common.call}: </span>
                  <a href={tel} className="underline underline-offset-4" data-consistency="phone">
                    {biz.phone}
                  </a>
                </p>
              )}
              {biz.email && (
                <p>
                  <span className="text-faint">{t.common.email}: </span>
                  <a href={`mailto:${biz.email}`} className="underline underline-offset-4" data-consistency="email">
                    {biz.email}
                  </a>
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                {wa && (
                  <TrackedAnchor event="whatsapp_click" props={{ placement: "contact" }} href={wa} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn-primary">
                    {t.common.whatsapp}
                  </TrackedAnchor>
                )}
                {biz.mapUrl && (
                  <a href={biz.mapUrl} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn-ghost">
                    {t.common.openMap}
                  </a>
                )}
              </div>
            </div>
            {biz.mapUrl && (
              <iframe
                title={t.contact.mapTitle}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(biz.address)}&output=embed`}
                className="aspect-video w-full rounded-2xl border border-line"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
