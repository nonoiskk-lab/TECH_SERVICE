import type { NextRequest } from "next/server";
import { getBookingForGuest } from "@/server/slots";
import { acceptanceCopy } from "@/lib/acceptance-copy";

/** Downloadable copy of the accepted declaration (policy section 10). */
export async function GET(req: NextRequest, ctx: RouteContext<"/book/confirmation/[id]/declaration">) {
  const { id } = await ctx.params;
  const b = await getBookingForGuest(id, req.nextUrl.searchParams.get("t") ?? "");
  if (!b?.acceptance) return new Response("Not found", { status: 404 });
  return new Response(acceptanceCopy(b, b.acceptance), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="THIRD-SPACE-${b.id}-declaration.txt"`,
      "cache-control": "no-store",
    },
  });
}
