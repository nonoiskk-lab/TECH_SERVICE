import type { Metadata, Viewport } from "next";
import { Cal_Sans, Golos_Text, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { isLegalGateOpen, siteUrl } from "@/config/site";
import { getDict } from "@/lib/locale";

const calSans = Cal_Sans({ variable: "--font-calsans", subsets: ["latin"], weight: "400", display: "swap" });
const golos = Golos_Text({ variable: "--font-golos", subsets: ["latin"], display: "swap" });
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

export const viewport: Viewport = { themeColor: "#f6f6f6", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDict();
  return (
    <html lang={locale === "hi" ? "hi-Latn" : "en-IN"} className={`${calSans.variable} ${golos.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh font-sans" data-gate={isLegalGateOpen() ? "open" : "closed"}>
        {children}
      </body>
    </html>
  );
}
