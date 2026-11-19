import { sessionRules, type L, type Package } from "@/config/site";

/**
 * Decides session length and base price automatically from what the guest
 * wants to do. Runs in the browser (live estimate) and on the server (the
 * number that is charged), so both always agree.
 */
export type SessionInput = {
  titleId?: string;
  episodeMinutes?: number;
  episodes?: number;
  reels?: number;
  longVideos?: number;
  hours?: number;
};

/** A licensed title the room can play (from the admin's catalogue). */
export type TitleInfo = { id: string; name: string; runtimeMinutes: number; language: string };

export type Session = { durationMinutes: number; basePrice: number; label: L };
export type SessionResult = { ok: true; session: Session } | { ok: false; reason: "NEED_TITLE" | "NEED_WORK" | "TOO_LONG" | "BAD_INPUT" };

const R = sessionRules;
const roundUp = (m: number) => Math.ceil(m / R.roundToMinutes) * R.roundToMinutes;
const priceFor = (rate: number, minutes: number) => Math.round((rate * minutes) / 60);
const int = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

export function durationText(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
}

export function defaultInput(pkg: Package): SessionInput {
  switch (pkg.pricing.kind) {
    case "podcast":
      return { episodeMinutes: 60, episodes: 1 };
    case "creator":
      return { reels: 3, longVideos: 0 };
    case "hourly":
      return { hours: R.space.minHours };
    default:
      return {};
  }
}

export function resolveSession(pkg: Package, input: SessionInput, titles: TitleInfo[] = []): SessionResult {
  const p = pkg.pricing;
  let minutes: number;
  let label: L;
  let price: number;
  switch (p.kind) {
    case "fixed":
      return { ok: true, session: { durationMinutes: pkg.durationMinutes, basePrice: pkg.price, label: pkg.name } };
    case "title": {
      const title = titles.find((t) => t.id === input.titleId);
      if (!title) return { ok: false, reason: "NEED_TITLE" };
      minutes = roundUp(title.runtimeMinutes + R.theatre.setupMinutes);
      price = priceFor(p.ratePerHour, minutes);
      label = { en: `${pkg.name.en}: ${title.name} · ${durationText(minutes)}`, hi: `${pkg.name.hi}: ${title.name} · ${durationText(minutes)}` };
      break;
    }
    case "podcast": {
      const len = R.podcast.episodeLengths.includes(input.episodeMinutes ?? -1) ? input.episodeMinutes! : null;
      const n = int(input.episodes, 1, R.podcast.maxEpisodes);
      if (!len || !n) return { ok: false, reason: "BAD_INPUT" };
      minutes = Math.max(R.podcast.minMinutes, roundUp(len * n + R.podcast.setupMinutes));
      price = priceFor(p.ratePerHour, minutes);
      label = {
        en: `${pkg.name.en} · ${n} × ${len} min + setup · ${durationText(minutes)}`,
        hi: `${pkg.name.hi} · ${n} × ${len} min + setup · ${durationText(minutes)}`,
      };
      break;
    }
    case "creator": {
      const reels = int(input.reels, 0, R.creator.maxReels);
      const longs = int(input.longVideos, 0, R.creator.maxLongVideos);
      if (reels === null || longs === null) return { ok: false, reason: "BAD_INPUT" };
      if (reels + longs === 0) return { ok: false, reason: "NEED_WORK" };
      minutes = Math.max(R.creator.minMinutes, roundUp(reels * R.creator.reelMinutes + longs * R.creator.longVideoMinutes + R.creator.setupMinutes));
      price = priceFor(p.ratePerHour, minutes);
      label = {
        en: `${pkg.name.en} · ${reels} reels, ${longs} videos + setup · ${durationText(minutes)}`,
        hi: `${pkg.name.hi} · ${reels} reels, ${longs} videos + setup · ${durationText(minutes)}`,
      };
      break;
    }
    case "hourly": {
      const h = int(input.hours, R.space.minHours, R.space.maxHours);
      if (!h) return { ok: false, reason: "BAD_INPUT" };
      minutes = h * 60;
      price = p.ratePerHour * h;
      label = { en: `${pkg.name.en} · ${h} × ₹${p.ratePerHour}/hr`, hi: `${pkg.name.hi} · ${h} × ₹${p.ratePerHour}/ghanta` };
      break;
    }
  }
  if (minutes > R.maxSessionMinutes) return { ok: false, reason: "TOO_LONG" };
  return { ok: true, session: { durationMinutes: minutes, basePrice: price, label } };
}

/** Session lengths the slot engine accepts for a package (before the exact check at checkout). */
export function allowedDuration(pkg: Package, minutes: number): boolean {
  if (pkg.pricing.kind === "fixed") return minutes === pkg.durationMinutes;
  if (pkg.pricing.kind === "hourly") return minutes % 60 === 0 && minutes >= R.space.minHours * 60 && minutes <= R.space.maxHours * 60;
  return minutes % R.roundToMinutes === 0 && minutes >= R.roundToMinutes && minutes <= R.maxSessionMinutes;
}

/** Cheapest possible booking of a package; null when it depends on a title. */
export function minimumPrice(pkg: Package): number | null {
  const p = pkg.pricing;
  switch (p.kind) {
    case "fixed":
      return pkg.price;
    case "hourly":
      return p.ratePerHour * R.space.minHours;
    case "podcast":
      return priceFor(p.ratePerHour, R.podcast.minMinutes);
    case "creator":
      return priceFor(p.ratePerHour, R.creator.minMinutes);
    case "title":
      return null;
  }
}

/** Rate for display: "₹850/hr" style packages return the hourly rate. */
export function hourlyRate(pkg: Package): number | null {
  return pkg.pricing.kind === "fixed" ? null : pkg.pricing.ratePerHour;
}
