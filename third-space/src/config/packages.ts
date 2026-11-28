import "server-only";
import { isLegalGateOpen, type Package } from "./site";
import { minimumPrice } from "@/lib/session";
import { rs } from "@/lib/money";

/**
 * Package catalogue. Server-only on purpose: client bundles must not carry
 * Theatre package names while the Legal Gate is closed. Client components get
 * the packages they may show as props.
 */
/**
 * Launch packages and prices (owner's "03 Proposed launch packages").
 * Starting price = the lowest a booking of that package can cost. Time is
 * decided automatically (title runtime / recording / shoot + 30 min setup);
 * a longer session costs rate × time. Order here = order in the price list.
 */
export const packages: Package[] = [
  {
    id: "theatre-classic",
    service: "theatre",
    mode: "watch",
    name: { en: "Private Cinema", hi: "Private Cinema" },
    summary: {
      en: "The private room for your group. Starts at 2 hours; a longer title runs longer.",
      hi: "Aapke group ke liye private room. 2 ghante se shuru; lamba title ho to time badhega.",
    },
    pricing: { kind: "title", ratePerHour: rs(850), startingPrice: rs(1699) },
    price: 0,
    durationMinutes: 120,
    capacity: 5,
    includes: [
      { en: "Private room for up to 5 people", hi: "5 logon tak ke liye private room" },
      { en: "Big screen and surround sound", hi: "Bada screen aur surround sound" },
      { en: "Recliner seating", hi: "Recliner seating" },
    ],
    requiresLegalGate: true,
    priceList: {
      label: { en: "Private Cinema – 2 hours (max 5 people)", hi: "Private Cinema – 2 ghante (max 5 log)" },
      includes: { en: "Private room booking", hi: "Private room booking" },
    },
  },
  {
    id: "theatre-premium",
    service: "theatre",
    mode: "watch",
    name: { en: "Premium Experience", hi: "Premium Experience" },
    summary: {
      en: "The private room with unlimited popcorn and cold drinks.",
      hi: "Private room, saath me unlimited popcorn aur cold drink.",
    },
    pricing: { kind: "title", ratePerHour: rs(1350), startingPrice: rs(2699) },
    price: 0,
    durationMinutes: 120,
    capacity: 4,
    includes: [
      { en: "Private room for up to 4 people", hi: "4 logon tak ke liye private room" },
      { en: "Unlimited popcorn and cold drinks", hi: "Unlimited popcorn aur cold drink" },
      { en: "Recliner seating", hi: "Recliner seating" },
    ],
    requiresLegalGate: true,
    priceList: {
      label: { en: "Premium Experience – 2 hours (max 4 people)", hi: "Premium Experience – 2 ghante (max 4 log)" },
      includes: { en: "Unlimited popcorn and cold drink", hi: "Unlimited popcorn aur cold drink" },
    },
  },
  {
    id: "podcast",
    service: "podcast",
    mode: "create",
    name: { en: "Podcast Studio", hi: "Podcast Studio" },
    summary: {
      en: "Tell us how many episodes and how long each one is. We add 30 minutes setup and show the price.",
      hi: "Bataiye kitne episode aur har ek kitna lamba. Hum 30 minute setup jod kar price dikhate hain.",
    },
    pricing: { kind: "podcast", ratePerHour: rs(950), startingPrice: rs(1899) },
    price: 0,
    durationMinutes: 120,
    capacity: 4,
    includes: [
      { en: "Up to 4 people on mic", hi: "4 log tak mic par" },
      { en: "Multi-camera recording", hi: "Multi-camera recording" },
      { en: "Raw audio and video files delivered", hi: "Raw audio aur video files milengi" },
      { en: "A team member helps you start", hi: "Shuru karne me team member madad karega" },
    ],
    requiresLegalGate: false,
    priceList: {
      label: { en: "Podcast Studio / Content Creation – 2 hours", hi: "Podcast Studio / Content Creation – 2 ghante" },
      includes: { en: "Recording + agreed raw-file delivery", hi: "Recording + tay raw-file delivery" },
    },
  },
  {
    id: "creator-shoot",
    service: "creator",
    mode: "create",
    name: { en: "Content Creation", hi: "Content Creation" },
    summary: {
      en: "Tell us how many reels and longer videos you will shoot. We add 30 minutes setup and show the price.",
      hi: "Bataiye kitni reels aur lambi videos shoot karni hain. Hum 30 minute setup jod kar price dikhate hain.",
    },
    pricing: { kind: "creator", ratePerHour: rs(950), startingPrice: rs(1899) },
    price: 0,
    durationMinutes: 120,
    capacity: 4,
    includes: [
      { en: "Up to 4 people on set", hi: "Set par 4 log tak" },
      { en: "Lights and backdrops", hi: "Lights aur backdrops" },
      { en: "Raw files delivered", hi: "Raw files milengi" },
    ],
    requiresLegalGate: false,
  },
  {
    id: "celebration",
    service: "celebration",
    mode: "celebrate",
    name: { en: "Birthday / Anniversary Experience", hi: "Birthday / Anniversary Experience" },
    summary: {
      en: "Two hours in the private room, set up for your occasion. Decoration and refreshments are added as you choose or as quoted.",
      hi: "Private room me do ghante, aapke mauke ke liye sajaya hua. Decoration aur refreshments aapki pasand ya quote ke hisaab se.",
    },
    pricing: { kind: "fixed" },
    price: rs(2499),
    durationMinutes: 120,
    capacity: 5,
    includes: [
      { en: "Private room for 2 hours", hi: "2 ghante private room" },
      { en: "Pick a theme; add decoration, cake and more", hi: "Theme chuniye; decoration, cake aur bhi jodiye" },
    ],
    requiresLegalGate: false,
    priceList: {
      label: { en: "Birthday / Anniversary Experience – 2 hours", hi: "Birthday / Anniversary Experience – 2 ghante" },
      includes: { en: "Decoration / refreshments as quoted", hi: "Decoration / refreshments quote ke hisaab se" },
      plus: true,
    },
  },
  {
    id: "family",
    service: "theatre",
    mode: "watch",
    name: { en: "Family Package", hi: "Family Package" },
    summary: {
      en: "Three hours in the private room with unlimited food, popcorn and cold drinks.",
      hi: "Private room me teen ghante, unlimited khana, popcorn aur cold drink ke saath.",
    },
    pricing: { kind: "title", ratePerHour: rs(2333), startingPrice: rs(6999) },
    price: 0,
    durationMinutes: 180,
    capacity: 5,
    includes: [
      { en: "Private room for up to 5 people, 3 hours", hi: "5 logon tak ke liye private room, 3 ghante" },
      { en: "Unlimited food", hi: "Unlimited khana" },
      { en: "Unlimited popcorn and cold drinks", hi: "Unlimited popcorn aur cold drink" },
    ],
    requiresLegalGate: true,
    priceList: {
      label: { en: "Family Package – 3 hours (max 5 people)", hi: "Family Package – 3 ghante (max 5 log)" },
      includes: { en: "Private room + unlimited food + popcorn and cold drink", hi: "Private room + unlimited khana + popcorn aur cold drink" },
    },
  },
  {
    id: "small-celebration",
    service: "celebration",
    mode: "celebrate",
    name: { en: "Small Private Celebration", hi: "Small Private Celebration" },
    summary: {
      en: "Just the private room, by the hour, for a small get-together. Bring your cake; decoration is optional.",
      hi: "Sirf private room, ghante ke hisaab se, chhote get-together ke liye. Cake laaiye; decoration optional.",
    },
    pricing: { kind: "hourly", ratePerHour: rs(799), startingPrice: rs(799) },
    price: 0,
    durationMinutes: 60,
    capacity: 5,
    includes: [
      { en: "The private room only", hi: "Sirf private room" },
      { en: "Screen and food not included", hi: "Screen aur khana shaamil nahi" },
    ],
    requiresLegalGate: false,
    priceList: {
      label: { en: "Small Private Celebration – 1 hour", hi: "Small Private Celebration – 1 ghanta" },
      includes: { en: "Only space", hi: "Sirf space" },
    },
  },
  {
    id: "creator-plan",
    service: "podcast",
    mode: "create",
    name: { en: "Monthly Creator Plan", hi: "Monthly Creator Plan" },
    summary: {
      en: "8 fixed studio hours a month with agreed outputs. Book your first session now.",
      hi: "Mahine ke 8 fixed studio ghante, tay outputs ke saath. Pehla session abhi book karein.",
    },
    pricing: { kind: "fixed" },
    price: rs(4999),
    durationMinutes: 120,
    capacity: 4,
    prepaidHours: 8,
    prepaidValidityDays: 30,
    includes: [
      { en: "8 studio hours, valid 30 days", hi: "8 studio ghante, 30 din valid" },
      { en: "First 2-hour session booked today", hi: "Pehla 2 ghante ka session aaj book" },
      { en: "Agreed outputs after every session", hi: "Har session ke baad tay outputs" },
    ],
    requiresLegalGate: false,
    priceList: {
      label: { en: "Monthly Creator Plan", hi: "Monthly Creator Plan" },
      includes: { en: "Fixed monthly hours (8 hrs) and outputs", hi: "Fixed monthly ghante (8) aur outputs" },
    },
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
