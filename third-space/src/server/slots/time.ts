/** IST helpers. India has no DST, so a fixed +05:30 offset is exact. */
const IST_OFFSET_MIN = 330;

export function istDateTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+05:30`);
}

export function toIstIso(d: Date): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 19) + "+05:30";
}

export function istToday(now = new Date()): string {
  return toIstIso(now).slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIstIso(d).slice(0, 10);
}

export function istTimeLabel(iso: string): string {
  const hh = Number(iso.slice(11, 13));
  const mm = iso.slice(14, 16);
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${mm} ${hh < 12 ? "AM" : "PM"}`;
}
