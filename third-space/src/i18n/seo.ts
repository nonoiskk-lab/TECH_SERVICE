import type { Locale } from "@/config/site";

/**
 * Long-form local SEO copy. Original text written for THIRD SPACE. Numbers
 * (price, hours, capacity) are inserted from config by the page, never typed here.
 */
type SeoCopy = {
  sections: { h: string; p: string[] }[];
  faq: { q: string; a: string }[];
};

const podcastEn: SeoCopy = {
  sections: [
    {
      h: "Who this is for",
      p: [
        "Teachers turning their classes into a show, coaching institutes recording explainers, founders telling the story of their business, and friends who have talked about starting a podcast for a year.",
        "If you live in Dhanbad, Dhanbad's neighbourhoods or nearby towns like Jharia and Sindri, you no longer need to travel to Ranchi or Kolkata to record with proper sound.",
      ],
    },
    {
      h: "What you get in a session",
      p: [
        "A treated room so your voice sounds close and clean, mics for every speaker, a multi-camera setup, and lights that are already placed. A team member helps you start the recording and checks levels.",
        "You leave with the raw audio and video, so you can edit it yourself or ask us to cut the episode and a few reels.",
      ],
    },
    {
      h: "Before your first recording",
      p: [
        "Write three questions you want to answer, not a full script. Bring water, wear solid colours, and plan for a 10-minute warm-up conversation before you press record.",
        "If you are recording a guest, tell them that everyone on mic agrees to be recorded before the session starts. That is part of our booking.",
      ],
    },
  ],
  faq: [
    { q: "Do I need my own equipment?", a: "No. Mics, cameras, lights and recording are ready. Bring your topic and your guests." },
    { q: "Can I record a video podcast, or only audio?", a: "Both. Every session records multiple camera angles along with audio." },
    { q: "When do I get my files?", a: "Within 24 hours, as a private download link that stays open for 7 days." },
    { q: "Will you post my episode?", a: "No. Your recording is yours. We share a clip only with separate written consent." },
  ],
};

const podcastHi: SeoCopy = {
  sections: [
    {
      h: "Ye kiske liye hai",
      p: [
        "Teachers jo apni class ko show banana chahte hain, coaching institutes jo explainers record karte hain, founders jo apne business ki kahani sunana chahte hain, aur wo dost jo saal bhar se podcast shuru karne ki baat kar rahe hain.",
        "Dhanbad, uske mohalle ya Jharia aur Sindri jaise paas ke shehar me rehte hain to achhi sound ke liye ab Ranchi ya Kolkata jaane ki zaroorat nahi.",
      ],
    },
    {
      h: "Ek session me kya milta hai",
      p: [
        "Treated room jisse awaaz saaf aur paas lage, har speaker ke liye mic, multi-camera setup aur pehle se lagi lights. Team member recording shuru karne aur levels check karne me madad karta hai.",
        "Aap raw audio aur video lekar jaate hain; khud edit karein ya episode aur kuch reels hamse katwa lein.",
      ],
    },
    {
      h: "Pehli recording se pehle",
      p: [
        "Poori script nahi, teen sawal likhiye jinke jawab dene hain. Paani laaiye, plain colour pehniye, aur record dabane se pehle 10 minute ki warm-up baat-cheet rakhiye.",
        "Guest record kar rahe hain to unhe bata dijiye ki session se pehle mic par sab log recording ke liye haan bolte hain. Ye booking ka hissa hai.",
      ],
    },
  ],
  faq: [
    { q: "Apna equipment chahiye?", a: "Nahi. Mic, camera, lights aur recording ready hain. Bas topic aur guests laaiye." },
    { q: "Video podcast bhi ya sirf audio?", a: "Dono. Har session me audio ke saath kai camera angle record hote hain." },
    { q: "Files kab milengi?", a: "24 ghante ke andar, private download link se jo 7 din khula rehta hai." },
    { q: "Kya aap mera episode post karenge?", a: "Nahi. Recording aapki hai. Clip sirf alag likhit consent ke saath share hoti hai." },
  ],
};

const theatreEn: SeoCopy = {
  sections: [
    {
      h: "What a private room is",
      p: [
        "A small room booked only for your group: recliners, a big screen and proper sound, with nobody else walking in. It suits a date, a family evening or a birthday with a few close friends.",
        "Unlike a multiplex, you choose the time, the decor and the add-ons, and you pay one clear price for the room.",
      ],
    },
    {
      h: "What we play",
      p: [
        "We play only content that we are licensed to show. Pirated content, personal downloads and pen drives are not allowed. Ask us what is available when you book.",
      ],
    },
    {
      h: "Planning a celebration",
      p: [
        "Pick a theme, add a cake or a photo shoot, and book the slot in one go. For something custom, send us your idea and we reply with a quote.",
      ],
    },
  ],
  faq: [
    { q: "How many people can come?", a: "Each package lists its capacity. The room is sized for small groups." },
    { q: "Can we bring food?", a: "Outside food and drinks are not allowed. A celebration cake is fine." },
    { q: "Do we need ID?", a: "Yes. Every guest shows a government photo ID at entry." },
  ],
};

const theatreHi: SeoCopy = {
  sections: [
    {
      h: "Private room kya hai",
      p: [
        "Ek chhota room sirf aapke group ke liye: recliners, bada screen aur achha sound, aur koi bahar ka nahi. Date, family evening ya kuch kareebi doston ke saath birthday ke liye theek.",
        "Multiplex se alag, time, decor aur add-ons aap chunte hain, aur room ka ek saaf price dete hain.",
      ],
    },
    {
      h: "Hum kya chalate hain",
      p: [
        "Hum sirf wahi content chalate hain jiska licence hamare paas hai. Pirated content, personal download aur pen drive allowed nahi. Booking ke waqt poochh lijiye kya available hai.",
      ],
    },
    {
      h: "Celebration plan karna",
      p: ["Theme chuniye, cake ya photo shoot jodiye, aur ek hi baar me slot book kijiye. Kuch custom chahiye to idea bhejiye, hum quote bhejenge."],
    },
  ],
  faq: [
    { q: "Kitne log aa sakte hain?", a: "Har package par capacity likhi hai. Room chhote groups ke liye hai." },
    { q: "Khana la sakte hain?", a: "Bahar ka khana aur drinks allowed nahi. Celebration cake la sakte hain." },
    { q: "ID chahiye?", a: "Haan. Entry par har guest government photo ID dikhayega." },
  ],
};

export function podcastSeo(locale: Locale): SeoCopy {
  return locale === "hi" ? podcastHi : podcastEn;
}
export function theatreSeo(locale: Locale): SeoCopy {
  return locale === "hi" ? theatreHi : theatreEn;
}
