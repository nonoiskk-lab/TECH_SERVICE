"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hours as hoursCfg, sessionRules, booking as bookingCfg, recordingConsent, refundTiers, venueRules, type Locale, type Mode, type Package, type Theme } from "@/config/site";
import { tl, type Dict } from "@/i18n";
import { buildQuote, formatINR } from "@/lib/pricing";
import { defaultInput, durationText, priceLabel, resolveSession, type SessionInput, type TitleInfo } from "@/lib/session";
import { getFirstTouch, track } from "@/lib/analytics";
import type { ClientCatalog } from "@/server/catalog";
import type { CouponRule } from "@/lib/pricing";
import { BookingCalendar } from "./booking-calendar";
import { DECLARATION_CLOSING, DECLARATION_INTRO, DECLARATION_POINTS, DECLARATION_TITLE, EASY_SUMMARY, POLICY_DOCS, POLICY_PACK_VERSION } from "@/config/policies";

type Slot = { start: string; end: string; status: "available" | "held" | "booked" | "past" };
type Hold = { id: string; packageId?: string; start: string; end: string; expiresAt: string; durationMinutes?: number };

export type BookingFlowProps = {
  t: Dict;
  locale: Locale;
  /** Mode of this flow; decides which add-ons and consent apply. */
  mode: Mode | "any";
  packages: Package[];
  initialPackageId?: string;
  themes?: Theme[];
  /** Licensed titles for theatre packages (empty while the Legal Gate is closed). */
  titles?: TitleInfo[];
  minDate: string;
  maxDate: string;
  defaultDate: string;
  otpMode: "sms" | "mock" | "off";
  /** 0 when the site takes no online payment (whole amount paid at the venue). */
  advancePercent: number;
  /** Add-ons, tax, hold time and refund tiers from the admin-edited catalogue. */
  catalog: ClientCatalog;
  /** Details of the signed-in customer, used to prefill the form. */
  prefill?: { name: string; phone: string; email: string };
};

type Category = "theatre" | "podcast" | "celebration" | "creator" | "visit";
function categoryOf(p: Package): Category {
  if (p.mode === "visit") return "visit";
  if (p.service === "theatre") return "theatre";
  if (p.mode === "celebrate") return "celebration";
  if (p.prepaidHours) return "creator";
  return "podcast";
}

function timeLabel(iso: string) {
  const hh = Number(iso.slice(11, 13));
  const mm = iso.slice(14, 16);
  return `${((hh + 11) % 12) + 1}:${mm} ${hh < 12 ? "AM" : "PM"}`;
}

