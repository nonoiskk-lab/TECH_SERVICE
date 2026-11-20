import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/locale";
import { db } from "@/server/db";
import { FEEDBACK_STATUSES } from "@/lib/feedback";
import { PageHeader, Section } from "@/components/ui";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata: Metadata = { title: "Feedback | THIRD SPACE", robots: { index: false, follow: false } };

export default async function FeedbackPage({ params, searchParams }: PageProps<"/feedback/[id]">) {
  const { t } = await getDict();
  const l = t.feedback;
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const b = await db.booking.findUnique({ where: { id }, include: { feedback: true } });
  const valid = !!b && !!token && b.accessToken === token;
  let body: React.ReactNode;
  if (!valid) body = <p className="ts-card p-6" data-testid="feedback-invalid">{l.invalid}</p>;
  else if (sp.done === "1" || b.feedback)
    body = (
      <div className="ts-card space-y-4 p-6" data-testid="feedback-thanks">
        <p className="text-lg">{sp.done === "1" ? l.thanks : l.already}</p>
        <Link href="/book" className="ts-btn ts-btn-primary">
          {l.bookAgain}
        </Link>
      </div>
    );
  else if (!FEEDBACK_STATUSES.includes(b.status)) body = <p className="ts-card p-6" data-testid="feedback-not-yet">{l.notYet}</p>;
  else body = <FeedbackForm bookingId={b.id} token={token} l={l} />;
  return (
    <>
      <PageHeader title={l.title} intro={valid ? `${l.intro} · ${b.id}` : undefined} />
      <Section>
        <div className="mx-auto max-w-xl">{body}</div>
      </Section>
    </>
  );
}
