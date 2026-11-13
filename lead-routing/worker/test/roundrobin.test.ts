import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { type Env } from "../src/index.ts";
import { inRoundRobin, roundRobinAe } from "../src/roundrobin.ts";
import type { Kv } from "../src/inbound.ts";

function fakeKv() {
  const store = new Map<string, string>();
  const kv: Kv & { store: Map<string, string> } = { store, get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) };
  return kv;
}

const base = {
  ANTHROPIC_API_KEY: "k", JAMES_URL: "https://james.example", JILL_URL: "https://jill.example",
  NOT_FIT_URL: "https://notfit.example", ALLOWED_ORIGINS: "https://www.momos.com",
} as Env;

async function submit(env: Env, form: Record<string, unknown>) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url.includes("api.anthropic.com")) {
      return Response.json({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
        content: [{ type: "text", text: JSON.stringify({ icp_fit: "fit", confidence: 0.9, reason: "Chain.", hq_region: "us_east" }) }] });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  try {
    const res = await worker.fetch(
      new Request("https://w.example", { method: "POST", headers: { origin: "https://www.momos.com" }, body: JSON.stringify({ firstName: "A", lastName: "B", company: "Co", title: "VP", country: "US", elapsedMs: 9000, ...form }) }),
      env,
      { waitUntil() {} },
    );
    return ((await res.json()) as { url: string }).url;
  } finally {
    globalThis.fetch = real;
  }
}

test("only 50-249 and 250+ enter the round robin", () => {
  assert.equal(inRoundRobin("50-249"), true);
  assert.equal(inRoundRobin("250+"), true);
  assert.equal(inRoundRobin("6-49"), false);
  assert.equal(inRoundRobin("1-5"), false);
  assert.equal(inRoundRobin(undefined), false);
});

test("50+ leads take turns between Jill and James, whatever the region", async () => {
  const env = { ...base, LEADS: fakeKv() } as Env;
  // A West Coast lead would go to James by region; round robin starts with Jill.
  assert.equal(await submit(env, { email: "a@one.com", locations: "250+", timezone: "America/Los_Angeles" }), "https://jill.example");
  assert.equal(await submit(env, { email: "b@two.com", locations: "50-249", timezone: "America/New_York" }), "https://james.example");
  assert.equal(await submit(env, { email: "c@three.com", locations: "250+", timezone: "America/Los_Angeles" }), "https://jill.example");
});

test("the same email comes back to the same AE, and doesn't move the turn", async () => {
  const env = { ...base, LEADS: fakeKv() } as Env;
  assert.equal(await submit(env, { email: "ceo@bigbrand.com", locations: "250+", timezone: "America/New_York" }), "https://jill.example");
  assert.equal(await submit(env, { email: "CEO@BigBrand.com ", locations: "250+", timezone: "America/Los_Angeles" }), "https://jill.example");
  assert.equal(await submit(env, { email: "other@x.com", locations: "250+", timezone: "America/New_York" }), "https://james.example");
});

test("under 50 locations keeps region routing", async () => {
  const env = { ...base, LEADS: fakeKv() } as Env;
  assert.equal(await submit(env, { email: "a@west.com", locations: "6-49", timezone: "America/Los_Angeles" }), "https://james.example");
  assert.equal(await submit(env, { email: "a@east.com", locations: "1-5", timezone: "America/New_York" }), "https://jill.example");
  assert.equal([...(env.LEADS as ReturnType<typeof fakeKv>).store.keys()].filter((k) => k.startsWith("rr:")).length, 0, "small leads don't touch the turn");
});

test("without the store, or if it fails, the region's AE is kept", async () => {
  assert.equal(await submit(base, { email: "a@west.com", locations: "250+", timezone: "America/Los_Angeles" }), "https://james.example");
  const broken: Kv = { get: async () => { throw new Error("kv down"); }, put: async () => {} };
  assert.equal(await roundRobinAe(broken, "a@b.com"), null);
});

test("spam never enters the round robin", async () => {
  const env = { ...base, LEADS: fakeKv() } as Env;
  assert.equal(await submit(env, { email: "x@mailinator.com", locations: "250+", timezone: "America/New_York" }), "https://notfit.example");
  assert.equal([...(env.LEADS as ReturnType<typeof fakeKv>).store.keys()].filter((k) => k.startsWith("rr:")).length, 0);
});

test("round robin counts each new lead once, per month and all time", async () => {
  const { roundRobinAe, roundRobinCounts } = await import("../src/roundrobin.ts");
  const store = new Map<string, string>();
  const kv = { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => void store.set(k, v) };
  const nov = new Date("2026-11-13T10:00:00Z");
  const dec = new Date("2026-12-02T10:00:00Z");
  await roundRobinAe(kv, "a@x.com", nov); // jill
  await roundRobinAe(kv, "b@x.com", nov); // james
  await roundRobinAe(kv, "a@x.com", nov); // repeat: jill again, not counted
  await roundRobinAe(kv, "c@x.com", dec); // jill
  const n = await roundRobinCounts(kv, "2026-11", dec);
  assert.deepEqual(n.this_month, { jill: 1, james: 1 });
  assert.deepEqual(n.all_time, { jill: 2, james: 1 });
  assert.equal(n.last, "jill");
  assert.equal(n.next_up, "james");
  assert.deepEqual((await roundRobinCounts(kv, undefined, dec)).this_month, { jill: 1, james: 0 });
});
