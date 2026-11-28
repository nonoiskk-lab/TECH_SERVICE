import { describe, it, expect } from "vitest";
import { canOpsTransition, nextOpsActions } from "@/server/booking-state";

const past = new Date(Date.now() - 3600_000);
const future = new Date(Date.now() + 3600_000);

describe("operational booking transitions", () => {
  it("follows confirmed -> checked_in -> in_progress -> completed", () => {
    expect(canOpsTransition("confirmed", "checked_in")).toBe(true);
    expect(canOpsTransition("checked_in", "in_progress")).toBe(true);
    expect(canOpsTransition("in_progress", "completed")).toBe(true);
    expect(canOpsTransition("checked_in", "completed")).toBe(true);
  });
  it("never completes or reopens bookings in other states", () => {
    for (const s of ["pending_payment", "cancelled", "refund_pending", "refunded", "completed", "no_show", "stopped"]) {
      expect(canOpsTransition(s, "completed"), s).toBe(false);
      expect(canOpsTransition(s, "in_progress"), s).toBe(false);
      expect(canOpsTransition(s, "checked_in"), s).toBe(false);
    }
    expect(canOpsTransition("completed", "in_progress")).toBe(false);
  });
  it("cannot skip check-in", () => {
    expect(canOpsTransition("confirmed", "in_progress")).toBe(false);
    expect(canOpsTransition("confirmed", "completed")).toBe(false);
  });
  it("no-show only after the session start time", () => {
    expect(canOpsTransition("confirmed", "no_show", { start: future })).toBe(false);
    expect(canOpsTransition("confirmed", "no_show", { start: past })).toBe(true);
    expect(canOpsTransition("checked_in", "no_show", { start: past })).toBe(false);
  });
  it("lists the next actions", () => {
    expect(nextOpsActions("in_progress")).toEqual(["completed", "stopped"]);
    expect(nextOpsActions("cancelled")).toEqual([]);
  });
});
