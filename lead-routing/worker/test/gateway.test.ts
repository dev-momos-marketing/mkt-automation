import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { type Env } from "../src/index.ts";
import { claudeRoute } from "../src/claude.ts";

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acct123/momos-leads/anthropic";

test("gateway settings are trimmed and optional", () => {
  assert.deepEqual(claudeRoute({}), { baseURL: undefined, token: undefined });
  assert.deepEqual(claudeRoute({ AI_GATEWAY_URL: ` ${GATEWAY}/ `, AI_GATEWAY_TOKEN: " t0k " }), { baseURL: GATEWAY, token: "t0k" });
});

test("with AI_GATEWAY_URL, the fit check and the research both go through the gateway", async () => {
  const calls: { url: string; auth: string | null; key: string | null }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url.includes("hooks.zapier.com")) return new Response("ok");
    if (req.url.startsWith("https://cloudflare-dns.com") || req.url.includes("dns")) return Response.json({ Answer: [{ data: "mx.example" }] });
    if (req.url.startsWith(GATEWAY)) {
      calls.push({ url: req.url, auth: req.headers.get("cf-aig-authorization"), key: req.headers.get("x-api-key") });
      const json = (await req.clone().json()) as any;
      const out = json.tools
        ? { verdict: "verified", icp_fit: "fit", confidence: 0.9, company_name: "Burger Co", company_website: "", industry: "QSR", locations_claimed: "6-49", locations_found: "18", hq_country: "US", region: "us_west", person_matches_company: true, red_flags: [], summary: "18-unit QSR.", sources: [] }
        : { icp_fit: "fit", confidence: 0.9, reason: "QSR chain.", hq_region: "us_west" };
      return Response.json({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", stop_sequence: null, content: [{ type: "text", text: JSON.stringify(out) }], usage: { input_tokens: 1, output_tokens: 1 } });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  const env = {
    ANTHROPIC_API_KEY: "sk-test", ZAPIER_HOOK_URL: "https://hooks.zapier.com/hooks/catch/1/2/", JAMES_URL: "https://james.example", JILL_URL: "https://jill.example",
    NOT_FIT_URL: "https://notfit.example", ALLOWED_ORIGINS: "https://www.momos.com", AI_GATEWAY_URL: GATEWAY, AI_GATEWAY_TOKEN: "gw-token",
  } as Env;
  const waits: Promise<unknown>[] = [];
  try {
    const res = await worker.fetch(
      new Request("https://w.example", { method: "POST", headers: { origin: "https://www.momos.com" }, body: JSON.stringify({ firstName: "Ana", lastName: "Lopez", email: "ana@burgerco.com", company: "Burger Co", title: "VP Marketing", country: "US", locations: "6-49", timezone: "America/Los_Angeles", elapsedMs: 9000 }) }),
      env,
      { waitUntil: (p) => waits.push(p) },
    );
    assert.equal(((await res.json()) as { url: string }).url, "https://james.example");
    await Promise.all(waits);
    assert.equal(calls.length, 2, "fit check + research");
    for (const c of calls) {
      assert.match(c.url, /^https:\/\/gateway\.ai\.cloudflare\.com\/v1\/acct123\/momos-leads\/anthropic\/v1\/messages/);
      assert.equal(c.auth, "Bearer gw-token");
      assert.equal(c.key, "sk-test");
    }
  } finally {
    globalThis.fetch = real;
  }
});
