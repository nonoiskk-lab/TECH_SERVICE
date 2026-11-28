import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { ResetForm } from "@/components/account-forms";
import { accountsEnabled } from "@/server/customer-auth";

export const metadata: Metadata = { title: "Choose a new password | THIRD SPACE", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPage({ params }: PageProps<"/account/reset/[token]">) {
  const { token } = await params;
  return (
    <>
      <PageHeader title="Choose a new password" intro="This link works once and for 30 minutes." />
      <Section>
        <div className="mx-auto max-w-md">{accountsEnabled() ? <ResetForm token={token} /> : <p className="ts-card p-5">Accounts are not enabled yet.</p>}</div>
      </Section>
    </>
  );
}
