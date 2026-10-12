import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { type Env } from "../src/index.ts";
import { instantRoute, regionFor } from "../src/route.ts";

const env: Env = {
  ANTHROPIC_API_KEY: "test-key",
  ZAPIER_HOOK_URL: "https://hooks.zapier.com/hooks/catch/1/2/",
  JAMES_URL: "https://james.example",
  JILL_URL: "https://jill.example",
  NOT_FIT_URL: "https://notfit.example",
  ALLOWED_ORIGINS: "https://www.momos.com",
};

const form = {
  firstName: "Ana",
  lastName: "Lopez",
  email: "ana@burgerco.com",
  company: "Burger Co",
  title: "VP Marketing",
  country: "US",
  locations: "6-49",
  website: "",
  region_tab: "na",
  elapsedMs: 15000,
  timezone: "America/Los_Angeles",
  utm_source: "google",
};

test("regions", () => {
  assert.equal(regionFor("US", "America/Los_Angeles"), "us_west");
  assert.equal(regionFor("US", "America/Denver"), "us_west");
  assert.equal(regionFor("US", "America/New_York"), "us_east");
  assert.equal(regionFor("US", "America/Chicago"), "us_east");
  assert.equal(regionFor("CA", "America/Vancouver"), "us_west");
  assert.equal(regionFor("MX", "America/Tijuana"), "us_west");
  assert.equal(regionFor("MX", "America/Mexico_City"), "us_east");
  assert.equal(regionFor("AE", "Asia/Dubai"), "emea");
  assert.equal(regionFor("GB", ""), "emea");
  assert.equal(regionFor("SG", ""), "apac");
  assert.equal(regionFor("OTHER", "Asia/Riyadh"), "emea");
  assert.equal(regionFor("OTHER", "Asia/Manila"), "apac");
  assert.equal(regionFor("OTHER", "America/Sao_Paulo"), "us_east");
  assert.equal(regionFor("OTHER", ""), "unknown");
});

test("IP state is the backup when the time zone is missing or foreign", () => {
  // Time zone wins when it is North American.
  assert.equal(regionFor("US", "America/New_York", { country: "US", regionCode: "CA" }), "us_east");
  // Travelling or odd browser settings: fall back to the IP state.
  assert.equal(regionFor("US", "Europe/London", { country: "US", regionCode: "CA" }), "us_west");
  assert.equal(regionFor("US", "", { country: "US", regionCode: "AZ" }), "us_west");
  assert.equal(regionFor("US", "", { country: "US", regionCode: "NY" }), "us_east");
  assert.equal(regionFor("CA", "", { country: "CA", regionCode: "BC" }), "us_west");
  assert.equal(regionFor("US", "", {}), "us_east");
  assert.equal(regionFor("OTHER", "", { country: "US", regionCode: "WA" }), "us_west");
  assert.equal(regionFor("OTHER", "", { country: "FR", regionCode: "IDF" }), "unknown");
});

test("instant routing", () => {
  assert.equal(instantRoute(form).ae, "james");
  assert.equal(instantRoute({ ...form, country: "AU", timezone: "Australia/Sydney" }).ae, "james");
  assert.equal(instantRoute({ ...form, timezone: "America/New_York" }).ae, "jill");
  assert.equal(instantRoute({ ...form, country: "AE" }).ae, "jill");
  assert.equal(instantRoute({ ...form, website: "http://spam" }).status, "spam");
  assert.equal(instantRoute({ ...form, elapsedMs: 900 }).status, "spam");
  assert.equal(instantRoute({ ...form, email: "x@mailinator.com" }).status, "spam");
  assert.equal(instantRoute({ ...form, locations: "1-5" }).status, "routed");
});

test("instant routing is microseconds", () => {
  const n = 100_000;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) instantRoute(form);
  const us = ((performance.now() - t0) / n) * 1000;
  console.log(`instantRoute: ${us.toFixed(2)} microseconds`);
  assert.ok(us < 100);
});

