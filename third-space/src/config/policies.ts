/**
 * THIRD SPACE policy pack. Source: "THIRD SPACE TERMS — VERSION 2.0"
 * (19 November 2026): 01 Master 18+ Safety & Conduct Policy, 02 Private
 * Theatre Addendum, 03 Podcast Studio Addendum, 04 Creator Studio Addendum,
 * and the owner's Mandatory Customer Declaration.
 *
 * Full legal text is in ./policy-texts.ts (server-only, so client bundles
 * never carry the theatre addendum while the Legal Gate is closed).
 * Legal text stays in English exactly as drafted. Every booking stores the
 * version it accepted (PolicyAcceptance), so a later version never rewrites
 * what an earlier guest agreed to. To publish a new version: add it to
 * POLICY_HISTORY, bump POLICY_PACK_VERSION, and edit the documents below.
 */
import type { L } from "./site";

export type ServiceId = "theatre" | "podcast" | "creator";
export type PolicyDocId = "safety" | ServiceId;

export const POLICY_PACK_VERSION = "2.0";
export const POLICY_PACK_DATE = "2026-11-19";

/** Version history shown on the policies page and in the admin panel. */
export const POLICY_HISTORY: { version: string; date: string; changes: string[] }[] = [
  {
    version: "2.0",
    date: "2026-11-19",
    changes: [
      "Added a shared 18+ Safety & Conduct Policy for all three services.",
      "Added express prohibitions on nudity, pornography/sexually explicit activity, smoking/vaping/hookah/tobacco, alcohol, illegal drugs, violence, threats, weapons and public-disorder conduct.",
      "Added rules for religious/community-sensitive content using conduct-based restrictions rather than banning peaceful religion or identity.",
      "Added customer accountability, company enforcement options and emergency response guidance.",
      "Added software requirements for mandatory policy acceptance, 18+ verification, evidence logs and incident management.",
      "Added the Mandatory Customer Declaration at checkout.",
    ],
  },
];

/**
 * "draft" shows a banner on policy pages until an Indian/Jharkhand advocate
 * has approved the text. Set POLICY_STATUS=final once approved.
 */
export function policyStatus(): "draft" | "final" {
  return (process.env.POLICY_STATUS ?? "").trim() === "final" ? "final" : "draft";
}

/** Plain-language summary shown before payment (section 10). */
export const EASY_SUMMARY: L[] = [
  { en: "Strict 18+ venue: every customer and participant must be an adult; no minors admitted.", hi: "Sirf 18+ venue: har customer aur participant adult hona chahiye; minors allowed nahi." },
  { en: "No nudity, pornographic/sexually explicit content or sexual activity.", hi: "Nudity, pornographic/sexually explicit content ya sexual activity bilkul nahi." },
  { en: "No smoking, vaping, hookah, alcohol, illegal drugs or intoxication-related unsafe behaviour.", hi: "Smoking, vaping, hookah, alcohol, illegal drugs ya nashe me unsafe behaviour nahi." },
  { en: "No violence, threats, weapons, harassment, hate/incitement or public-disorder activity.", hi: "Violence, dhamki, hathiyar, harassment, nafrat/uksana ya public-disorder activity nahi." },
  { en: "No religious or political mobilisation events without written approval; peaceful belief/discussion is not automatically banned.", hi: "Likhit approval ke bina religious ya political mobilisation event nahi; shantipurn vishwas/charcha apne aap banned nahi hai." },
  { en: "Follow Indian law and applicable social-media/platform rules; creators remain responsible for content they make and publish.", hi: "Indian law aur social-media/platform rules maaniye; creator apne banaye aur publish kiye content ke zimmedar hain." },
  { en: "THIRD SPACE can refuse entry, stop sessions, cancel future access, preserve evidence and take lawful civil/criminal steps where justified.", hi: "THIRD SPACE zaroorat par entry mana kar sakta hai, session rok sakta hai, aage ki booking band kar sakta hai, evidence rakh sakta hai aur kanooni civil/criminal kadam utha sakta hai." },
  { en: "Incident responsibility is based on the person's own conduct and evidence; no automatic liability for another person's independent acts.", hi: "Kisi incident ki zimmedari us vyakti ke apne conduct aur evidence par hai; doosre ke alag kaam ki automatic zimmedari nahi." },
];

