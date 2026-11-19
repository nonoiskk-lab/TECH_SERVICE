import type { Metadata } from "next";
import { bookablePackages, getPackage } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { bookingDates } from "@/lib/booking-dates";
import { otp } from "@/server/slots";
import { activeTitles } from "@/server/titles";
import { PageHeader, Section } from "@/components/ui";
import { BookingFlow } from "@/components/booking-flow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.book.metaTitle, description: t.book.metaDescription, alternates: { canonical: "/book" } };
}

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const { t, locale } = await getDict();
  const sp = await searchParams;
  const requested = typeof sp.package === "string" ? sp.package : undefined;
  const pkgs = bookablePackages().filter((p) => p.mode !== "visit");
  const initial = requested && pkgs.some((p) => p.id === requested) ? requested : undefined;
  return (
    <>
      <PageHeader title={t.book.title} />
      <Section>
        <BookingFlow
          key={initial ?? "all"}
          t={t}
          locale={locale}
          mode="any"
          packages={pkgs}
          initialPackageId={initial ?? (getPackage("podcast") ? "podcast" : undefined)}
          titles={await activeTitles()}
          {...bookingDates()}
          otpIsMock={otp.isMock}
        />
      </Section>
    </>
  );
}