// Fake Claude replies.
function claudeJson(model: string, out: unknown) {
  return Response.json({
    id: "msg_1",
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: JSON.stringify(out) }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  });
}

const fitOk = { icp_fit: "fit", confidence: 0.9, reason: "Burger chain with 18 locations." };
type Handler = (req: Request) => Response | Promise<Response>;

// Runs the Worker with Claude, DNS, the company homepage and Zapier faked out.
// `fit` answers the Haiku gate, `claude` answers the Opus research.
async function run(body: unknown, claude: Handler, opts: { fit?: Handler; env?: Env } = {}) {
  const sent: any[] = [];
  const fitCalls: any[] = [];
  const pages: string[] = [];
  const fit: Handler = opts.fit ?? (() => claudeJson("claude-haiku-5-5", fitOk));
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    if (req.url.includes("cloudflare-dns.com")) return Response.json({ Status: 0, Answer: [{}] });
    if (req.url.includes("hooks.zapier.com")) {
      sent.push(await req.json());
      return new Response("ok");
    }
    if (req.url.includes("api.anthropic.com")) {
      const json = (await req.clone().json()) as any;
      if (json.model === "claude-haiku-5-5") {
        fitCalls.push(json);
        return fit(req);
      }
      return claude(req);
    }
    if (req.url.startsWith("https://burgerco.com")) {
      pages.push(req.url);
      return new Response(
        '<html><head><title>Burger Co &amp; Friends | 18 Locations</title><meta name="description" content="Smash burgers across California."></head></html>',
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;

  const waits: Promise<unknown>[] = [];
  try {
    const t0 = performance.now();
    const res = await worker.fetch(
      new Request("https://w.example", {
        method: "POST",
        headers: { "content-type": "text/plain", origin: "https://www.momos.com" },
        body: JSON.stringify(body),
      }),
      opts.env ?? env,
      { waitUntil: (p) => waits.push(p) },
    );
    const ms = performance.now() - t0;
    const json = (await res.json()) as { url: string };
    await Promise.all(waits);
    return { res, json, ms, sent, fitCalls, pages };
  } finally {
    globalThis.fetch = realFetch;
  }
}

const verification = {
  verdict: "verified",
  icp_fit: "fit",
  confidence: 0.92,
  company_name: "Burger Co",
  company_website: "https://burgerco.com",
  industry: "QSR",
  locations_claimed: "6-49",
  locations_found: "18",
  hq_country: "US",
  region: "us_west",
  person_matches_company: true,
  red_flags: [],
  summary: "Burger Co, 18-unit QSR in California. VP Marketing, work email.",
  sources: ["https://burgerco.com/locations"],
};

const claudeOk = async (req: Request) => {
  const body = (await req.json()) as any;
  assert.equal(body.model, "claude-opus-5-5");
  assert.equal(body.fallbacks, "default");
  assert.equal(body.tools[0].type, "web_search_20260209");
  return claudeJson("claude-opus-5-5", verification);
};

test("answers with the calendar, then sends Claude's JSON to Zapier", async () => {
  const { res, json, ms, sent } = await run(form, claudeOk);
  console.log(`worker answered in ${ms.toFixed(2)} ms`);
  assert.equal(json.url, env.JAMES_URL);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://www.momos.com");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].routing.ae, "James");
  assert.equal(sent[0].routing.region_mismatch, false);
  assert.equal(sent[0].verification.verdict, "verified");
  assert.equal(sent[0].verification.locations_found, "18");
  assert.equal(sent[0].lead.job_title, "VP Marketing");
  assert.equal(sent[0].utm.utm_source, "google");
  assert.equal(sent[0].fit.icp_fit, "fit");
});

test("the fit check sees the form and the company homepage", async () => {
  const { fitCalls, pages } = await run(form, claudeOk);
  assert.equal(pages.length, 1);
  assert.equal(fitCalls.length, 1);
  assert.deepEqual(fitCalls[0].thinking, { type: "disabled" });
  assert.equal(fitCalls[0].output_config.effort, "low");
  const content = fitCalls[0].messages[0].content as string;
  assert.ok(content.includes("Burger Co & Friends | 18 Locations"));
  assert.ok(content.includes("Smash burgers across California."));
  assert.ok(!content.includes("ana@burgerco.com"), "the full email is not sent to the gate");
});

test("personal email skips the homepage", async () => {
  const { json, pages, fitCalls } = await run({ ...form, email: "ana@gmail.com" }, claudeOk);
  assert.equal(json.url, env.JAMES_URL);
  assert.equal(pages.length, 0);
  assert.ok((fitCalls[0].messages[0].content as string).includes('"personal_email": true'));
});

test("confident not_fit goes to the not-fit page", async () => {
  const notFit = { icp_fit: "not_fit", confidence: 0.95, reason: "Marketing agency, not F&B." };
  const { json, sent } = await run(form, claudeOk, { fit: () => claudeJson("claude-haiku-5-5", notFit) });
  assert.equal(json.url, env.NOT_FIT_URL);
  assert.equal(sent[0].routing.status, "not_fit");
  assert.equal(sent[0].routing.ae, "");
  assert.equal(sent[0].fit.reason, "Marketing agency, not F&B.");
});

test("unsure not_fit and maybe still get a calendar", async () => {
  const unsure = { icp_fit: "not_fit", confidence: 0.6, reason: "Hard to tell." };
  assert.equal((await run(form, claudeOk, { fit: () => claudeJson("claude-haiku-5-5", unsure) })).json.url, env.JAMES_URL);
  const maybe = { icp_fit: "maybe", confidence: 0.9, reason: "Single cafe." };
  assert.equal((await run(form, claudeOk, { fit: () => claudeJson("claude-haiku-5-5", maybe) })).json.url, env.JAMES_URL);
});

test("fit check failure lets the lead through", async () => {
  const { json, sent } = await run(form, claudeOk, {
    fit: () => Response.json({ type: "error", error: { type: "overloaded_error", message: "busy" } }, { status: 529 }),
  });
  assert.equal(json.url, env.JAMES_URL);
  assert.equal(sent[0].fit.icp_fit, "unavailable");
});

test("slow fit check lets the lead through after 3 seconds", async () => {
  const { json, ms } = await run(form, claudeOk, {
    fit: (req) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => resolve(claudeJson("claude-haiku-5-5", fitOk)), 10_000);
        req.signal.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
  });
  console.log(`slow check answered in ${ms.toFixed(0)} ms`);
  assert.equal(json.url, env.JAMES_URL);
  assert.ok(ms < 3_500);
});

test("without ZAPIER_HOOK_URL nothing runs in the background", async () => {
  let opusCalled = false;
  const { json, sent } = await run(form, () => {
    opusCalled = true;
    return new Response("");
  }, { env: { ...env, ZAPIER_HOOK_URL: undefined } });
  assert.equal(json.url, env.JAMES_URL);
  assert.equal(sent.length, 0);
  assert.equal(opusCalled, false);
});

test("Claude failure still sends the lead to Zapier", async () => {
  const { json, sent } = await run(form, () => Response.json({ type: "error", error: { type: "overloaded_error", message: "busy" } }, { status: 529 }));
  assert.equal(json.url, env.JAMES_URL);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].verification.verdict, "unavailable");
});

test("spam skips Claude and goes to the not-fit page", async () => {
  let claudeCalled = false;
  const { json, sent, fitCalls } = await run({ ...form, website: "x" }, () => {
    claudeCalled = true;
    return new Response("");
  });
  assert.equal(json.url, env.NOT_FIT_URL);
  assert.equal(claudeCalled, false);
  assert.equal(fitCalls.length, 0);
  assert.equal(sent[0].routing.status, "spam");
});

test("bad body falls back to Jill", async () => {
  const res = await worker.fetch(new Request("https://w.example", { method: "POST", body: "nope" }), env, { waitUntil() {} });
  assert.equal(((await res.json()) as { url: string }).url, env.JILL_URL);
});
