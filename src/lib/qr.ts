import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 220, color: { dark: "#0f172a", light: "#ffffff" } });
}

export function statusUrlFor(publicToken: string) {
  // Prefer an explicit public URL; fall back to Vercel's own runtime env var
  // (no NEXT_PUBLIC_ prefix needed since this only ever runs server-side)
  // so a Vercel deployment gets a correct link without extra configuration.
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}/status/${publicToken}`;
}
