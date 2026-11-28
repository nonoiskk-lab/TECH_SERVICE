import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { isLegalGateOpen, siteUrl } from "@/config/site";
import { getDict } from "@/lib/locale";

// One family for everything (the design file: Poppins with Devanagari support, free under the OFL).
// "optional": the font never swaps in late, so slow connections get no layout shift (it is cached for the next page).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
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
    <html lang={locale === "hi" ? "hi-Latn" : "en-IN"} className={poppins.variable}>
      <body className="min-h-dvh font-sans" data-gate={isLegalGateOpen() ? "open" : "closed"}>
        {children}
      </body>
    </html>
  );
}
