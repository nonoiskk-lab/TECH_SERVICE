import "server-only";
import { addOns as addOnsList, booking as bookingRules, hours, refundTiers as refundTierList, type AddOn, type L, type Package, type Pricing } from "@/config/site";
import { packages as packageList } from "@/config/packages";
import { db } from "@/server/db";

/**
 * Admin-editable catalogue. Packages, add-ons and business rules live in
 * Postgres; this loader copies them into the shared config objects that the
 * rest of the server reads synchronously. The seed values in src/config are
 * the fallback, so the site keeps working if the database is unreachable.
 *
 * Cache: 30 s per server instance; admin saves call invalidateCatalog() so
 * the instance that saved sees the change at once.
 */
const TTL_MS = 30_000;

export type ResourceRules = { id: string; name: string; open: string; close: string; slotStepMinutes: number; bufferMinutes: number; bookingWindowDays: number; active: boolean };
const resourceMap = ((globalThis as unknown as { __tsResources?: Map<string, ResourceRules> }).__tsResources ??= new Map());
/** Opening hours, grid, buffer and window for a resource (falls back to the business defaults). */
export function resourceRules(id: string): ResourceRules {
  return (
    resourceMap.get(id) ?? {
      id,
      name: id === "room" ? "Private Theatre" : "Podcast & Creator Studio",
      open: hours.open,
      close: hours.close,
      slotStepMinutes: hours.slotStepMinutes,
      bufferMinutes: hours.bufferMinutes,
      bookingWindowDays: bookingRules.bookingWindowDays,
      active: true,
    }
  );
}
/** Package ids that share a staff member or equipment item with this package. */
const assetPeers = ((globalThis as unknown as { __tsAssetPeers?: Map<string, string[]> }).__tsAssetPeers ??= new Map());
export function sharedAssetPeers(packageId: string): string[] {
  return assetPeers.get(packageId) ?? [];
}
const g = globalThis as unknown as { __tsCatalogAt?: number; __tsCatalogLoading?: Promise<void> };

export type BusinessRules = {
  taxPercent: number;
  taxLabel: string;
  advancePercent: number;
  holdMinutes: number;
  minimumCharge: number;
  refundTiers: { minHoursBefore: number; refundPercentOfAdvance: number }[];
};

function toPricing(kind: string, rate: number, start: number): Pricing {
  switch (kind) {
    case "title":
    case "podcast":
    case "creator":
    case "hourly":
      return { kind, ratePerHour: rate, startingPrice: start };
    default:
      return { kind: "fixed" };
  }
}

type PackageRow = Awaited<ReturnType<typeof db.package.findMany>>[number];

export function rowToPackage(r: PackageRow): Package & { active: boolean; resourceId: string; category: string; setupMinutes: number } {
  const pricing = toPricing(r.pricingKind, r.ratePerHour, r.startingPrice);
  return {
    id: r.id,
    mode: r.mode as Package["mode"],
    service: r.service as Package["service"],
    name: { en: r.nameEn, hi: r.nameHi },
    summary: { en: r.summaryEn, hi: r.summaryHi },
    pricing,
    price: pricing.kind === "fixed" ? r.startingPrice : 0,
    durationMinutes: r.durationMinutes,
    capacity: r.maxGuests,
    includes: (Array.isArray(r.inclusions) ? r.inclusions : []) as L[],
    prepaidHours: r.planHours ?? undefined,
    prepaidValidityDays: r.planValidityDays ?? undefined,
    requiresLegalGate: r.requiresLegalGate,
    excludeFromFromPrice: r.startingPrice === 0,
    priceList: r.showInPriceList && r.priceListLabelEn
      ? { label: { en: r.priceListLabelEn, hi: r.priceListLabelHi || r.priceListLabelEn }, includes: { en: r.priceListNoteEn, hi: r.priceListNoteHi || r.priceListNoteEn }, plus: r.pricePlus }
      : undefined,
    setupMinutes: r.setupMinutes,
    active: r.active,
    resourceId: r.resourceId,
    category: r.category,
  };
}

async function load() {
  const [pkgs, adds, settings, resources, links] = await Promise.all([
    db.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.addOn.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.setting.findMany({ where: { key: { in: ["business"] } } }),
    db.resource.findMany(),
    db.packageAsset.findMany({ where: { asset: { active: true } } }),
  ]);
  resourceMap.clear();
  for (const r of resources) {
    resourceMap.set(r.id, {
      id: r.id,
      name: r.name,
      open: r.openTime,
      close: r.closeTime,
      slotStepMinutes: r.slotStepMinutes,
      bufferMinutes: r.bufferMinutes,
      bookingWindowDays: r.bookingWindowDays,
      active: r.active,
    });
  }
  assetPeers.clear();
  const byAsset = new Map<string, string[]>();
  for (const l of links) byAsset.set(l.assetId, [...(byAsset.get(l.assetId) ?? []), l.packageId]);
  for (const ids of byAsset.values()) for (const id of ids) assetPeers.set(id, [...new Set([...(assetPeers.get(id) ?? []), ...ids.filter((x) => x !== id)])]);
  if (pkgs.length > 0) packageList.splice(0, packageList.length, ...pkgs.map(rowToPackage));
  if (adds.length > 0 || (await db.addOn.count()) > 0) {
    addOnsList.splice(0, addOnsList.length, ...adds.map((a): AddOn => ({ id: a.id, name: { en: a.nameEn, hi: a.nameHi }, price: a.price, modes: a.modes as AddOn["modes"] })));
  }
  const b = settings.find((s) => s.key === "business")?.value as Partial<BusinessRules> | undefined;
  if (b) {
    if (typeof b.taxPercent === "number") bookingRules.taxPercent = b.taxPercent;
    if (typeof b.advancePercent === "number") bookingRules.advancePercent = b.advancePercent;
    if (typeof b.holdMinutes === "number") bookingRules.holdMinutes = b.holdMinutes;
    if (Array.isArray(b.refundTiers) && b.refundTiers.length === refundTierList.length) {
      b.refundTiers.forEach((t, i) => {
        refundTierList[i].minHoursBefore = t.minHoursBefore;
        refundTierList[i].refundPercentOfAdvance = t.refundPercentOfAdvance;
      });
    }
  }
  g.__tsCatalogAt = Date.now();
}

/** Make sure the catalogue is fresh (at most 30 s old). Never throws. */
export async function ensureCatalog() {
  if (g.__tsCatalogAt && Date.now() - g.__tsCatalogAt < TTL_MS) return;
  g.__tsCatalogLoading ??= load()
    .catch((e) => console.error("catalog load failed; using seed values", e))
    .finally(() => {
      g.__tsCatalogLoading = undefined;
    });
  await g.__tsCatalogLoading;
}

export function invalidateCatalog() {
  g.__tsCatalogAt = undefined;
}

/** Values the browser needs to price exactly like the server. */
export function clientCatalog() {
  return {
    addOns: addOnsList.map((a) => ({ ...a })),
    taxPercent: bookingRules.taxPercent,
    holdMinutes: bookingRules.holdMinutes,
    refundTiers: refundTierList.map((r) => ({ ...r })),
  };
}
export type ClientCatalog = ReturnType<typeof clientCatalog>;
