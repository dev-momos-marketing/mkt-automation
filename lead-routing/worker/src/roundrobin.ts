// Round robin for big brands: a lead that picks 50-249 or 250+ locations goes to Jill and James
// in turn, whatever the region. Everyone else keeps the region's AE (route.ts).
//
// The same email within 30 days goes back to the AE it got before, so a repeat submission never
// lands with the other AE. State lives in the LEADS KV store; without it, the region's AE is kept.
// KV is eventually consistent, so two leads seconds apart can rarely both go to the same AE.
import type { AEKey } from "./route.ts";
import type { Kv } from "./inbound.ts";

export const ROUND_ROBIN_BUCKETS = ["50-249", "250+"];
export const ROUND_ROBIN_AES: AEKey[] = ["jill", "james"];
const LAST_KEY = "rr:last";
const STICKY_TTL_S = 30 * 24 * 3600;

export const inRoundRobin = (locations: unknown) => ROUND_ROBIN_BUCKETS.includes(String(locations ?? ""));

// The AE for this lead, or null to keep the region's AE.
export async function roundRobinAe(kv: Kv | undefined, email: string): Promise<AEKey | null> {
  if (!kv) return null;
  const sticky = email ? `rr:email:${email.trim().toLowerCase()}` : null;
  try {
    if (sticky) {
      const before = await kv.get(sticky);
      if (before === "jill" || before === "james") return before;
    }
    const last = await kv.get(LAST_KEY);
    const i = ROUND_ROBIN_AES.indexOf(last as AEKey);
    const next = ROUND_ROBIN_AES[(i + 1) % ROUND_ROBIN_AES.length];
    await kv.put(LAST_KEY, next);
    if (sticky) await kv.put(sticky, next, { expirationTtl: STICKY_TTL_S });
    return next;
  } catch (err) {
    console.error(JSON.stringify({ round_robin: "failed", error: err instanceof Error ? err.message : String(err) }));
    return null;
  }
}