function dateLabel(date: string, locale: Locale) {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString(locale === "hi" ? "en-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

function StepTitle({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-bold">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${done ? "bg-warm text-warm-ink" : "border border-line text-muted"}`}
        aria-hidden="true"
      >
        {n}
      </span>
      {title}
    </h2>
  );
}

export function BookingFlow(props: BookingFlowProps) {
  const { t, locale, themes, minDate, maxDate, otpMode, advancePercent, catalog } = props;
  // Price exactly like the server: apply the admin-set minimum charge to the shared session rules.
  // eslint-disable-next-line react-hooks/immutability -- module-level config mirror, idempotent
  sessionRules.minimumCharge = catalog.minimumCharge;
  const categories = useMemo(() => [...new Set(props.packages.map(categoryOf))].filter((c) => c !== "visit"), [props.packages]);
  const initialCategory = props.packages.find((p) => p.id === props.initialPackageId) ?? props.packages[0];
  const [category, setCategory] = useState<Category | null>(initialCategory ? categoryOf(initialCategory) : null);
  const packages = useMemo(
    () => (props.mode === "any" && category ? props.packages.filter((p) => categoryOf(p) === category) : props.packages),
    [props.packages, props.mode, category],
  );
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponRule | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [payPlan, setPayPlan] = useState<"advance" | "full">("advance");
  const otpIsMock = otpMode === "mock";
  const otpRequired = otpMode !== "off";
  const router = useRouter();
  const [packageId, setPackageId] = useState(props.initialPackageId ?? packages[0]?.id ?? "");
  const pkg = packages.find((p) => p.id === packageId);
  const flowMode: Mode = props.mode === "any" ? (pkg?.mode ?? "create") : props.mode;
  const [themeId, setThemeId] = useState(themes?.[0]?.id ?? "");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [date, setDate] = useState(props.defaultDate);
  const [slotData, setSlotData] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [hold, setHold] = useState<Hold | null>(null);
  /** Wall clock, updated by a 1-second interval (0 until the first tick). */
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(props.prefill?.name ?? "");
  const [phone, setPhone] = useState(props.prefill?.phone ?? "");
  const [email, setEmail] = useState(props.prefill?.email ?? "");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpOk, setOtpOk] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [agreeVenue, setAgreeVenue] = useState(false);
  const [agreeRecording, setAgreeRecording] = useState(false);
  const [agreeDeclaration, setAgreeDeclaration] = useState(false);
  const [agreePromo, setAgreePromo] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [paying, setPaying] = useState(false);
  const holdRef = useRef<Hold | null>(null);
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  const availableAddOns = useMemo(() => catalog.addOns.filter((a) => a.modes.includes(flowMode)), [catalog.addOns, flowMode]);
  const titles = useMemo(() => props.titles ?? [], [props.titles]);
  const [inputs, setInputs] = useState<Record<string, SessionInput>>({});
  const inputFor = useCallback(
    (id: string): SessionInput => {
      const p = packages.find((x) => x.id === id);
      if (!p) return {};
      return inputs[id] ?? (p.pricing.kind === "title" ? { titleId: titles[0]?.id } : defaultInput(p));
    },
    [inputs, packages, titles],
  );
  const sessionInput = inputFor(packageId);
  const resolved = useMemo(() => (pkg ? resolveSession(pkg, sessionInput, titles) : null), [pkg, sessionInput, titles]);
  const session = resolved?.ok ? resolved.session : null;
  const duration = session?.durationMinutes ?? 0;
  const quote = useMemo(() => (pkg ? buildQuote(pkg, addOnIds, flowMode, session, advancePercent > 0 && payPlan === "full" ? 100 : advancePercent, { addOns: catalog.addOns, taxPercent: catalog.taxPercent, coupon }) : null),
    [pkg, addOnIds, flowMode, session, advancePercent, payPlan, catalog.addOns, catalog.taxPercent, coupon],
  );
  const needsRecordingConsent = pkg?.service === "podcast" || pkg?.service === "creator";
  const addendum = pkg && pkg.service !== "visit" && pkg.service !== "celebration" ? POLICY_DOCS[pkg.service] : null;
  const capacity = pkg?.capacity ?? 1;
  const isFree = (quote?.total ?? 0) === 0;

  const releaseHold = useCallback(async (h: Hold | null) => {
    if (!h) return;
    setHold(null);
    try {
      await fetch(`/api/holds/${h.id}`, { method: "DELETE", keepalive: true });
    } catch {}
  }, []);

  const slotKey = `${packageId}|${date}|${duration}|${refreshTick}`;
  const slots = slotData?.key === slotKey ? slotData.slots : null;
  const slotsLoading = slots === null;
  const loadSlots = useCallback(() => setRefreshTick((n) => n + 1), []);

  useEffect(() => {
    if (!packageId || !date || !duration) return;
    let cancelled = false;
    fetch(`/api/availability?date=${date}&packageId=${encodeURIComponent(packageId)}&duration=${duration}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<{ slots?: Slot[] }>)
      .then((j) => !cancelled && setSlotData({ key: slotKey, slots: j.slots ?? [] }))
      .catch(() => !cancelled && setSlotData({ key: slotKey, slots: [] }));
    return () => {
      cancelled = true;
    };
  }, [packageId, date, duration, slotKey]);

  useEffect(() => {
    if (pkg) track("view_package", { packageId: pkg.id, mode: flowMode });
  }, [pkg, flowMode]);

  // Countdown. Reads the wall clock every second so it stays correct if the
  // tab sleeps; expiry is handled in the timer callback.
  useEffect(() => {
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const h = holdRef.current;
      if (h && Date.parse(h.expiresAt) <= n) {
        holdRef.current = null;
        track("hold_expired", { packageId: h.packageId ?? "" });
        setError(t.book.holdExpired);
        releaseHold(h).then(loadSlots);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [releaseHold, loadSlots, t.book.holdExpired]);

  const remainingMs = hold ? (now === 0 ? catalog.holdMinutes * 60_000 : Date.parse(hold.expiresAt) - now) : 0;

  // Release the hold if the guest leaves the page.
  useEffect(() => {
    const onHide = () => {
      const h = holdRef.current;
      if (h) navigator.sendBeacon?.(`/api/holds/${h.id}/release`);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  async function pickPackage(id: string) {
    if (id === packageId) return;
    await releaseHold(hold);
    setPackageId(id);
    setAddOnIds([]);
  }

  async function changeInput(patch: SessionInput) {
    if (!pkg) return;
    const next = { ...sessionInput, ...patch };
    const r = resolveSession(pkg, next, titles);
    if (hold && (!r.ok || r.session.durationMinutes !== hold.durationMinutes)) await releaseHold(hold);
    setInputs((m) => ({ ...m, [pkg.id]: next }));
  }

  async function pickDate(d: string) {
    await releaseHold(hold);
    setDate(d);
  }

  async function pickSlot(s: Slot) {
    setError(null);
    track("select_slot", { packageId, start: s.start });
    const previous = hold;
    if (previous) await releaseHold(previous);
    const r = await fetch("/api/holds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId, start: s.start, durationMinutes: duration }),
    });
    if (r.status === 409) {
      setError(t.book.slotTaken);
      await loadSlots();
      return;
    }
    if (!r.ok) {
      setError(t.book.errorGeneric);
      return;
    }
    const h = (await r.json()) as Hold;
    holdRef.current = h;
    setHold(h);
    track("hold_started", { packageId, minutes: catalog.holdMinutes });
  }

  async function sendOtp() {
    setOtpMsg(null);
    const r = await fetch("/api/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "send", phone }),
    });
    if (r.ok) {
      setOtpSent(true);
      setOtpMsg(t.book.otpSent);
    } else setOtpMsg(t.book.errorGeneric);
  }

  async function verifyOtp() {
    const r = await fetch("/api/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "verify", phone, code: otp }),
    });
    const ok = r.ok && ((await r.json()) as { ok: boolean }).ok;
    setOtpOk(ok);
    setOtpMsg(ok ? t.book.otpVerified : t.book.otpWrong);
  }

  const detailsOk = name.trim().length >= 2 && /^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10)) && /.+@.+\..+/.test(email) && (otpOk || !otpRequired);
  const consentOk = agreeDeclaration && agreeVenue && (!needsRecordingConsent || agreeRecording);
  const canPay = !!hold && remainingMs > 0 && detailsOk && consentOk && !paying;

  async function applyCoupon() {
    if (!pkg) return;
    const r = await fetch("/api/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: couponInput.trim().toUpperCase(), packageId: pkg.id }),
    }).catch(() => null);
    if (r?.ok) {
      const j = (await r.json()) as { rule: CouponRule };
      setCoupon(j.rule);
      setCouponMsg(t.book.couponApplied.replace("{code}", j.rule.code));
    } else {
      setCoupon(null);
      setCouponMsg(t.book.couponInvalid);
    }
  }

  async function pay() {
    if (!hold || !pkg) return;
    setPaying(true);
    setError(null);
    track("consent_signed", { packageId: pkg.id, recording: needsRecordingConsent });
    if (!isFree) track("payment_started", { packageId: pkg.id, amount: quote?.advance ?? 0 });
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          holdId: hold.id,
          packageId: pkg.id,
          mode: flowMode,
          addOnIds,
          themeId: flowMode === "celebrate" ? themeId : undefined,
          session: sessionInput,
          guest: { name, phone, email },
          guestCount: Math.min(guestCount, capacity),
          locale,
          couponCode: coupon?.code,
          specialRequests,
          payPlan,
          consent: {
            declaration: agreeDeclaration,
            venue: agreeVenue,
            recording: needsRecordingConsent ? agreeRecording : undefined,
            promotional: agreePromo,
            marketing: agreeMarketing,
          },
          utm: getFirstTouch(),
        }),
      });
      if (r.status === 410) {
        setHold(null);
        setError(t.book.holdExpired);
        await loadSlots();
        return;
      }
      if (!r.ok) throw new Error();
      let j = (await r.json()) as { bookingId?: string; token?: string; orderId?: string; amount?: number; provider?: string; keyId?: string };
      if (j.orderId) {
        // Payment hand-off. The mock gateway confirms immediately; Razorpay
        // opens its checkout and we confirm with its signed response.
        let proof: { paymentId?: string; signature?: string } = {};
        if (j.provider === "razorpay" && j.keyId) {
          const res = await openRazorpay({ keyId: j.keyId, orderId: j.orderId, amount: j.amount ?? 0, name, email, phone });
          if (!res) {
            setError(t.book.paymentCancelled);
            return;
          }
          proof = res;
        }
        const c = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: j.orderId, ...proof }),
        });
        if (c.status === 410) {
          setHold(null);
          setError(t.book.holdExpired);
          await loadSlots();
          return;
        }
        if (!c.ok) throw new Error();
        j = (await c.json()) as { bookingId?: string; token?: string };
      }
      if (!j.bookingId) throw new Error();
      if (!isFree) track("payment_success", { packageId: pkg.id });
      setHold(null);
      router.push(`/book/confirmation/${j.bookingId}?t=${j.token ?? ""}`);
    } catch {
      setError(t.book.errorGeneric);
    } finally {
      setPaying(false);
    }
  }

  const mm = Math.max(0, Math.floor(remainingMs / 60000));
  const ss = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
  // Mobile sticky action: one primary button on screen. It hides while the review/pay section is visible.
  const checkoutRef = useRef<HTMLElement | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  useEffect(() => {
    const el = checkoutRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCheckoutVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [hold]);
  const showAddOns = availableAddOns.length > 0 && !isFree;
  const stepOffset = showAddOns ? 0 : -1;
  const visibleSlots = (slots ?? []).filter((s) => s.status !== "past");

  return (
    <div className={`grid gap-6 lg:grid-cols-[1fr_360px] ${hold ? "pb-24 lg:pb-0" : ""}`} data-testid="booking-flow">
      <div className="min-w-0 space-y-6">
        {hold && (
          <div
            className="ts-card ts-glow sticky top-[4.5rem] z-20 flex items-center justify-between gap-3 px-4 py-3"
            role="status"
            data-testid="hold-banner"
          >
            <span className="text-sm">
              {t.book.holdLabel}:{" "}
              <strong data-testid="hold-time">
                {dateLabel(hold.start.slice(0, 10), locale)}, {timeLabel(hold.start)} – {timeLabel(hold.end)}
              </strong>
            </span>
            <span className="font-heading text-xl font-extrabold tabular-nums text-warm" data-testid="hold-countdown" aria-label={`${mm}:${String(ss).padStart(2, "0")}`}>
              {mm}:{String(ss).padStart(2, "0")}
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger" data-testid="flow-error">
            {error}
          </p>
        )}

        {/* 1. Experience (on the general booking page) */}
        {props.mode === "any" && categories.length > 1 && (
          <section className="ts-card space-y-4 p-5" data-testid="experience-step">
            <h2 className="text-lg font-bold">{t.book.stepExperience}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t.book.stepExperience}>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={category === c}
                  onClick={() => {
                    setCategory(c);
                    const first = props.packages.find((p) => categoryOf(p) === c);
                    if (first) pickPackage(first.id);
                  }}
                  className={`min-h-14 rounded-2xl border px-3 text-sm font-semibold ${category === c ? "border-gold bg-raised" : "border-line"}`}
                  data-testid={`experience-${c}`}
                >
                  {t.book.experiences[c]}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 2. Package */}
        <section className="ts-card space-y-4 p-5">
          <StepTitle n={1} title={t.book.stepPackage} done={!!pkg} />
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">{t.book.stepPackage}</legend>
            {packages.map((p) => (
              <label
                key={p.id}
                data-selected={p.id === packageId}
                className={`ts-package-card flex min-h-11 cursor-pointer flex-col rounded-2xl border p-4 ${p.id === packageId ? "border-gold bg-raised" : "border-line"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name="package" value={p.id} checked={p.id === packageId} onChange={() => pickPackage(p.id)} className="h-5 w-5 accent-[var(--ts-warm)]" />
                    {tl(p.name, locale)}
                  </span>
                  <span className="font-bold text-warm">
                    {priceLabel(p, formatINR, t.common.free)}
                  </span>
                </span>
                <span className="mt-1 pl-7 text-xs text-faint">
                  {p.pricing.kind === "fixed" ? durationText(p.durationMinutes) : t.book.timeAuto} · {t.common.upTo} {p.capacity} {t.common.guests}
                </span>
              </label>
            ))}
          </fieldset>
          {themes && themes.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-muted">{t.book.theme}</legend>
              <div className="flex flex-wrap gap-2">
                {themes.map((th) => (
                  <label key={th.id} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 ${th.id === themeId ? "border-warm bg-raised" : "border-line"}`}>
                    <input type="radio" name="theme" value={th.id} checked={th.id === themeId} onChange={() => setThemeId(th.id)} className="accent-[var(--ts-warm)]" />
                    {tl(th.name, locale)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </section>

        {/* Session: time and price decided from what the guest wants to do */}
        {pkg && pkg.pricing.kind !== "fixed" && (
          <section className="ts-card space-y-4 p-5" data-testid="session-step">
            <h2 className="text-lg font-bold">{t.book.sessionTitle}</h2>
            {pkg.pricing.kind === "title" &&
              (titles.length === 0 ? (
                <p className="text-sm text-muted" data-testid="no-titles">
                  {t.book.noTitles}
                </p>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">{t.book.chooseTitle}</span>
                  <select className="ts-input" value={sessionInput.titleId ?? ""} onChange={(e) => changeInput({ titleId: e.target.value })} data-testid="title-select">
                    {titles.map((ti) => (
                      <option key={ti.id} value={ti.id}>
                        {ti.name} · {durationText(ti.runtimeMinutes)}
                        {ti.language ? ` · ${ti.language}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            {pkg.pricing.kind === "podcast" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">{t.book.episodeLength}</span>
                  <select className="ts-input" value={sessionInput.episodeMinutes} onChange={(e) => changeInput({ episodeMinutes: Number(e.target.value) })} data-testid="episode-length">
                    {sessionRules.podcast.episodeLengths.map((m) => (
                      <option key={m} value={m}>
                        {m} {t.common.minutes}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">{t.book.episodes}</span>
                  <select className="ts-input" value={sessionInput.episodes} onChange={(e) => changeInput({ episodes: Number(e.target.value) })} data-testid="episodes">
                    {Array.from({ length: sessionRules.podcast.maxEpisodes }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {pkg.pricing.kind === "creator" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">{t.book.reels}</span>
                  <select className="ts-input" value={sessionInput.reels} onChange={(e) => changeInput({ reels: Number(e.target.value) })} data-testid="reels">
                    {Array.from({ length: sessionRules.creator.maxReels + 1 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">{t.book.longVideos}</span>
                  <select className="ts-input" value={sessionInput.longVideos} onChange={(e) => changeInput({ longVideos: Number(e.target.value) })} data-testid="long-videos">
                    {Array.from({ length: sessionRules.creator.maxLongVideos + 1 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {pkg.pricing.kind === "hourly" && (
              <label className="block max-w-xs">
                <span className="mb-1 block text-sm text-muted">{t.book.hours}</span>
                <select className="ts-input" value={sessionInput.hours} onChange={(e) => changeInput({ hours: Number(e.target.value) })} data-testid="hours">
                  {Array.from({ length: sessionRules.space.maxHours - sessionRules.space.minHours + 1 }, (_, i) => i + sessionRules.space.minHours).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {session ? (
              <div className="rounded-xl bg-raised px-4 py-3 text-sm" data-testid="session-summary">
                <dl className="space-y-1">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t.book.workLabel[pkg.pricing.kind]}</dt>
                    <dd data-testid="work-time">{durationText(session.workMinutes)}</dd>
                  </div>
                  {session.setupMinutes > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">{t.book.setupLabel}</dt>
                      <dd data-testid="setup-time">+ {durationText(session.setupMinutes)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-line pt-1 font-semibold">
                    <dt>{t.book.sessionTime}</dt>
                    <dd>
                      {durationText(session.durationMinutes)} · {formatINR(session.basePrice)}
                    </dd>
                  </div>
                </dl>
                {session.minimumApplied && (
                  <p className="mt-2 text-xs text-warm" data-testid="minimum-note">
                    {t.book.minimumNote.replaceAll("{min}", formatINR(session.startingPrice))}
                  </p>
                )}
                <p className="mt-2 text-xs text-faint" data-testid="gap-note">
                  {t.book.gapNote.replace("{gap}", String(hoursCfg.bufferMinutes))}
                </p>
              </div>
            ) : (
              resolved &&
              !resolved.ok &&
              resolved.reason === "NEED_WORK" && <p className="text-sm text-danger">{t.book.needWork}</p>
            )}
          </section>
        )}

        {/* 2. Add-ons */}
        {showAddOns && (
          <section className="ts-card space-y-3 p-5">
            <StepTitle n={2} title={t.book.stepAddOns} done={addOnIds.length > 0} />
            <div className="grid gap-2 sm:grid-cols-2">
              {availableAddOns.map((a) => {
                const on = addOnIds.includes(a.id);
                return (
                  <label key={a.id} className="ts-option-row" data-selected={on}>
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setAddOnIds((xs) => (on ? xs.filter((x) => x !== a.id) : [...xs, a.id]))}
                        className="h-5 w-5 accent-[var(--ts-warm)]"
                        data-testid={`addon-${a.id}`}
                      />
                      {tl(a.name, locale)}
                    </span>
                    <span className="text-sm font-semibold text-warm">+{formatINR(a.price)}</span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Date and slot */}
        <section className="ts-card space-y-4 p-5">
          <StepTitle n={3 + stepOffset} title={t.book.stepSlot} done={!!hold} />
          {/* Price and cancellation rules are visible BEFORE a time is chosen (same numbers as the review step). */}
          {!isFree && quote && (
            <div className="rounded-xl bg-raised px-4 py-3 text-sm" data-testid="policy-glance">
              <p className="font-semibold">{t.book.policyGlance}</p>
              {(quote.advance ?? 0) > 0 ? (
                <p className="mt-1 text-muted">
                  {catalog.refundTiers.map((r, i) => `${refundTiers[i] ? tl(refundTiers[i].label, locale) : `${r.minHoursBefore}h+`}: ${r.refundPercentOfAdvance}%`).join(" · ")}
                </p>
              ) : (
                <p className="mt-1 text-muted">{t.book.venueNote}</p>
              )}
            </div>
          )}
          {pkg && duration > 0 && (
            <BookingCalendar
              t={t}
              packageId={pkg.id}
              duration={duration}
              selected={date}
              minDate={minDate}
              maxDate={maxDate}
              onSelect={(d) => pickDate(d)}
              refreshKey={refreshTick}
            />
          )}
          <label className="block max-w-xs">
            <span className="mb-1 block text-sm text-muted">{t.book.chooseDateTyped}</span>
            <input
              type="date"
              className="ts-input"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => e.target.value && pickDate(e.target.value)}
              data-testid="date-input"
            />
          </label>
          {duration > 0 && slotsLoading && !slots && <p className="text-sm text-muted">{t.book.loadingSlots}</p>}
          {slots && visibleSlots.length === 0 && <p className="text-sm text-muted">{t.book.noSlots}</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label={t.book.stepSlot}>
            {visibleSlots.map((s) => {
              const mine = hold?.start === s.start;
              const disabled = s.status !== "available" && !mine;
              return (
                <button
                  key={s.start}
                  type="button"
                  disabled={disabled}
                  aria-pressed={mine}
                  onClick={() => !mine && pickSlot(s)}
                  data-testid="slot"
                  data-start={s.start}
                  data-status={mine ? "mine" : s.status}
                  className="ts-chip"
                >
                  {timeLabel(s.start)}
                  <small>{t.book.until.replace("{time}", timeLabel(s.end))}</small>
                  {disabled && <span className="sr-only"> ({s.status === "booked" ? t.book.booked : t.book.held})</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Details */}
        <section className="ts-card space-y-4 p-5">
          <StepTitle n={4 + stepOffset} title={t.book.stepDetails} done={detailsOk} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span id="guest-count-label" className="mb-1 block text-sm text-muted">
                {t.book.guestCount}
              </span>
              <div className="ts-stepper" role="group" aria-labelledby="guest-count-label">
                <button type="button" aria-label={t.book.guestMinus} onClick={() => setGuestCount(Math.max(1, Math.min(guestCount, capacity) - 1))} disabled={Math.min(guestCount, capacity) <= 1} data-testid="guest-minus">
                  −
                </button>
                <output data-testid="guest-count" aria-live="polite">
                  {Math.min(guestCount, capacity)}
                </output>
                <button type="button" aria-label={t.book.guestPlus} onClick={() => setGuestCount(Math.min(capacity, Math.min(guestCount, capacity) + 1))} disabled={Math.min(guestCount, capacity) >= capacity} data-testid="guest-plus">
                  +
                </button>
              </div>
              <span className="mt-1 block text-xs text-faint">
                {t.common.upTo} {capacity} {t.common.guests} · {t.book.adultsOnly}
              </span>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">{t.book.name}</span>
              <input className="ts-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} data-testid="guest-name" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">{t.book.email}</span>
              <input className="ts-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="guest-email" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-muted">{t.book.specialRequests}</span>
              <textarea className="ts-input min-h-20" maxLength={1000} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} data-testid="special-requests" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">{t.book.phone}</span>
              <span className="flex gap-2">
                <input
                  className="ts-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ""));
                    setOtpOk(false);
                    setOtpSent(false);
                  }}
                  data-testid="guest-phone"
                />
                {otpRequired && (
                  <button type="button" className="ts-btn ts-btn-ghost shrink-0 text-sm" disabled={!/^[6-9]\d{9}$/.test(phone)} onClick={sendOtp} data-testid="send-otp">
                    {t.book.sendOtp}
                  </button>
                )}
              </span>
            </label>
            {otpSent && !otpOk && (
              <label className="block">
                <span className="mb-1 block text-sm text-muted">{t.book.otp}</span>
                <span className="flex gap-2">
                  <input className="ts-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} data-testid="otp-input" />
                  <button type="button" className="ts-btn ts-btn-ghost shrink-0 text-sm" onClick={verifyOtp} data-testid="verify-otp">
                    {t.book.verifyOtp}
                  </button>
                </span>
                {otpIsMock && <span className="mt-1 block text-xs text-faint">{t.book.otpTestMode}</span>}
              </label>
            )}
          </div>
          {otpMsg && (
            <p className={`text-sm ${otpOk ? "text-ok" : "text-muted"}`} role="status" data-testid="otp-status">
              {otpMsg}
            </p>
          )}
        </section>

        {/* 5. Review: rules and refund tiers BEFORE the pay button */}
        <section className="ts-card space-y-4 p-5" id="checkout" ref={checkoutRef}>
          <StepTitle n={5 + stepOffset} title={t.book.stepReview} done={consentOk} />
          <h3 className="font-semibold">{t.book.beforePay}</h3>
          {!isFree && (
            <div className="flex flex-wrap items-end gap-2" data-testid="coupon">
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-sm text-muted">{t.book.couponLabel}</span>
                <input className="ts-input uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} maxLength={40} data-testid="coupon-input" />
              </label>
              <button type="button" className="ts-btn ts-btn-ghost text-sm" onClick={applyCoupon} disabled={!couponInput.trim()} data-testid="coupon-apply">
                {t.book.couponApply}
              </button>
              {couponMsg && (
                <p className={`w-full text-sm ${coupon ? "text-ok" : "text-danger"}`} role="status" data-testid="coupon-status">
                  {couponMsg}
                </p>
              )}
            </div>
          )}
          {!isFree && advancePercent > 0 && (
            <fieldset className="space-y-1" data-testid="pay-plan">
              <legend className="mb-1 text-sm font-semibold text-muted">{t.book.payPlanTitle}</legend>
              {(["advance", "full"] as const).map((plan) => (
                <label key={plan} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 ${payPlan === plan ? "border-gold bg-raised" : "border-line"}`}>
                  <input type="radio" name="payplan" checked={payPlan === plan} onChange={() => setPayPlan(plan)} className="h-5 w-5 accent-[var(--ts-warm)]" data-testid={`pay-${plan}`} />
                  <span className="text-sm">{plan === "advance" ? t.book.payAdvance.replace("{pct}", String(advancePercent)) : t.book.payFull}</span>
                </label>
              ))}
            </fieldset>
          )}
          {!isFree && quote?.advance === 0 && (
            <p className="rounded-xl bg-raised px-4 py-3 text-sm" data-testid="venue-note">
              {t.book.venueNote}
            </p>
          )}
          {!isFree && (quote?.advance ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted">{t.book.refundTitle}</h4>
              <ul className="mt-2 space-y-1 text-sm" data-testid="refund-tiers">
                {catalog.refundTiers.map((r, i) => (
                  <li key={r.minHoursBefore} className="flex justify-between gap-3 border-b border-line/50 py-1">
                    <span>{refundTiers[i] ? tl(refundTiers[i].label, locale) : `${r.minHoursBefore}h+`}</span>
                    <strong>{r.refundPercentOfAdvance}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-muted">{t.book.rulesTitle}</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" data-testid="venue-rules">
              {venueRules.map((r) => (
                <li key={r.en}>{tl(r, locale)}</li>
              ))}
            </ul>
          </div>
          {needsRecordingConsent && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {recordingConsent.points.map((p) => (
                <li key={p.en}>{tl(p, locale)}</li>
              ))}
            </ul>
          )}
          <div data-testid="policy-summary">
            <h4 className="text-sm font-semibold text-muted">{t.book.summaryTitle}</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {EASY_SUMMARY.map((p) => (
                <li key={p.en}>{tl(p, locale)}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              {t.book.readFull}{" "}
              <a href={POLICY_DOCS.safety.path} target="_blank" rel="noopener" className="font-semibold text-warm underline underline-offset-4" data-testid="link-safety">
                {POLICY_DOCS.safety.title}
              </a>
              {addendum && (
                <>
                  {" · "}
                  <a href={addendum.path} target="_blank" rel="noopener" className="font-semibold text-warm underline underline-offset-4" data-testid="link-addendum">
                    {addendum.title}
                  </a>
                </>
              )}{" "}
              <span className="text-faint">(v{POLICY_PACK_VERSION})</span>
            </p>
          </div>
          <div className="rounded-xl border border-warm/50 bg-raised p-4" data-testid="declaration">
            <h4 className="font-bold">{DECLARATION_TITLE}</h4>
            <p className="mt-2 text-sm">{DECLARATION_INTRO}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {DECLARATION_POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <p className="mt-2 text-sm font-semibold">{DECLARATION_CLOSING}</p>
            {locale === "hi" && <p className="mt-2 text-xs text-faint">{t.book.declarationHi}</p>}
            <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--ts-warm)]"
                checked={agreeDeclaration}
                onChange={(e) => setAgreeDeclaration(e.target.checked)}
                data-testid="consent-declaration"
                required
              />
              <span className="text-sm font-semibold">{t.book.consentDeclaration}</span>
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--ts-warm)]" checked={agreeVenue} onChange={(e) => setAgreeVenue(e.target.checked)} data-testid="consent-venue" />
            <span className="text-sm">{t.book.consentVenue}</span>
          </label>
          {needsRecordingConsent && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--ts-warm)]" checked={agreeRecording} onChange={(e) => setAgreeRecording(e.target.checked)} data-testid="consent-recording" />
              <span className="text-sm">{t.book.consentRecording}</span>
            </label>
          )}
          <fieldset className="space-y-1 border-t border-line pt-3">
            <legend className="text-xs font-semibold uppercase tracking-widest text-faint">{t.book.optionalTitle}</legend>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--ts-warm)]" checked={agreePromo} onChange={(e) => setAgreePromo(e.target.checked)} data-testid="consent-promotional" />
              <span className="text-sm text-muted">{t.book.consentPromotional}</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--ts-warm)]" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} data-testid="consent-marketing" />
              <span className="text-sm text-muted">{t.book.consentMarketing}</span>
            </label>
          </fieldset>
          {!hold && <p className="text-sm text-faint">{t.book.needSlot}</p>}
          <button type="button" className="ts-btn ts-btn-primary w-full text-base" disabled={!canPay} onClick={pay} data-testid="pay-button">
            {paying
              ? t.book.paying
              : isFree
                ? t.book.confirmFree
                : (quote?.advance ?? 0) === 0
                  ? t.book.confirmVenue.replace("{amount}", formatINR(quote?.total ?? 0))
                  : `${t.book.pay} ${formatINR(quote?.advance ?? 0)}`}
          </button>
        </section>
      </div>

      {/* Itemised summary, the same numbers the server charges. */}
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="ts-card p-5" data-testid="quote">
          <h2 className="text-lg font-bold">{t.book.summary}</h2>
          {quote && (
            <dl className="mt-4 space-y-2 text-sm">
              {quote.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <dt className="text-muted">{tl(l.label, locale)}</dt>
                  <dd>{formatINR(l.amount)}</dd>
                </div>
              ))}
              {quote.discount > 0 && (
                <div className="flex justify-between gap-3 text-ok" data-testid="quote-discount">
                  <dt>
                    {t.book.discount} ({coupon?.code})
                  </dt>
                  <dd>−{formatINR(quote.discount)}</dd>
                </div>
              )}
              <div className="ts-summary-row border-t border-line pt-2">
                <dt className="text-muted">{t.book.subtotal}</dt>
                <dd>{formatINR(quote.subtotal)}</dd>
              </div>
              <div className="ts-summary-row">
                <dt className="text-muted">
                  {tl(bookingCfg.taxLabel, locale)} ({catalog.taxPercent}%)
                </dt>
                <dd>{formatINR(quote.tax)}</dd>
              </div>
              <div className="ts-summary-row" data-emphasis="true">
                <dt>{t.book.total}</dt>
                <dd data-testid="quote-total">{formatINR(quote.total)}</dd>
              </div>
              {!isFree && quote.advance === 0 && (
                <div className="flex justify-between gap-3 rounded-lg bg-raised px-3 py-2 font-semibold text-warm" data-testid="pay-at-venue">
                  <dt>{t.book.balanceVenue}</dt>
                  <dd>{formatINR(quote.total)}</dd>
                </div>
              )}
              {!isFree && quote.advance > 0 && (
                <>
                  <div className="flex justify-between gap-3 rounded-lg bg-raised px-3 py-2 font-semibold text-warm">
                    <dt>
                      {t.book.advanceNow} · {advancePercent}%
                    </dt>
                    <dd data-testid="quote-advance">{formatINR(quote.advance)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3">
                    <dt className="text-muted">{t.book.balanceVenue}</dt>
                    <dd data-testid="quote-balance">{formatINR(quote.balance)}</dd>
                  </div>
                </>
              )}
            </dl>
          )}
          {!quote && <p className="mt-3 text-sm text-muted">{t.book.selectPackageFirst}</p>}
        </div>
      </aside>

      {hold && !checkoutVisible && quote && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line ts-glass px-4 py-3 shadow-[var(--ts-shadow-cover)] lg:hidden" data-testid="sticky-cta">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <span className="text-sm">
              <span className="block text-muted">{t.book.stickyTotal}</span>
              <strong className="text-lg">{formatINR(quote.total)}</strong>
            </span>
            <button type="button" className="ts-btn ts-btn-primary" onClick={() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" })} data-testid="sticky-cta-button">
              {t.book.stickyReview}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };

/** Loads Razorpay Checkout and resolves with its signed result, or null if the guest closes it. */
function openRazorpay(o: { keyId: string; orderId: string; amount: number; name: string; email: string; phone: string }) {
  return new Promise<{ paymentId: string; signature: string } | null>((resolve) => {
    const start = () => {
      const Ctor = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (!Ctor) return resolve(null);
      new Ctor({
        key: o.keyId,
        order_id: o.orderId,
        amount: o.amount, // paise
        currency: "INR",
        name: "THIRD SPACE",
        prefill: { name: o.name, email: o.email, contact: o.phone },
        theme: { color: "#f2a33a" },
        handler: (r: { razorpay_payment_id: string; razorpay_signature: string }) => resolve({ paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
        modal: { ondismiss: () => resolve(null) },
      }).open();
    };
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return start();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = start;
    s.onerror = () => resolve(null);
    document.body.appendChild(s);
  });
}
