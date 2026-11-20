import type { Metadata } from "next";
import { getDict } from "@/lib/locale";
import { PageHeader, Section } from "@/components/ui";
import { FindBookingForm } from "@/components/guest-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.myBooking.metaTitle, robots: { index: false, follow: true } };
}

export default async function MyBookingPage() {
  const { t } = await getDict();
  const m = t.myBooking;
  return (
    <>
      <PageHeader title={m.title} intro={m.intro} />
      <Section>
        <div className="max-w-md">
          <FindBookingForm labels={{ id: m.id, phone: m.phone, email: m.email, submit: m.find }} />
        </div>
      </Section>
    </>
  );
}
