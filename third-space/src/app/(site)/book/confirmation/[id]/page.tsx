import type { Metadata } from "next";
import Link from "next/link";
import { getPackage } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { getBookingForGuest } from "@/server/slots";
import { formatINR } from "@/lib/pricing";
import { istTimeLabel, toIstIso } from "@/server/slots/time";
import { PageHeader, Section } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.confirmation.metaTitle, robots: { index: false, follow: false } };
}

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/book/confirmation/[id]">) {
  const { t, locale } = await getDict();
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const b = await getBookingForGuest(id, token);
  if (!b) {
    return (
      <Section>
        <p className="ts-card p-6" data-testid="booking-not-found">
          {t.confirmation.notFound}
        </p>
      </Section>
    );
  }
  const pkg = getPackage(b.packageId);
  const day = new Date(b.start).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <>
      <PageHeader title={t.confirmation.title} />
      <Section>
        <div className="ts-card ts-glow max-w-xl p-6">
          <p className="text-sm text-muted">{t.confirmation.idLabel}</p>
          <p className="font-heading text-3xl font-extrabold tracking-wider text-warm" data-testid="booking-id">
            {b.id}
          </p>
          <p className="mt-2 text-sm text-muted">{t.confirmation.sentTo}</p>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.confirmation.package}</dt>
              <dd>
                {pkg ? tl(pkg.name, locale) : b.packageId}
                {b.titleName ? ` · ${b.titleName}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.confirmation.when}</dt>
              <dd>
                {day}, {istTimeLabel(toIstIso(b.start))}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.confirmation.guests}</dt>
              <dd>{b.guestCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.confirmation.paid}</dt>
              <dd>{formatINR(b.advancePaid)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.confirmation.due}</dt>
              <dd>{formatINR(b.balanceDue)}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm">{t.confirmation.bringId}</p>
          {b.acceptance && (
            <div className="mt-6 rounded-xl border border-line p-4 text-sm" data-testid="acceptance-summary">
              <p className="font-semibold">{t.confirmation.acceptedTitle}</p>
              <p className="mt-1 text-muted">
                {t.confirmation.acceptedText.replace("{version}", b.acceptance.policyPackVersion)}
              </p>
              <a
                href={`/book/confirmation/${b.id}/declaration?t=${token}`}
                className="ts-btn ts-btn-ghost mt-3 text-sm"
                data-testid="download-declaration"
                download
              >
                {t.confirmation.download}
              </a>
            </div>
          )}
          <Link href="/" className="ts-btn ts-btn-ghost mt-6">
            {t.confirmation.home}
          </Link>
        </div>
      </Section>
    </>
  );
}
