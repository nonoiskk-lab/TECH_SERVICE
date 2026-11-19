import "server-only";
import { isLegalGateOpen, type Package } from "./site";

/**
 * Package catalogue. Server-only on purpose: client bundles must not carry
 * Theatre package names while the Legal Gate is closed. Client components get
 * the packages they may show as props.
 */
export const packages: Package[] = [
  {
    id: "theatre-classic",
    mode: "watch",
    name: { en: "THIRD SPACE Cinema", hi: "THIRD SPACE Cinema" },
    summary: {
      en: "The private room for your group, for two hours.",
      hi: "Aapke group ke liye private room, do ghante.",
    },
    price: 1699,
    durationMinutes: 120,
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
    mode: "watch",
    name: { en: "THIRD SPACE Premium", hi: "THIRD SPACE Premium" },
    summary: {
      en: "Everything in Cinema, plus unlimited popcorn and cold drinks.",
      hi: "Cinema ka sab kuch, saath me unlimited popcorn aur cold drink.",
    },
    price: 2699,
    durationMinutes: 120,
    capacity: 5,
    includes: [
      { en: "Private room for up to 5 guests", hi: "5 logon tak ke liye private room" },
      { en: "Unlimited popcorn and cold drinks", hi: "Unlimited popcorn aur cold drink" },
      { en: "Recliner seating", hi: "Recliner seating" },
    ],
    requiresLegalGate: true,
  },
  {
    id: "podcast-2h",
    mode: "create",
    name: { en: "Podcast Session", hi: "Podcast Session" },
    summary: {
      en: "Two hours in the studio with mics, cameras and lights set up for you.",
      hi: "Studio me do ghante; mic, camera aur lights pehle se set.",
    },
    price: 1899,
    durationMinutes: 120,
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
    id: "creator-plan",
    mode: "create",
    name: { en: "Monthly Creator Plan", hi: "Monthly Creator Plan" },
    summary: {
      en: "8 prepaid studio hours to use across the month. Book your first session now.",
      hi: "Mahine bhar me use karne ke liye 8 prepaid studio ghante. Pehla session abhi book karein.",
    },
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
    mode: "visit",
    name: { en: "Visit the room", hi: "Room dekhne aaiye" },
    summary: {
      en: "A free 10-minute walk-through of the studio and the room.",
      hi: "Studio aur room ka free 10 minute ka tour.",
    },
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
    .filter((p) => !p.excludeFromFromPrice && p.price > 0)
    .map((p) => p.price);
  return Math.min(...prices);
}

