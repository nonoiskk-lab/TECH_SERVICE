import { holds } from "@/server/slots";
import { json } from "@/lib/api";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/holds/[id]">) {
  const { id } = await ctx.params;
  await holds.release(id);
  return json({ ok: true });
}
