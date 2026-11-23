import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/ui";
import { ForgotForm } from "@/components/account-forms";
import { accountsEnabled } from "@/server/customer-auth";

export const metadata: Metadata = { title: "Forgot password | THIRD SPACE", robots: { index: false }, alternates: { canonical: "/account/forgot" } };

export default function ForgotPage() {
  return (
    <>
      <PageHeader title="Forgot password" intro="Enter your mobile number or email. If an account matches, we send a link to the email on file." />
      <Section>
        <div className="mx-auto max-w-md space-y-4">
          {accountsEnabled() ? <ForgotForm /> : <p className="ts-card p-5">Accounts are not enabled yet.</p>}
          <p className="text-center text-sm text-muted">
            <Link href="/account/login" className="font-semibold text-warm">
              Back to log in
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
