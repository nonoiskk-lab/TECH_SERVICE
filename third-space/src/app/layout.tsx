import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { isLegalGateOpen, siteUrl } from "@/config/site";
import { getDict } from "@/lib/locale";

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
  const { locale } = await getDict();
  return (
    <html lang={locale === "hi" ? "hi-Latn" : "en-IN"} className={`${montserrat.variable} ${inter.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh font-sans" data-gate={isLegalGateOpen() ? "open" : "closed"}>
        {children}
      </body>
    </html>
  );
}
