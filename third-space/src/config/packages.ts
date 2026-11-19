import "server-only";
import { isLegalGateOpen, type Package } from "./site";
import { minimumPrice } from "@/lib/session";

/**
 * Package catalogue. Server-only on purpose: client bundles must not carry
 * Theatre package names while the Legal Gate is closed. Client components get
 * the packages they may show as props.
 */
export const packages: Package[] = [
  {
    id: "theatre-classic",
    service: "theatre",
    mode: "watch",
    name: { en: "THIRD SPACE Cinema", hi: "THIRD SPACE Cinema" },
    summary: {
      en: "The private room for your group. Your time is set by the length of what you watch.",
      hi: "Aapke group ke liye private room. Time is par tay hota hai ki aap kya dekhte hain.",
    },
    pricing: { kind: "title", ratePerHour: 850 },
    price: 0,
    durationMinutes: 150,
    capacity: 5,
    includes: [
      { en: "Private room for up to 5 guests", hi: "5 logon tak ke liye private room" },
      { en: "Big screen and surround sound", hi: "Bada screen aur surround sound" },
      { en: "Recliner seating", hi: "Recliner seating" },
    ],
    requiresLegalGate: true,
  },
  {
    id: "theatre-premium",
    service: "theatre",
    mode: "watch",
    name: { en: "THIRD SPACE Premium", hi: "THIRD SPACE Premium" },
    summary: {
      en: "Everything in Cinema, plus unlimited popcorn and cold drinks.",
      hi: "Cinema ka sab kuch, saath me unlimited popcorn aur cold drink.",
    },
    pricing: { kind: "title", ratePerHour: 1350 },
    price: 0,
    durationMinutes: 150,
    capacity: 5,
    includes: [
      { en: "Private room for up to 5 guests", hi: "5 logon tak ke liye private room" },
      { en: "Unlimited popcorn and cold drinks", hi: "Unlimited popcorn aur cold drink" },
      { en: "Recliner seating", hi: "Recliner seating" },
    ],
    requiresLegalGate: true,
  },
  {
    id: "podcast",
    service: "podcast",
    mode: "create",
    name: { en: "Podcast Session", hi: "Podcast Session" },
    summary: {
      en: "Tell us how many episodes and how long each one is. We add setup time and show the price.",
      hi: "Bataiye kitne episode aur har ek kitna lamba. Hum setup time jod kar price dikhate hain.",
    },
    pricing: { kind: "podcast", ratePerHour: 950 },
    price: 0,
    durationMinutes: 90,
    capacity: 4,
    includes: [
      { en: "Up to 4 people on mic", hi: "4 log tak mic par" },
      { en: "Multi-camera recording", hi: "Multi-camera recording" },
      { en: "Raw audio and video files", hi: "Raw audio aur video files" },
      { en: "A team member helps you start", hi: "Shuru karne me team member madad karega" },
    ],
    requiresLegalGate: false,
  },
  {
    id: "creator-shoot",
    service: "creator",
    mode: "create",
    name: { en: "Creator Studio Shoot", hi: "Creator Studio Shoot" },
    summary: {
      en: "Tell us how many reels and longer videos you will shoot. We work out the studio time and price.",
      hi: "Bataiye kitni reels aur lambi videos shoot karni hain. Studio time aur price hum nikaalte hain.",
    },
    pricing: { kind: "creator", ratePerHour: 950 },
    price: 0,
    durationMinutes: 90,
    capacity: 4,
    includes: [
      { en: "Up to 4 people on set", hi: "Set par 4 log tak" },
      { en: "Lights and backdrops", hi: "Lights aur backdrops" },
      { en: "Bring your own camera or phone", hi: "Apna camera ya phone laaiye" },
    ],
    requiresLegalGate: false,
  },
  {
    id: "studio-space",
    service: "creator",
    mode: "create",
    name: { en: "Studio Space Only", hi: "Sirf Studio Space" },
    summary: {
      en: "Just the space, by the hour. Bring your own gear for a rehearsal, meeting or shoot.",
      hi: "Sirf space, ghante ke hisaab se. Rehearsal, meeting ya shoot ke liye apna saaman laaiye.",
    },
    pricing: { kind: "hourly", ratePerHour: 799 },
    price: 0,
    durationMinutes: 60,
    capacity: 4,
    includes: [
      { en: "The studio space only, no equipment", hi: "Sirf studio space, equipment nahi" },
      { en: "Seating and power points", hi: "Seating aur power points" },
    ],
    requiresLegalGate: false,
  },
  {
    id: "creator-plan",
    service: "podcast",
    mode: "create",
    name: { en: "Monthly Creator Plan", hi: "Monthly Creator Plan" },
    summary: {
      en: "8 prepaid studio hours to use across the month. Book your first session now.",
      hi: "Mahine bhar me use karne ke liye 8 prepaid studio ghante. Pehla session abhi book karein.",
    },
    pricing: { kind: "fixed" },
    price: 4999,
    durationMinutes: 120,
    capacity: 4,
    prepaidHours: 8,
    prepaidValidityDays: 30,
    includes: [
      { en: "8 studio hours, valid 30 days", hi: "8 studio ghante, 30 din valid" },
      { en: "First 2-hour session booked today", hi: "Pehla 2 ghante ka session aaj book" },
      { en: "Raw files after every session", hi: "Har session ke baad raw files" },
    ],
    requiresLegalGate: false,
  },
  {
    id: "visit-tour",
    service: "visit",
    mode: "visit",
    name: { en: "Visit the room", hi: "Room dekhne aaiye" },
    summary: {
      en: "A free 10-minute walk-through of the studio and the room.",
      hi: "Studio aur room ka free 10 minute ka tour.",
    },
    pricing: { kind: "fixed" },
    price: 0,
    durationMinutes: 10,
    capacity: 4,
    includes: [{ en: "Free, no payment needed", hi: "Free, koi payment nahi" }],
    requiresLegalGate: false,
    excludeFromFromPrice: true,
  },
];

/** Packages a guest can actually book right now, given the Legal Gate. */
export function bookablePackages(gateOpen = isLegalGateOpen()): Package[] {
  return packages.filter((p) => gateOpen || !p.requiresLegalGate);
}

export function getPackage(id: string): Package | undefined {
  return packages.find((p) => p.id === id);
}

/** Lowest paid price a guest can book today; drives every "From ₹" label. */
export function fromPrice(gateOpen = isLegalGateOpen()): number {
  const prices = bookablePackages(gateOpen)
    .filter((p) => !p.excludeFromFromPrice)
    .map((p) => minimumPrice(p))
    .filter((n): n is number => n !== null && n > 0);
  return Math.min(...prices);
}
