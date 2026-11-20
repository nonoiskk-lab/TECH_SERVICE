import "server-only";
import type { ServiceId } from "./policies";

export type PolicySection = { heading: string; paragraphs: string[] };

/** 01 — Master 18+ Safety & Conduct Policy, sections 1–10. Section 11 is built from config (contact details). */
export const MASTER_SECTIONS: PolicySection[] = [
  {
    heading: "1. Adult-only entry — 18 years and above",
    paragraphs: [
      "THIRD SPACE is an adult-only venue. Every customer, guest, host, podcast participant, creator, performer, interviewee, audience member and other visitor entering or participating in a booked session must be at least 18 years old on the date of the visit. No person under 18 may enter or participate, even when accompanied by a parent or guardian.",
      "THIRD SPACE may request a valid government-issued photo ID to verify age. Staff should visually verify the date of birth and record only a minimal verification result (for example, \"18+ verified\"), unless a specific legal requirement justifies more. Do not routinely retain a full ID image or number. If age cannot be reasonably verified, entry or participation may be refused.",
    ],
  },
  {
    heading: "2. No nudity, pornography or sexual activity",
    paragraphs: [
      "No nudity, stripping, sexual activity, sexually explicit performance, pornographic/obscene material, or creation, viewing, recording, streaming or distribution of such content is permitted anywhere at the Venue or using THIRD SPACE equipment, booking services or staff. This includes the Private Theatre, Podcast Studio, Creator Studio, washrooms, common areas and any recording/production activity.",
      "No customer may request, arrange or encourage any staff member, guest or participant to take part in sexual or nude activity. No recording or sharing of intimate images without lawful authority and consent is permitted. The company may immediately stop the session and take proportionate safety and legal steps if this rule is breached.",
    ],
  },
  {
    heading: "3. No smoking, alcohol, drugs or intoxicants",
    paragraphs: [
      "Smoking, vaping, e-cigarettes, hookah/shisha, tobacco use, alcohol consumption, illegal drugs, intoxicating substances and being on the premises while visibly impaired in a way that creates a safety or disruption risk are prohibited. No such item may be brought, used, supplied, sold or distributed at the Venue. Prescribed medication used lawfully is not prohibited; customers should not misuse or share it.",
      "Staff may refuse entry or stop a session where there is a reasonable safety concern. Any search or handling of a person's belongings must be lawful, respectful and proportionate; staff must not claim police powers.",
    ],
  },
  {
    heading: "4. No violence, threats, weapons or public disorder",
    paragraphs: [
      "Zero tolerance applies to physical violence, fighting, assault, threats, intimidation, harassment, stalking, hate speech, incitement, mob activity, unlawful assembly, property damage, dangerous stunts, weapons, and conduct intended or likely to create a serious safety risk or public disturbance. No person may organise, promote, film or livestream violent or threatening conduct at the Venue.",
      "Customers must not provoke, threaten, target or encourage violence against any person or group. If an incident occurs, staff may stop the activity, separate people where safe, call emergency services/police, preserve relevant evidence and cooperate with lawful investigations.",
    ],
  },
  {
    heading: "5. Religion, community and sensitive topics — lawful and respectful conduct",
    paragraphs: [
      "THIRD SPACE is not a venue for religious ceremonies, political mobilisation, communal gatherings or activities designed to provoke hostility or public disorder, unless management has expressly approved a lawful event in writing. No content or conduct may promote religious hatred, communal enmity, threats, deliberate malicious insult intended to provoke a breach of peace, or incitement to violence.",
      "This rule is not intended to ban a person's religion, identity, peaceful belief, lawful discussion, academic debate, documentary interview or respectful criticism. Management decisions must be based on conduct, credible safety risk and applicable law—not a person's religion, caste, community or viewpoint alone. The company may stop content that crosses into threats, incitement, unlawful hate or a real and material safety risk.",
    ],
  },
  {
    heading: "6. Indian law and online publishing rules",
    paragraphs: [
      "All customers and content creators must comply with applicable Indian laws, including the Bharatiya Nyaya Sanhita, 2023; Information Technology Act, 2000; applicable IT Rules; copyright and cinematograph laws; privacy/data protection laws; consumer protection requirements; and any applicable state/local permissions.",
      "Podcast and Creator Studio users are responsible for the content they create, publish, upload or distribute, including music, clips, images, scripts, claims, advertisements and guest permissions. Do not create, upload or transmit unlawful obscene or sexually explicit electronic material, threats, incitement to violence, communal hatred, defamatory material, impersonation, deepfakes or content that infringes another person's rights.",
      "Social-media platform rules (such as community standards, content policies, age restrictions, copyright rules and monetisation rules) must also be followed. Platform rules are separate from Indian law; compliance with one does not automatically mean compliance with the other.",
      "Not every podcast or studio is automatically an 'intermediary' or an OTT/digital publisher under the IT Rules. Additional duties may apply depending on who publishes, hosts, curates or distributes the content and the nature of the service. Customers must obtain specialist advice for news/current-affairs or online-curated-content businesses.",
    ],
  },
  {
    heading: "7. Customer responsibility and legal action",
    paragraphs: [
      "Each person is responsible for their own acts, omissions, statements, content, belongings and participation. The booking customer must inform all invited guests of these rules and is responsible for reasonable supervision and cooperation. A customer may be held responsible for a guest's conduct only to the extent supported by evidence, contract and applicable law; this document does not create automatic criminal liability for another person's independent act.",
      "If a person violates these Terms, THIRD SPACE may, as appropriate and lawful: refuse entry; stop or suspend the session; ask the person to leave; cancel the booking; restrict future bookings; withhold a refund to the extent permitted by the disclosed policy and law; document the incident; preserve relevant records; claim proven damage/loss; and report suspected offences to police or competent authorities. THIRD SPACE may pursue civil or criminal remedies where legally available. Only the competent authority/court decides criminal liability and penalties.",
      "THIRD SPACE will not impose a penalty, fine or charge that has no lawful basis. Any claim for damage must be supported by reasonable evidence and applicable law. Nothing in these Terms excludes the company's own statutory duties or liability that cannot legally be excluded.",
    ],
  },
  {
    heading: "8. Immediate safety response",
    paragraphs: [
      "If violence, a credible threat, suspected illegal activity, fire, medical emergency or immediate danger occurs, staff may stop the session and prioritise safety. Where safe, staff may call 112 or the appropriate emergency service, contact police, secure the area and preserve relevant CCTV/booking records. Customers must follow reasonable emergency instructions and must not obstruct staff or responders.",
      "Do not attempt to physically detain, search, punish or interrogate a customer. Staff should avoid escalating conflict and should record objective facts, witnesses and actions taken.",
    ],
  },
  {
    heading: "9. Recording, CCTV and privacy",
    paragraphs: [
      "Recording for a booked podcast/creator project requires appropriate permission from every identifiable participant. THIRD SPACE's promotional use of any guest image, voice or recording requires a separate optional written consent. CCTV, if used for security, must be disclosed by signage and managed with access controls and a defined retention period. No cameras are permitted in washrooms or other private spaces.",
      "Customer data and incident records are handled under the THIRD SPACE Privacy Notice and applicable law. The company may preserve relevant records when reasonably necessary for safety, legal claims, law enforcement requests or legal obligations, subject to applicable law.",
    ],
  },
  {
    heading: "10. Booking acceptance and policy access",
    paragraphs: [
      "Before payment, the booking software must display a short, plain-language summary and provide a clickable full version of these Terms. The customer must actively tick an initially unchecked box confirming acceptance. The booking cannot be completed unless the mandatory acceptance is recorded.",
      "The customer must confirm that all participants are 18+ and that they have informed every guest of the rules. Do not use a single checkbox to collect optional marketing consent or promotional recording permission. Store the policy version, language, timestamp, booking ID and affirmative action. Provide a downloadable copy in the booking confirmation.",
    ],
  },
];

