import QRCode from "qrcode";

/**
 * Check-in QR for a confirmed booking. It encodes only the staff link for the booking
 * (`/staff/<booking id>`), which asks for a staff login, so scanning it as a guest reveals nothing.
 * Drawn as an SVG path from the QR matrix (no HTML injection). Dark modules on a light quiet zone,
 * because scanners need that polarity even in the dark theme.
 */
export function TicketQr({ value, label }: { value: string; label: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2;
  const cells: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) cells.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
    }
  }
  const size = n + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      className="h-44 w-44 rounded-xl bg-[#fbf6ee]"
      shapeRendering="crispEdges"
      data-testid="ticket-qr"
    >
      <path d={cells.join("")} fill="#100d0b" />
    </svg>
  );
}
