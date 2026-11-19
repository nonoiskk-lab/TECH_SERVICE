import Link from "next/link";
import type { Booking } from "@prisma/client";
import { getPackage } from "@/config/packages";
import { formatINR } from "@/lib/pricing";
import { fmtDateTime, Status } from "./ui";

export function BookingTable({ rows, empty = "No bookings." }: { rows: Booking[]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line/60" data-testid="booking-rows">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/bookings/${b.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-3 hover:bg-raised">
            <span className="flex flex-col">
              <span className="font-semibold">
                {fmtDateTime(b.start)} · {getPackage(b.packageId)?.name.en ?? b.packageId}
              </span>
              <span className="text-sm text-muted">
                {b.id} · {b.guestName} · {b.guestCount} guest{b.guestCount > 1 ? "s" : ""}
              </span>
            </span>
            <span className="flex items-center gap-3 text-sm">
              {b.balanceDue > 0 && !b.balancePaidAt && !["cancelled", "stopped"].includes(b.status) && <span className="text-warm">Due {formatINR(b.balanceDue)}</span>}
              <Status value={b.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
