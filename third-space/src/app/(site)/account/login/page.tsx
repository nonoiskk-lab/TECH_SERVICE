import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/locale";
import { PageHeader, Section } from "@/components/ui";
import { LoginForm } from "@/components/account-forms";
import { accountsEnabled, currentCustomer } from "@/server/customer-auth";

export const metadata: Metadata = { title: "Log in | THIRD SPACE", robots: { index: false }, alternates: { canonical: "/account/login" } };

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  const { t } = await getDict();
  const a = t.account;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/account";
  if (await currentCustomer()) redirect(next);
  return (
    <>
      <PageHeader title={a.login} intro={a.loginIntro} />
      <Section>
        <div className="mx-auto max-w-md space-y-4">
          {accountsEnabled() ? <LoginForm l={a} next={next} /> : <p className="ts-card p-5">{a.disabled}</p>}
          <p className="text-center text-sm text-muted">
            {a.noAccount}{" "}
            <Link href={`/account/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-warm">
              {a.signup}
            </Link>
          </p>
          <p className="text-center text-sm text-muted">
            <Link href="/my-booking" className="underline-offset-4 hover:underline">
              {t.nav.myBooking} (Booking ID)
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