export const DECLARATION_VERSION = "2.0";
export const DECLARATION_TITLE = "THIRD SPACE — Mandatory Customer Declaration";
export const DECLARATION_INTRO = "I confirm that:";
export const DECLARATION_POINTS: string[] = [
  "I am 18 years of age or older, and every person participating in this booking is also 18+.",
  "I have read and agree to the THIRD SPACE Terms & Conditions and 18+ Safety & Conduct Policy.",
  "I understand that nudity, pornography, sexual activity, smoking, vaping, tobacco, alcohol, illegal drugs, violence, threats, weapons and unlawful activities are strictly prohibited.",
  "I agree that all activities and content created at THIRD SPACE must comply with applicable Indian laws and relevant social-media/platform rules.",
  "I understand that THIRD SPACE may refuse entry, stop a session, cancel a booking, preserve relevant evidence and take lawful action if these rules are violated.",
  "I accept responsibility for my own conduct and agree to inform all guests about these rules.",
];
export const DECLARATION_CLOSING = "I understand that violation may result in legal action where permitted by applicable law.";

export function declarationText(): string {
  return [DECLARATION_TITLE, DECLARATION_INTRO, ...DECLARATION_POINTS.map((p, i) => `${i + 1}. ${p}`), DECLARATION_CLOSING].join("\n");
}

export const POLICY_DOCS: Record<PolicyDocId, { title: string; path: string }> = {
  safety: { title: "Master 18+ Safety & Conduct Policy", path: "/policies/safety" },
  theatre: { title: "Private Theatre — Terms Addendum", path: "/policies/theatre" },
  podcast: { title: "Podcast Studio — Terms Addendum", path: "/policies/podcast" },
  creator: { title: "Creator Studio — Terms Addendum", path: "/policies/creator" },
};

/** Documents a booking for this service accepts: the master policy + its addendum. */
export function docsForService(service: ServiceId | "visit" | "celebration"): { id: PolicyDocId; title: string; version: string }[] {
  const docs: { id: PolicyDocId; title: string; version: string }[] = [
    { id: "safety", title: POLICY_DOCS.safety.title, version: POLICY_PACK_VERSION },
  ];
  if (service !== "visit" && service !== "celebration") docs.push({ id: service, title: POLICY_DOCS[service].title, version: POLICY_PACK_VERSION });
  return docs;
}

/** Legal-entity and grievance details for section 11; set via env before go-live. */
export function legalContact() {
  const e = (k: string) => (process.env[k] ?? "").trim();
  const address = "Ground Floor, Om Sai Plaza, Police Line Road, Near HDFC Bank, CMPF Colony, Hirapur, Dhanbad, Jharkhand";
  return {
    entityName: e("LEGAL_ENTITY_NAME") || "THIRD SPACE",
    entityAddress: e("LEGAL_ENTITY_ADDRESS") || address,
    grievanceName: e("GRIEVANCE_OFFICER_NAME"),
    grievanceDesignation: e("GRIEVANCE_OFFICER_DESIGNATION"),
    grievanceEmail: e("GRIEVANCE_EMAIL") || "sandeep@mythirdspace.co.in",
    grievancePhone: e("GRIEVANCE_PHONE") || "+91 90316 27292",
    grievanceAddress: e("GRIEVANCE_POSTAL_ADDRESS") || address,
    effectiveDate: e("POLICY_EFFECTIVE_DATE"),
  };
}

/** Fields the policy pack says must be filled before publication. */
export function missingLegalFields(): string[] {
  const c = legalContact();
  const labels: Record<keyof typeof c, string> = {
    entityName: "LEGAL_ENTITY_NAME",
    entityAddress: "LEGAL_ENTITY_ADDRESS",
    grievanceName: "GRIEVANCE_OFFICER_NAME",
    grievanceDesignation: "GRIEVANCE_OFFICER_DESIGNATION",
    grievanceEmail: "GRIEVANCE_EMAIL",
    grievancePhone: "GRIEVANCE_PHONE",
    grievanceAddress: "GRIEVANCE_POSTAL_ADDRESS",
    effectiveDate: "POLICY_EFFECTIVE_DATE",
  };
  return (Object.keys(c) as (keyof typeof c)[]).filter((k) => !c[k]).map((k) => labels[k]);
}
