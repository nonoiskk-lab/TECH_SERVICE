import { holds } from "@/server/slots";
import { json } from "@/lib/api";

/** POST variant for navigator.sendBeacon on page hide. */
export async function POST(_req: Request, ctx: RouteContext<"/api/holds/[id]/release">) {
  const { id } = await ctx.params;
  await holds.release(id);
  return json({ ok: true });
}
