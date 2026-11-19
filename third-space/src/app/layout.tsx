import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { isLegalGateOpen, siteUrl } from "@/config/site";
import { fromPrice } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { publicBusiness, whatsappHref } from "@/lib/business";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StickyBookBar, WhatsAppButton } from "@/components/floating";
import { FirstTouch, HideOn } from "@/components/client-bits";
import { JsonLd, localBusinessLd } from "@/components/json-ld";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["700", "800"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.home.metaTitle, template: "%s" },
    description: t.home.metaDescription,
    openGraph: { siteName: "THIRD SPACE", locale: "en_IN", type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#0d0a08", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getDict();
  const gateOpen = isLegalGateOpen();
  const biz = publicBusiness(locale);
  return (
    <html lang={locale === "hi" ? "hi-Latn" : "en-IN"} className={`${montserrat.variable} ${inter.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh font-sans" data-gate={gateOpen ? "open" : "closed"}>
        <FirstTouch />
        <JsonLd data={localBusinessLd(biz)} />
        <SiteHeader t={t} locale={locale} />
        <main id="main">{children}</main>
        <SiteFooter t={t} biz={biz} gateOpen={gateOpen} />
        <WhatsAppButton href={whatsappHref(biz.whatsapp, t.whatsappPrefill)} label={t.common.whatsapp} />
        <HideOn prefixes={["/book"]}>
          <StickyBookBar t={t} fromPrice={fromPrice(gateOpen)} />
        </HideOn>
      </body>
    </html>
  );
}
