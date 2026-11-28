import { ImageResponse } from "next/og";

// Share image for WhatsApp, Instagram, Facebook and Google (1200x630). Original layout: orange and white,
// the doorway mark and the brand line. Replace with a real venue photo plate once the shoot is done (docs/IMAGE_ASSET_PLAN.md).
export const alt = "THIRD SPACE: Private Theatre and Creator Studio in Dhanbad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFFFFF", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 72px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="96" height="96" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="30" fill="#FF7A1A" />
              <path d="M20 50V30a12 12 0 0 1 24 0v20z" fill="#1C1410" />
              <path d="M26 50V32a6 6 0 0 1 12 0v18z" fill="#FFFFFF" />
              <circle cx="35" cy="41" r="1.6" fill="#FF7A1A" />
            </svg>
            <div style={{ display: "flex", marginLeft: 24, fontSize: 52, fontWeight: 700, letterSpacing: 4, color: "#1C1410" }}>
              THIRD<span style={{ color: "#A84300", marginLeft: 14 }}>SPACE</span>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 48, fontSize: 64, fontWeight: 700, lineHeight: 1.1, color: "#1C1410" }}>
            Private Theatre &amp; Creator Studio
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#6A5646" }}>Your Voice. Your Space. Your Story.</div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 28, fontWeight: 600, color: "#1C1410" }}>Dhanbad, Jharkhand</div>
        </div>
        <div style={{ display: "flex", width: 330, background: "#A63500", alignItems: "center", justifyContent: "center" }}>
          <svg width="240" height="240" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="#FF7A1A" />
            <path d="M20 50V30a12 12 0 0 1 24 0v20z" fill="#1C1410" />
            <path d="M26 50V32a6 6 0 0 1 12 0v18z" fill="#FFFFFF" />
            <circle cx="35" cy="41" r="1.6" fill="#FF7A1A" />
          </svg>
        </div>
      </div>
    ),
    { ...size },
  );
}
