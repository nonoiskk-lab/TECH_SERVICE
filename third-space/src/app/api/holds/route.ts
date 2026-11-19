import { holds, SlotTakenError } from "@/server/slots";
import { bookablePackage, json } from "@/lib/api";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { packageId?: string; start?: string; durationMinutes?: number };
  const pkg = bookablePackage(body.packageId);
  if (!pkg || typeof body.start !== "string") return json({ error: "BAD_REQUEST" }, 400);
  try {
    const hold = await holds.create(pkg.id, body.start, Number(body.durationMinutes ?? pkg.durationMinutes));
    return json(hold, 201);
  } catch (e) {
    if (e instanceof SlotTakenError) return json({ error: "SLOT_TAKEN" }, 409);
    return json({ error: "BAD_REQUEST" }, 400);
  }
}
