import type { Metadata } from "next";
import { balancesFor } from "@/server/credits";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/locale";
import { db } from "@/server/db";
import { currentCustomer } from "@/server/customer-auth";
import { customerLogoutAction } from "@/server/customer-actions";
import { formatINR } from "@/lib/pricing";
import { StatusBadge } from "@/components/status-badge";
import { TabBar } from "@/components/tab-bar";
import { PageHeader, Section } from "@/components/ui";
import { ProfileForm } from "@/components/account-forms";

export const metadata: Metadata = { title: "My account | THIRD SPACE", robots: { index: false } };

const when = (d: Date) =>
  d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const UPCOMING = ["pending_payment", "confirmed", "checked_in", "in_progress"];
function splitBookings<T extends { status: string; end: Date }>(rows: T[], now = Date.now()) {
  const upcoming = rows.filter((b) => UPCOMING.includes(b.status) && b.end.getTime() > now).reverse();
  return { upcoming, past: rows.filter((b) => !upcoming.includes(b)) };
}

/** Customer dashboard: booking history, creator plan hours and profile. */
export default async function AccountPage() {
  const { t } = await getDict();
  const a = t.account;
  const c = await currentCustomer();
  if (!c) redirect("/account/login");
  const [bookings, plans] = await Promise.all([
    db.booking.findMany({ where: { OR: [{ customerId: c.id }, { guestPhone: c.phone }] }, orderBy: { start: "desc" }, take: 100 }),
    db.creatorMembership.findMany({ where: { customerId: c.id, status: "active" }, orderBy: { validUntil: "desc" } }),
  ]);
  const planBalance = await balancesFor(plans.map((p) => p.id));
  const ids = bookings.map((b) => b.id);
  const [payments, messages] = await Promise.all([
    db.payment.findMany({ where: { bookingId: { in: ids }, OR: [{ status: "captured" }, { kind: "refund" }] }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.notification.findMany({ where: { bookingId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const dayLabel = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const { upcoming, past } = splitBookings(bookings);
  const statusLabel = (s: string) => t.myBooking.statusLabels[s as keyof typeof t.myBooking.statusLabels] ?? s;
  const Row = ({ b }: { b: (typeof bookings)[number] }) => (
    <li className="ts-card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="account-booking">
      <div>
        <p className="font-heading text-lg text-warm">{b.id}</p>
        <p className="text-sm">{b.packageName || b.packageId}</p>
        <p className="text-sm text-muted">
          {when(b.start)} · {formatINR(b.total)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={b.status} label={statusLabel(b.status)} />
        <Link href={`/my-booking/${b.id}?t=${b.accessToken}`} className="ts-btn ts-btn-ghost text-sm">
          {a.manage}
        </Link>
      </div>
    </li>
  );
  return (
    <>
      <PageHeader eyebrow={a.title} title={a.welcome.replace("{name}", c.name.split(" ")[0])} />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-2xl">{a.upcoming}</h2>
                <Link href="/book" className="ts-btn ts-btn-primary text-sm">
                  {a.bookNow}
                </Link>
              </div>
              <ul className="space-y-3" data-testid="account-upcoming">
                {upcoming.map((b) => (
                  <Row key={b.id} b={b} />
                ))}
                {upcoming.length === 0 && <li className="text-muted">{a.none}</li>}
              </ul>
            </div>
            {past.length > 0 && (
              <div>
                <h2 className="mb-3 text-2xl">{a.past}</h2>
                <ul className="space-y-3">
                  {past.map((b) => (
                    <Row key={b.id} b={b} />
                  ))}
                </ul>
              </div>
            )}
            <div data-testid="account-payments">
              <h2 className="mb-3 text-2xl">{a.payments}</h2>
              <ul className="space-y-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="ts-card flex flex-wrap items-center justify-between gap-2 p-3" data-testid="account-payment">
                    <span>
                      {dayLabel(p.createdAt)} · {p.bookingId} · {p.kind === "refund" ? a.refundLabel : a.paidLabel}
                      {p.kind === "refund" && p.status === "pending" ? ` (${a.refundPending})` : ""}
                    </span>
                    <strong>
                      {p.kind === "refund" ? "−" : ""}
                      {formatINR(p.amount)}
                    </strong>
                  </li>
                ))}
                {payments.length === 0 && <li className="text-muted">{a.paymentsNone}</li>}
              </ul>
            </div>
            <div data-testid="account-messages">
              <h2 className="mb-3 text-2xl">{a.messages}</h2>
              <ul className="space-y-2 text-sm">
                {messages.map((m) => (
                  <li key={m.id} className="ts-card flex flex-wrap items-center justify-between gap-2 p-3" data-testid="account-message">
                    <span>
                      {dayLabel(m.createdAt)} · {(a as Record<string, string>)[`mk_${m.kind}`] ?? m.kind} · {m.bookingId}
                    </span>
                    <span className="text-muted">{m.status === "sent" ? a.msgSent : a.msgWaiting}</span>
                  </li>
                ))}
                {messages.length === 0 && <li className="text-muted">{a.messagesNone}</li>}
              </ul>
            </div>
          </div>
          <aside className="space-y-4">
            {plans.map((p) => (
              <div key={p.id} className="ts-card p-5" data-testid="account-plan">
                <h2 className="t-h3">{a.plan}</h2>
                {(() => {
                  const left = Math.max(0, (planBalance.get(p.id) ?? 0) / 60);
                  const used = Math.max(0, p.hoursTotal - left);
                  const pct = Math.min(100, Math.round((used / p.hoursTotal) * 100));
                  return (
                    <div className="mt-3" data-testid="plan-usage">
                      <p className="t-body-m">
                        <strong>{Number(used.toFixed(1))}</strong> / {p.hoursTotal} {t.common.hours} {a.planUsed}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={p.hoursTotal} aria-valuenow={Number(used.toFixed(1))} aria-label={a.plan}>
                        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
                <p className="mt-1 text-sm text-muted">
                  {a.planLeft
                    .replace("{left}", String(Math.max(0, (planBalance.get(p.id) ?? 0) / 60).toFixed(1).replace(/\.0$/, "")))
                    .replace("{total}", String(p.hoursTotal))
                    .replace("{date}", p.validUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }))}
                </p>
              </div>
            ))}
            <div className="ts-card p-5" id="profile">
              <h2 className="mb-3 text-lg">{a.profile}</h2>
              <p className="mb-3 text-sm text-muted">
                {a.phone}: {c.phone}
              </p>
              <ProfileForm l={a} name={c.name} email={c.email} marketing={c.marketingConsent} />
            </div>
            <form action={customerLogoutAction}>
              <button className="ts-btn ts-btn-ghost w-full" data-testid="account-logout">
                {a.logout}
              </button>
            </form>
          </aside>
        </div>
      </Section>
      <TabBar current="bookings" labels={{ home: a.tabHome, bookings: a.tabBookings, profile: a.tabProfile, nav: a.tabNav }} />
    </>
  );
}
