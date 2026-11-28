import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/locale";
import { getBookingForGuest } from "@/server/slots";
import { PageHeader, Section } from "@/components/ui";
import { BookingReceipt } from "@/components/booking-receipt";
import { CancelBookingForm } from "@/components/guest-forms";
import { PrintButton } from "@/components/client-bits";
import { formatINR } from "@/lib/pricing";
import { RescheduleForm } from "@/components/reschedule-form";
import { guestRescheduleBlock } from "@/server/reschedule";
import { bookingDates } from "@/lib/booking-dates";
import { booking as rules } from "@/config/site";
import { ensureCatalog } from "@/server/catalog";
import { bookablePackage } from "@/lib/api";

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
  await ensureCatalog();
  const canMove = !guestRescheduleBlock(b) && !!bookablePackage(b.packageId);
  const { minDate, maxDate } = bookingDates();
  return (
    <>
      <PageHeader title={m.title} />
      <Section>
        {sp.moved === "1" && (
          <p role="status" className="ts-card mb-5 p-4 text-sm" data-testid="moved-done">
            {m.movedDone}
          </p>
        )}
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
              {!canMove && <p className="text-sm text-muted">{m.reschedule}</p>}
            </div>
            {canMove && (
              <div className="ts-card p-5" data-testid="reschedule-card">
                <h2 className="text-lg">{m.rescheduleTitle}</h2>
                <p className="mt-1 text-sm text-muted">
                  {m.rescheduleInfo.replace("{hours}", String(rules.rescheduleMinHours)).replace("{times}", String(rules.rescheduleMaxTimes))}
                </p>
                <div className="mt-3">
                  <RescheduleForm
                    bookingId={b.id}
                    token={token}
                    packageId={b.packageId}
                    duration={Math.round((b.end.getTime() - b.start.getTime()) / 60_000)}
                    minDate={minDate}
                    maxDate={maxDate}
                    labels={{ date: m.rescheduleDate, pick: m.reschedulePick, none: m.rescheduleNone, submit: m.rescheduleSubmit, loading: m.loading }}
                  />
                </div>
              </div>
            )}
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
