/**
 * SINGLE SOURCE OF TRUTH for THIRD SPACE.
 *
 * Prices, hours, capacity, advance %, buffer, hold time and every policy text
 * are read from here (or from env for contact details). No component may
 * hard-code a price, an hour or a phone number: import from this file.
 *
 * Values marked `NEEDS OWNER` in docs/STAGE_REPORT.md are sensible defaults
 * the owner must confirm before launch.
 */

export type Locale = "en" | "hi";
/** A string in English and Hinglish. */
export type L = { en: string; hi: string };

export type Mode = "watch" | "create" | "celebrate" | "visit";

/**
 * How a package's time and price are decided.
 * - fixed:   `price` for `durationMinutes` (Creator Plan, free visit)
 * - title:   theatre; time = movie runtime + setup, price = rate × time
 * - podcast: time = episodes × episode length + setup, price = rate × time
 * - creator: time = reels and videos to shoot + setup, price = rate × time
 * - hourly:  guest picks whole hours, price = rate × hours (space only)
 */
export type Pricing =
  | { kind: "fixed" }
  | { kind: "title"; ratePerHour: number; startingPrice: number }
  | { kind: "podcast"; ratePerHour: number; startingPrice: number }
  | { kind: "creator"; ratePerHour: number; startingPrice: number }
  | { kind: "hourly"; ratePerHour: number; startingPrice: number };

export type Package = {
  id: string;
  mode: Mode;
  name: L;
  summary: L;
  pricing: Pricing;
  /** Setup added to the work time (owner rule: 30 min). Defaults to sessionRules.setupMinutes. */
  setupMinutes?: number;
  /** Fixed packages: price in whole rupees before add-ons and tax. Others: 0 (computed). */
  price: number;
  /** Fixed packages: session length. Others: typical length, shown as a hint. */
  durationMinutes: number;
  capacity: number;
  includes: L[];
  /** Prepaid hour pack: booked as a pack, hours used later. */
  prepaidHours?: number;
  prepaidValidityDays?: number;
  /** True when this package plays films on screen; hidden while the Legal Gate is closed. */
  requiresLegalGate: boolean;
  /** Which service addendum applies; "visit" accepts only the master policy. */
  service: "theatre" | "podcast" | "creator" | "celebration" | "visit";
  /** Row in the public price list (owner's "Proposed launch packages"). Omit to leave the package out of the list. */
  priceList?: { label: L; includes: L; plus?: boolean };
  /** Zero-price tour etc. are excluded from the "From ₹" price. */
  excludeFromFromPrice?: boolean;
};

export type AddOn = {
  id: string;
  modes: Mode[];
  name: L;
  price: number;
};

export type Theme = { id: string; name: L; description: L };

export type RefundTier = {
  /** Applies when the booking is cancelled at least this many hours before start. */
  minHoursBefore: number;
  refundPercentOfAdvance: number;
  label: L;
};

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export const site = {
  brand: "THIRD SPACE",
  tagline: "Your Voice. Your Space. Your Story.",
  city: "Dhanbad",
  region: "Jharkhand",
  country: "IN",
  /** Launch moment: 25 Nov 2026, 6 PM IST. */
  launchAt: "2026-11-25T18:00:00+05:30",
  timezone: "Asia/Kolkata",
  currency: "INR",
};

/** Public contact details. Env vars override these (e.g. for a test server). */
const CONTACT_DEFAULTS = {
  phone: "+91 90316 27292",
  whatsapp: "+91 90316 27292",
  email: "sandeep@mythirdspace.co.in",
  addressLine: "Ground Floor, Om Sai Plaza, Police Line Road, Near HDFC Bank, CMPF Colony, Hirapur",
};

