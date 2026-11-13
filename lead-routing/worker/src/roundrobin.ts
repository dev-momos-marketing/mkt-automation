// Round robin for big brands: a lead that picks 50-249 or 250+ locations goes to Jill and James
// in turn, whatever the region. Everyone else keeps the region's AE (route.ts).
//
// The same email within 30 days goes back to the AE it got before, so a repeat submission never
// lands with the other AE. State lives in the LEADS KV store; without it, the region's AE is kept.
// KV is eventually consistent, so two leads seconds apart can rarely both go to the same AE.
//
// Counters: each new assignment adds one to rr:count:<YYYY-MM>:<ae> and rr:count:all:<ae>.
// A repeat email doesn't count again. Ask Beacon "round robin split" to see them.
import type { AEKey } from "./route.ts";
import type { Kv } from "./inbound.ts";

export const ROUND_ROBIN_BUCKETS = ["50-249", "250+"];
export const ROUND_ROBIN_AES: AEKey[] = ["jill", "james"];
const LAST_KEY = "rr:last";
const STICKY_TTL_S = 30 * 24 * 3600;
const monthOf = (d: Date) => d.toISOString().slice(0, 7);
const countKey = (period: string, ae: AEKey) => `rr:count:${period}:${ae}`;

async function bump(kv: Kv, key: string) {
  const n = Number(await kv.get(key)) || 0;
  await kv.put(key, String(n + 1));
}

export const inRoundRobin = (locations: unknown) => ROUND_ROBIN_BUCKETS.includes(String(locations ?? ""));

// The AE for this lead, or null to keep the region's AE.
export async function roundRobinAe(kv: Kv | undefined, email: string, now = new Date()): Promise<AEKey | null> {
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
    try {
      await bump(kv, countKey(monthOf(now), next));
      await bump(kv, countKey("all", next));
    } catch (err) {
      // A missed count never changes who gets the lead.
      console.error(JSON.stringify({ round_robin: "count failed", error: err instanceof Error ? err.message : String(err) }));
    }
    return next;
  } catch (err) {
    console.error(JSON.stringify({ round_robin: "failed", error: err instanceof Error ? err.message : String(err) }));
    return null;
  }
}

// The split for a month (YYYY-MM, default this month) and since the start, plus who got the last one.
export async function roundRobinCounts(kv: Kv, month?: string, now = new Date()) {
  const m = month && /^\d{4}-\d{2}$/.test(month) ? month : monthOf(now);
  const read = async (period: string) =>
    Object.fromEntries(await Promise.all(ROUND_ROBIN_AES.map(async (ae) => [ae, Number(await kv.get(countKey(period, ae))) || 0]))) as Record<AEKey, number>;
  const last = (await kv.get(LAST_KEY)) as AEKey | null;
  const next_up = ROUND_ROBIN_AES[(ROUND_ROBIN_AES.indexOf(last as AEKey) + 1) % ROUND_ROBIN_AES.length];
  return { month: m, this_month: await read(m), all_time: await read("all"), last: last || null, next_up };
}
