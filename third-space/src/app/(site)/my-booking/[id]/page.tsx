import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/locale";
import { getBookingForGuest } from "@/server/slots";
import { PageHeader, Section } from "@/components/ui";
import { BookingReceipt } from "@/components/booking-receipt";
import { CancelBookingForm } from "@/components/guest-forms";
import { PrintButton } from "@/components/client-bits";
import { formatINR } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.myBooking.metaTitle, robots: { index: false, follow: false } };
}

export default async function ManageBooking({ params, searchParams }: PageProps<"/my-booking/[id]">) {
  const { t, locale } = await getDict();
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const b = await getBookingForGuest(id, token);
  const m = t.myBooking;
  if (!b) {
    return (
      <Section>
        <p className="ts-card p-6" data-testid="booking-not-found">
          {t.confirmation.notFound}{" "}
          <Link href="/my-booking" className="text-warm underline">
            {m.find}
          </Link>
        </p>
      </Section>
    );
  }
  const canCancel = ["confirmed", "pending_payment"].includes(b.status) && b.start > new Date();
  return (
    <>
      <PageHeader title={m.title} />
      <Section>
        {typeof sp.cancelled === "string" && (
          <p role="status" className="ts-card mb-5 p-4 text-sm" data-testid="cancel-done">
            {m.cancelDone}{" "}
            {Number(sp.cancelled) > 0 && m.refundDone.replace("{amount}", formatINR(Number(sp.cancelled)))}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <BookingReceipt b={b} t={t} locale={locale} token={token} />
          <div className="space-y-4">
            <div className="ts-card space-y-3 p-5">
              <PrintButton label={m.print} />
              <a href={`/book/confirmation/${b.id}/declaration?t=${token}`} className="ts-btn ts-btn-ghost w-full text-sm" download>
                {t.confirmation.download}
              </a>
              <p className="text-sm text-muted">{m.reschedule}</p>
            </div>
            {canCancel && (
              <div className="ts-card p-5">
                <h2 className="text-lg">{m.cancelTitle}</h2>
                <p className="mt-1 text-sm text-muted">{m.cancelInfo}</p>
                <div className="mt-3">
                  <CancelBookingForm bookingId={b.id} token={token} labels={{ confirm: m.cancelConfirm, submit: m.cancelSubmit }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
