import { toIstIso } from "@/server/slots/time";

/** The three lanes of the staff day calendar, one per mode colour (theatre ember, podcast amber, studio teal). */
export type Lane = "theatre" | "podcast" | "studio";
export const LANES: Lane[] = ["theatre", "podcast", "studio"];

/**
 * Which lane a booking belongs to.
 *  - everything in the private room (cinema, family, celebrations) is Theatre;
 *  - in the studio room, creator content (shoots, the Creator Plan) is Studio and everything else (podcast, tours) is Podcast.
 */
export function laneOf(packageId: string, resource: string): Lane {
  if (resource === "room") return "theatre";
  return packageId.startsWith("creator") ? "studio" : "podcast";
}

/** Minutes since midnight, India time, for a UTC instant. */
export function istMinutes(d: Date): number {
  const iso = toIstIso(d);
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

/**
 * Vertical placement of a booking block on a day that runs from `openMin` to `closeMin` (minutes since midnight).
 * One minute is one unit; blocks are clipped to the opening hours and never shorter than `minHeight` (so a short
 * session stays readable and tappable). Returns null when the booking is entirely outside the shown hours.
 */
export function blockGeometry(start: Date, end: Date, openMin: number, closeMin: number, minHeight = 30): { top: number; height: number } | null {
  const s = Math.max(istMinutes(start), openMin);
  // A booking that ends after midnight (00:00 reads as 0) counts as ending at the close of the day.
  const rawEnd = istMinutes(end);
  const e = Math.min(rawEnd === 0 || rawEnd < istMinutes(start) ? closeMin : rawEnd, closeMin);
  if (e <= openMin || s >= closeMin || e <= s) return null;
  return { top: s - openMin, height: Math.max(e - s, minHeight) };
}
