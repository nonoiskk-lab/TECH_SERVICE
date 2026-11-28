import { describe, it, expect } from "vitest";
import { blockGeometry, laneOf, istMinutes } from "@/lib/day-lanes";

// 2030-01-01 in India: 10:00 IST = 04:30 UTC
const ist = (h: number, m = 0) => new Date(Date.UTC(2030, 0, 1, h - 5, m - 30));

describe("day calendar lanes", () => {
  it("puts the private room in Theatre, creator content in Studio, the rest of the studio in Podcast", () => {
    expect(laneOf("theatre-classic", "room")).toBe("theatre");
    expect(laneOf("celebration", "room")).toBe("theatre");
    expect(laneOf("small-celebration", "room")).toBe("theatre");
    expect(laneOf("podcast", "studio")).toBe("podcast");
    expect(laneOf("visit-tour", "studio")).toBe("podcast");
    expect(laneOf("creator-shoot", "studio")).toBe("studio");
    expect(laneOf("creator-plan", "studio")).toBe("studio");
  });
  it("reads India time from a UTC instant", () => {
    expect(istMinutes(ist(10, 0))).toBe(600);
    expect(istMinutes(ist(21, 30))).toBe(21 * 60 + 30);
  });
  it("places a block by minutes from opening", () => {
    expect(blockGeometry(ist(12, 0), ist(14, 0), 600, 1320)).toEqual({ top: 120, height: 120 });
  });
  it("clips to opening hours and keeps short sessions readable", () => {
    expect(blockGeometry(ist(9, 0), ist(11, 0), 600, 1320)).toEqual({ top: 0, height: 60 });
    expect(blockGeometry(ist(21, 0), ist(23, 0), 600, 1320)).toEqual({ top: 660, height: 60 });
    expect(blockGeometry(ist(10, 0), ist(10, 10), 600, 1320)).toEqual({ top: 0, height: 30 });
  });
  it("hides bookings entirely outside the shown hours", () => {
    expect(blockGeometry(ist(6, 0), ist(8, 0), 600, 1320)).toBeNull();
    expect(blockGeometry(ist(22, 30), ist(23, 30), 600, 1320)).toBeNull();
  });
});

import { CHECKLIST_ITEMS, dayClosed, doneCount, emptyChecklist, parseChecklist, isChecklistItem } from "@/lib/checklist";

describe("daily checklist state", () => {
  it("has the five items from the design file", () => {
    expect(CHECKLIST_ITEMS.map((i) => i.id)).toEqual(["projector_audio", "mic_camera", "sanitization", "recordings", "closing"]);
  });
  it("reads stored values defensively", () => {
    expect(parseChecklist(null)).toEqual(emptyChecklist());
    expect(parseChecklist("nope")).toEqual(emptyChecklist());
    const s = parseChecklist({ items: { projector_audio: { by: "A", at: "2030-01-01T10:00:00+05:30" }, bogus: { by: "x", at: "y" }, mic_camera: { by: 1 } }, note: "x".repeat(900) });
    expect(Object.keys(s.items)).toEqual(["projector_audio"]);
    expect(s.note).toHaveLength(500);
    expect(doneCount(s)).toBe(1);
    expect(dayClosed(s)).toBe(false);
  });
  it("closes the day only when every item is done", () => {
    const all = Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.id, { by: "A", at: "t" }]));
    expect(dayClosed(parseChecklist({ items: all }))).toBe(true);
  });
  it("accepts only known item ids", () => {
    expect(isChecklistItem("closing")).toBe(true);
    expect(isChecklistItem("__proto__")).toBe(false);
    expect(isChecklistItem("")).toBe(false);
  });
});
