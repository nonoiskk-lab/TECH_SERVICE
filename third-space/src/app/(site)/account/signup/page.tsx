import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/locale";
import { PageHeader, Section } from "@/components/ui";
import { SignupForm } from "@/components/account-forms";
import { accountsEnabled, currentCustomer } from "@/server/customer-auth";

export const metadata: Metadata = { title: "Create account | THIRD SPACE", robots: { index: false }, alternates: { canonical: "/account/signup" } };

export default async function SignupPage({ searchParams }: PageProps<"/account/signup">) {
  const { t } = await getDict();
  const a = t.account;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/account";
  if (await currentCustomer()) redirect(next);
  return (
    <>
      <PageHeader title={a.signup} intro={a.signupIntro} />
      <Section>
        <div className="mx-auto max-w-md space-y-4">
          {accountsEnabled() ? <SignupForm l={a} next={next} /> : <p className="ts-card p-5">{a.disabled}</p>}
          <p className="text-center text-sm text-muted">
            {a.haveAccount}{" "}
            <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="font-semibold text-warm">
              {a.login}
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