/** 02–04 — service-specific rules from each addendum. */
export const ADDENDA: Record<ServiceId, { title: string; subtitle: string; rules: string[] }> = {
  theatre: {
    title: "Private Theatre — Terms Addendum",
    subtitle: "Adult-only entry • Content restrictions • Film screening clearance",
    rules: [
      "Only adults aged 18+ may enter, including every guest. No children or minors are admitted under this adult-only venue policy.",
      "No pornographic, nude, sexually explicit or otherwise prohibited content may be screened, streamed, cast, downloaded or shown. No sexual activity, nudity, smoking, vaping, alcohol or intoxicants are allowed.",
      "Film screenings may be offered only after THIRD SPACE verifies the necessary film exhibition licence, copyright permissions and other venue approvals for the intended screening. A personal OTT subscription does not itself prove commercial exhibition rights. If the legal clearance is not in place, the software must disable film-screening bookings.",
      "Customers must not bring or connect devices to display prohibited material, unlawful content or content intended to incite hatred or violence. The manager may stop a screening if content or behaviour creates a credible legal or safety concern.",
    ],
  },
  podcast: {
    title: "Podcast Studio — Terms Addendum",
    subtitle: "Adult-only participation • Recording rules • Publishing compliance",
    rules: [
      "Every host, guest, interviewee, producer, camera operator supplied by the customer and other participant must be 18+.",
      "No episode, recording or live stream may include nudity, pornography, sexually explicit activity, threats, incitement to violence, communal hatred, unlawful harassment or other unlawful content.",
      "The customer/producer is responsible for obtaining permission from every guest and securing rights for music, video clips, images, scripts and other third-party material. Guest recording consent and THIRD SPACE promotional consent are separate.",
      "Customers must not record staff or other visitors without permission. Do not secretly record private conversations. The studio may stop a session where prohibited conduct or unlawful content is being created.",
    ],
  },
  creator: {
    title: "Creator Studio — Terms Addendum",
    subtitle: "Adult-only shoots • Content restrictions • Creator responsibility",
    rules: [
      "Every creator, model, actor, guest, presenter, participant and customer-supplied crew member must be 18+.",
      "No nude shoots, sexual activity, pornographic/sexually explicit content, smoking/vaping scenes, alcohol promotion/use at the Venue, drug-related activity, violent stunts, weapons display or content designed to incite public disorder.",
      "Creators must follow Indian law and the rules of each platform on which content is intended to be published. This includes applicable copyright, privacy, advertising/disclosure, defamation, impersonation, synthetic/deepfake and community standards.",
      "Client must obtain written releases for all identifiable participants and permissions for music, images, brand assets and locations. THIRD SPACE portfolio/social-media use requires a separate optional release.",
    ],
  },
};

