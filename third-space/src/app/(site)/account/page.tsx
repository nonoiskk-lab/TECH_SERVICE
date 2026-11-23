import type { Metadata } from "next";
import { balancesFor } from "@/server/credits";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/locale";
import { db } from "@/server/db";
import { currentCustomer } from "@/server/customer-auth";
import { customerLogoutAction } from "@/server/customer-actions";
import { formatINR } from "@/lib/pricing";
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
        <span className="rounded-full border border-line px-3 py-1 text-xs" data-status={b.status}>
          {statusLabel(b.status)}
        </span>
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
          </div>
          <aside className="space-y-4">
            {plans.map((p) => (
              <div key={p.id} className="ts-card p-5" data-testid="account-plan">
                <h2 className="text-lg">{a.plan}</h2>
                <p className="mt-1 text-sm text-muted">
                  {a.planLeft
                    .replace("{left}", String(Math.max(0, (planBalance.get(p.id) ?? 0) / 60).toFixed(1).replace(/\.0$/, "")))
                    .replace("{total}", String(p.hoursTotal))
                    .replace("{date}", p.validUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }))}
                </p>
              </div>
            ))}
            <div className="ts-card p-5">
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
    </>
  );
}
