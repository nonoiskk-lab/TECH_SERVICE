import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 220, color: { dark: "#0f172a", light: "#ffffff" } });
}

export function statusUrlFor(publicToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/status/${publicToken}`;
}
