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

/**
 * workMinutes: the movie / recording / shoot itself; setupMinutes: added on
 * top; durationMinutes: what is booked and billed. The 30-minute gap after
 * each booking (hours.bufferMinutes) is kept free by the slot engine and is
 * not billed.
 */
export type Session = { workMinutes: number; setupMinutes: number; durationMinutes: number; basePrice: number; label: L };
export type SessionResult = { ok: true; session: Session } | { ok: false; reason: "NEED_TITLE" | "NEED_WORK" | "TOO_LONG" | "BAD_INPUT" };

const R = sessionRules;
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
  let work: number;
  let setup = R.setupMinutes;
  let what: string;
  switch (p.kind) {
    case "fixed":
      return { ok: true, session: { workMinutes: pkg.durationMinutes, setupMinutes: 0, durationMinutes: pkg.durationMinutes, basePrice: pkg.price, label: pkg.name } };
    case "title": {
      const title = titles.find((t) => t.id === input.titleId);
      if (!title) return { ok: false, reason: "NEED_TITLE" };
      work = title.runtimeMinutes;
      what = title.name;
      break;
    }
    case "podcast": {
      const len = R.podcast.episodeLengths.includes(input.episodeMinutes ?? -1) ? input.episodeMinutes! : null;
      const n = int(input.episodes, 1, R.podcast.maxEpisodes);
      if (!len || !n) return { ok: false, reason: "BAD_INPUT" };
      work = len * n;
      what = `${n} × ${len} min`;
      break;
    }
    case "creator": {
      const reels = int(input.reels, 0, R.creator.maxReels);
      const longs = int(input.longVideos, 0, R.creator.maxLongVideos);
      if (reels === null || longs === null) return { ok: false, reason: "BAD_INPUT" };
      if (reels + longs === 0) return { ok: false, reason: "NEED_WORK" };
      work = reels * R.creator.reelMinutes + longs * R.creator.longVideoMinutes;
      what = `${reels} reels, ${longs} videos`;
      break;
    }
    case "hourly": {
      const h = int(input.hours, R.space.minHours, R.space.maxHours);
      if (!h) return { ok: false, reason: "BAD_INPUT" };
      work = h * 60;
      setup = 0;
      what = `${h} × ₹${p.ratePerHour}`;
      break;
    }
  }
  const minutes = work + setup;
  if (minutes > R.maxSessionMinutes) return { ok: false, reason: "TOO_LONG" };
  const price = p.kind === "hourly" ? p.ratePerHour * (work / 60) : priceFor(p.ratePerHour, minutes);
  const tail = setup ? ` + ${setup}m setup = ${durationText(minutes)}` : ` = ${durationText(minutes)}`;
  return {
    ok: true,
    session: {
      workMinutes: work,
      setupMinutes: setup,
      durationMinutes: minutes,
      basePrice: price,
      label: { en: `${pkg.name.en}: ${what}${tail}`, hi: `${pkg.name.hi}: ${what}${tail}` },
    },
  };
}

/** Session lengths the slot engine accepts for a package (the exact check happens at checkout). */
export function allowedDuration(pkg: Package, minutes: number): boolean {
  if (!Number.isInteger(minutes)) return false;
  if (pkg.pricing.kind === "fixed") return minutes === pkg.durationMinutes;
  if (pkg.pricing.kind === "hourly") return minutes % 60 === 0 && minutes >= R.space.minHours * 60 && minutes <= R.space.maxHours * 60;
  return minutes >= 10 + R.setupMinutes && minutes <= R.maxSessionMinutes;
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
      return priceFor(p.ratePerHour, Math.min(...R.podcast.episodeLengths) + R.setupMinutes);
    case "creator":
      return priceFor(p.ratePerHour, R.creator.reelMinutes + R.setupMinutes);
    case "title":
      return null;
  }
}

/** Rate for display: "₹850/hr" style packages return the hourly rate. */
export function hourlyRate(pkg: Package): number | null {
  return pkg.pricing.kind === "fixed" ? null : pkg.pricing.ratePerHour;
}