export const contact = {
  get phone() {
    return env("THIRD_SPACE_PHONE") || CONTACT_DEFAULTS.phone;
  },
  get whatsapp() {
    return env("THIRD_SPACE_WHATSAPP") || env("THIRD_SPACE_PHONE") || CONTACT_DEFAULTS.whatsapp;
  },
  get email() {
    return env("THIRD_SPACE_EMAIL") || CONTACT_DEFAULTS.email;
  },
  get addressLine() {
    return env("THIRD_SPACE_ADDRESS_LINE") || CONTACT_DEFAULTS.addressLine;
  },
  get mapUrl() {
    return env("THIRD_SPACE_MAP_URL") || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.fullAddress)}`;
  },
  /** Full address as shown everywhere (header, footer, contact, JSON-LD). */
  get fullAddress() {
    return [this.addressLine, `${site.city}, ${site.region}`].filter(Boolean).join(", ");
  },
};

export function siteUrl(): string {
  return (env("SITE_URL") || "http://localhost:3000").replace(/\/$/, "");
}

/** Legal Gate: until the film licence is in place, Theatre stays closed. */
export function isLegalGateOpen(): boolean {
  return env("THIRD_SPACE_LEGAL_GATE").toLowerCase() === "open";
}

export const hours = {
  /** 24h clock, IST. Every day of the week. */
  open: "10:00",
  close: "22:00",
  /** Slots start on this grid. */
  slotStepMinutes: 30,
  /** Cleaning/reset gap kept free after every booking. */
  bufferMinutes: 30,
  label: { en: "Open daily, 10 AM to 10 PM", hi: "Roz khula, subah 10 se raat 10 baje tak" } as L,
};

/** Rules the session resolver (src/lib/session.ts) uses to decide time automatically. */
export const sessionRules = {
  /** Owner's rule: booking time = the work itself + 30 minutes setup. No rounding. */
  setupMinutes: 30,
  /** Lowest price of any paid booking (owner: "₹799 is the lowest price"). Applied to the base price before add-ons and GST. */
  minimumCharge: 799,
  maxSessionMinutes: 480,
  podcast: { episodeLengths: [15, 30, 45, 60, 90], maxEpisodes: 4 },
  creator: { reelMinutes: 15, longVideoMinutes: 30, maxReels: 10, maxLongVideos: 4 },
  space: { minHours: 1, maxHours: 6 },
};

export const booking = {
  /** Advance paid online, as % of the itemised total. Balance is paid at the venue. */
  advancePercent: 50,
  /** How long a selected slot is held for the guest during checkout. */
  holdMinutes: 15,
  /** GST rate applied on base + add-ons. */
  taxPercent: 18,
  taxLabel: { en: "GST", hi: "GST" } as L,
  /** How many days ahead a guest can book. */
  bookingWindowDays: 60,
};

export const themes: Theme[] = [
  {
    id: "birthday",
    name: { en: "Birthday", hi: "Birthday" },
    description: { en: "Balloons, name banner and warm lights.", hi: "Balloons, naam ka banner aur warm lights." },
  },
  {
    id: "anniversary",
    name: { en: "Anniversary", hi: "Anniversary" },
    description: { en: "Candles, roses and a soft red glow.", hi: "Candles, gulab aur halki laal roshni." },
  },
  {
    id: "proposal",
    name: { en: "Proposal", hi: "Proposal" },
    description: { en: "Fairy lights and a 'Will you?' backdrop.", hi: "Fairy lights aur 'Will you?' backdrop." },
  },
];

export const addOns: AddOn[] = [
  { id: "decor", modes: ["watch", "celebrate"], name: { en: "Theme decor setup", hi: "Theme decor setup" }, price: 699 },
  { id: "cake", modes: ["watch", "celebrate"], name: { en: "Cake (500 g)", hi: "Cake (500 g)" }, price: 599 },
  { id: "fog-entry", modes: ["celebrate"], name: { en: "Fog entry", hi: "Fog entry" }, price: 499 },
  { id: "photos", modes: ["watch", "celebrate"], name: { en: "20-minute photo shoot", hi: "20 minute photo shoot" }, price: 799 },
  { id: "extra-camera", modes: ["create"], name: { en: "Extra camera angle", hi: "Extra camera angle" }, price: 499 },
  { id: "basic-edit", modes: ["create"], name: { en: "Basic edit of the full episode", hi: "Poore episode ka basic edit" }, price: 1499 },
  { id: "reels", modes: ["create"], name: { en: "3 short reels cut from your session", hi: "Aapke session se 3 short reels" }, price: 999 },
];

export const refundTiers: RefundTier[] = [
  {
    minHoursBefore: 72,
    refundPercentOfAdvance: 90,
    label: { en: "3 days or more before your slot", hi: "Slot se 3 din ya usse pehle" },
  },
  {
    minHoursBefore: 24,
    refundPercentOfAdvance: 50,
    label: { en: "Between 24 hours and 3 days before", hi: "24 ghante se 3 din pehle tak" },
  },
  {
    minHoursBefore: 0,
    refundPercentOfAdvance: 0,
    label: { en: "Less than 24 hours before, or no-show", hi: "24 ghante se kam pehle, ya na aane par" },
  },
];

/** Venue rules, shown before the pay button and on the Policies page. */
export const venueRules: L[] = [
  {
    en: "18+ only. Every guest and participant must be 18 or older; no minors, even with a parent.",
    hi: "Sirf 18+. Har guest aur participant 18 ya usse bada ho; minors nahi, parent ke saath bhi nahi.",
  },
  {
    en: "Every guest shows a government photo ID at entry. Staff record only \"18+ verified\", not your ID number.",
    hi: "Entry par har guest government photo ID dikhayega. Staff sirf \"18+ verified\" note karta hai, ID number nahi.",
  },
  {
    en: "No smoking, vaping, hookah, tobacco, alcohol or drugs anywhere at the venue.",
    hi: "Venue par kahin bhi smoking, vaping, hookah, tobacco, alcohol ya drugs nahi.",
  },
  {
    en: "Outside food and drinks are not allowed. A celebration cake is fine.",
    hi: "Bahar ka khana aur drinks allowed nahi hain. Celebration cake la sakte hain.",
  },
  {
    en: "If a power cut stops your session, the lost time is added at the end or you can move the slot.",
    hi: "Power cut se session ruka to jitna time gaya, utna end me jod denge, ya slot badal sakte hain.",
  },
  {
    en: "Please arrive 10 minutes early. Late arrival is not added to your time.",
    hi: "10 minute pehle aaiye. Late aane ka time alag se nahi juda jata.",
  },
];

/** Legal Gate content rule shown on the Watch page once the gate is open. */
export const contentRule: L = {
  en: "We play only content that we are licensed to show. Pirated content, personal downloads and pen drives are not allowed.",
  hi: "Hum sirf wahi content chalate hain jiska licence hamare paas hai. Pirated content, personal download aur pen drive allowed nahi.",
};

export const recordingConsent = {
  points: [
    {
      en: "Your recordings belong to you. We do not publish them anywhere.",
      hi: "Aapki recording aapki hai. Hum use kahin publish nahi karte.",
    },
    {
      en: "Everyone on mic agrees to be recorded before the session starts.",
      hi: "Session shuru hone se pehle mic par baithe sab log recording ke liye haan bolte hain.",
    },
    {
      en: "We share a clip on 'Stories of Dhanbad' only if you sign a separate written consent.",
      hi: "'Stories of Dhanbad' par clip tabhi daalte hain jab aap alag se likhit consent dein.",
    },
  ] as L[],
  delivery: {
    en: "Raw files reach you as a private download link within 24 hours of your session. The link stays open for 7 days, after which we delete our copy.",
    hi: "Session ke 24 ghante ke andar raw files private download link se milengi. Link 7 din khula rahega, uske baad hum apni copy delete kar dete hain.",
  } as L,
};

export const privacyPoints: L[] = [
  {
    en: "At entry, staff look at your photo ID and record only \"18+ verified\". We do not copy or keep your ID number or image.",
    hi: "Entry par staff photo ID dekhta hai aur sirf \"18+ verified\" note karta hai. Hum ID number ya photo copy nahi karte, na rakhte hain.",
  },
  {
    en: "If CCTV is used for security, it is shown by signage, access is limited and footage is kept for a set period. No cameras in washrooms.",
    hi: "Security ke liye CCTV ho to signage se bataya jata hai, access seemit hai aur footage tay samay tak rakhi jati hai. Washroom me koi camera nahi.",
  },
  {
    en: "We ask only for your name, phone and email, to confirm and manage your booking.",
    hi: "Booking confirm aur manage karne ke liye hum sirf naam, phone aur email lete hain.",
  },
  {
    en: "Payments are handled by the payment provider. We never see or store your card or UPI PIN.",
    hi: "Payment provider payment sambhalta hai. Hum aapka card ya UPI PIN na dekhte hain, na rakhte hain.",
  },
  {
    en: "Website analytics never include your name, phone or email.",
    hi: "Website analytics me aapka naam, phone ya email kabhi nahi jata.",
  },
  {
    en: "Ask us anytime to delete your data, and we will do it within 7 days.",
    hi: "Kabhi bhi data delete karne ko kahein, hum 7 din me kar denge.",
  },
];

export const termsPoints: L[] = [
  {
    en: "A booking is confirmed only after the advance is paid and you receive a booking ID.",
    hi: "Booking tabhi confirm hai jab advance pay ho aur aapko booking ID mile.",
  },
  {
    en: "The balance is paid at the venue before the session starts.",
    hi: "Baaki amount session shuru hone se pehle venue par pay hota hai.",
  },
  {
    en: "Damage to equipment or the room is charged at repair cost.",
    hi: "Equipment ya room ka nuksaan repair cost par charge hoga.",
  },
  {
    en: "Moving a slot is free once, up to 24 hours before the start, subject to availability.",
    hi: "Slot ek baar free me badal sakte hain, start se 24 ghante pehle tak, availability ke hisaab se.",
  },
];

export const enquiryPurposes = [
  { id: "theatre", label: { en: "Theatre", hi: "Theatre" } as L, gated: true },
  { id: "podcast", label: { en: "Podcast", hi: "Podcast" } as L, gated: false },
  { id: "creator", label: { en: "Creator Studio shoot", hi: "Creator Studio shoot" } as L, gated: false },
  { id: "celebration", label: { en: "Birthday / Anniversary", hi: "Birthday / Anniversary" } as L, gated: false },
  { id: "corporate", label: { en: "Corporate", hi: "Corporate" } as L, gated: false },
  { id: "creator-plan", label: { en: "Creator Plan", hi: "Creator Plan" } as L, gated: false },
  { id: "custom-decor", label: { en: "Custom decor quote", hi: "Custom decor quote" } as L, gated: false },
  { id: "other", label: { en: "Other", hi: "Other" } as L, gated: false },
];

export function addOnsFor(mode: Mode): AddOn[] {
  return addOns.filter((a) => a.modes.includes(mode));
}

/** The earliest calendar date (IST, YYYY-MM-DD) a slot can be booked. */
export function firstBookableDate(): string {
  return site.launchAt.slice(0, 10);
}
