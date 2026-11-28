import type { PublicBusiness } from "@/lib/business";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped so it cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function localBusinessLd(biz: PublicBusiness) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${biz.url}/#business`,
    name: biz.name,
    url: biz.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: biz.address,
      addressLocality: "Dhanbad",
      addressRegion: "Jharkhand",
      addressCountry: "IN",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: biz.open,
        closes: biz.close,
      },
    ],
  };
  if (biz.phone) ld.telephone = biz.phone;
  if (biz.email) ld.email = biz.email;
  if (biz.mapUrl) ld.hasMap = biz.mapUrl;
  return ld;
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}
