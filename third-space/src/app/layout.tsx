import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { isLegalGateOpen, siteUrl } from "@/config/site";
import { getDict } from "@/lib/locale";

// Display: a heavy, soft serif (Fraunces) for headlines; UI/body: a geometric sans (DM Sans). Both free (OFL).
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], weight: ["500", "600", "800", "900"], display: "optional" });
// "optional": body text never swaps late, so slow connections do not get a layout shift (the font is cached for the next page).
const inter = DM_Sans({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "700"], display: "optional" });
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

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDict();
  return (
    <html lang={locale === "hi" ? "hi-Latn" : "en-IN"} className={`${serif.variable} ${inter.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh font-sans" data-gate={isLegalGateOpen() ? "open" : "closed"}>
        {children}
      </body>
    </html>
  );
}
