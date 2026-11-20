import { isLegalGateOpen } from "@/config/site";
import { json } from "@/lib/api";
import { publicBusiness } from "@/lib/business";

/** Public, non-secret business facts. Used by the CI consistency check. */
export async function GET() {
  return json({ ...publicBusiness("en"), gateOpen: isLegalGateOpen() });
}
