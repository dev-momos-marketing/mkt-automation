import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { DAILY_CRON, RETRY_CRON, type Env } from "../src/index.ts";
import { aeSlackId, dailyMessages, dailyReport, firstNumber, inboundMessage, queueResearch, reportInbound, retryResearch, sizeMismatch, type InboundLead, type Kv } from "../src/inbound.ts";

function fakeKv() {
  const store = new Map<string, string>();
  const kv: Kv & { store: Map<string, string> } = { store, get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) };
  return kv;
}

const lead = (over: Partial<InboundLead> = {}): InboundLead => ({
  firstName: "Sam",
  lastName: "Rivera",
  email: "sam@tacoplace.com",
  company: "Taco Place",
  title: "Owner",
  country: "US",
  locations: "1-5",
  status: "routed",
  reason: "claude maybe 0.6: size unclear",
  ae: "Jill",
  region: "us_east",
  fit: { icp_fit: "maybe", confidence: 0.6 },
  research: { verdict: "suspicious", icp_fit: "maybe", confidence: 0.7, company_name: "Taco Place", locations_found: "About 70-98 brand-wide", person_matches_company: true, red_flags: [], summary: "Franchise owner of Taco Place units." },
  utm: { source: "google", campaign: "brand" },
  salesforce: { ok: true },
  ...over,
});

function fakeSlack() {
  const posts: { channel: string; text: string }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://slack.com/api/chat.postMessage") {
      posts.push(JSON.parse(String(init?.body)));
      return Response.json({ ok: true });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  return { posts, restore: () => (globalThis.fetch = real) };
}

test("location counts the research found", () => {
  assert.equal(firstNumber("About 70-98 brand-wide"), 70);
  assert.equal(firstNumber("6,700+ US locations"), 6700);
  assert.equal(firstNumber(""), null);
  assert.equal(sizeMismatch("1-5", "About 70-98"), true);
  assert.equal(sizeMismatch("1-5", "10+"), true);
  assert.equal(sizeMismatch("1-5", "3"), false);
  assert.equal(sizeMismatch("1-5", "9"), false, "under 10 is not worth a flag");
  assert.equal(sizeMismatch("6-49", "60+"), false);
  assert.equal(sizeMismatch("6-49", "260"), true);
  assert.equal(sizeMismatch("250+", "6,700+"), false);
  assert.equal(sizeMismatch("1-5", "Unknown"), false);
});

test("the Slack post shows unsure bookings, size mismatches and Salesforce failures", () => {
  const text = inboundMessage(lead());
  assert.match(text, /^🟡 \*New demo request → Jill\* \(unsure, booked anyway\) · us_east/);
  assert.match(text, /Locations: said \*1-5\* · found \*About 70-98 brand-wide\* 🔺/);
  assert.match(text, /Booking check: claude maybe 0\.6: size unclear/);
  assert.match(text, /Research: ⚠️ suspicious \(0\.7\) · ICP maybe · works there: yes/);
  assert.doesNotMatch(text, /Not in Salesforce/);
  const sure = inboundMessage(lead({ reason: "ok", fit: { icp_fit: "fit", confidence: 0.9 }, locations: "6-49", research: { verdict: "verified", locations_found: "18" } }));
  assert.match(sure, /^🟢 \*New demo request → Jill\* · us_east/);
  assert.match(sure, /Booking check: fit 0\.9/);
  assert.doesNotMatch(sure, /🔺/);
  const failed = inboundMessage(lead({ salesforce: { ok: false, error: "Zapier returned 500" }, research: { verdict: "unavailable", error: "403 Request not allowed" } }));
  assert.match(failed, /⚠️ \*Not in Salesforce:\* Zapier returned 500/);
  assert.match(failed, /Research: ❔ unavailable \(403 Request not allowed\)/);
  // Form text can't inject Slack links or mentions.
  assert.match(inboundMessage(lead({ company: "<!channel>", research: { verdict: "verified" } })), /&lt;!channel&gt;/);
});

test("a repeat submission within 7 days posts one short line", async () => {
  const LEADS = fakeKv();
  const slack = fakeSlack();
  const env = { SLACK_BOT_TOKEN: "xoxb", INBOUND_SLACK_CHANNEL: "C0INBOUND1", LEADS };
  try {
    assert.equal((await reportInbound(lead(), env)).posted, "lead");
    assert.equal((await reportInbound(lead({ email: "Sam@TacoPlace.com " }), env)).posted, "repeat");
    assert.equal((await reportInbound(lead(), env)).posted, "repeat");
    assert.equal(slack.posts.length, 3);
    assert.equal(slack.posts[0].channel, "C0INBOUND1");
    assert.match(slack.posts[1].text, /^↩️ Sam Rivera \(Taco Place\) submitted the demo form again: 2nd time this week\. → Jill/);
    assert.match(slack.posts[2].text, /3rd time/);
  } finally {
    slack.restore();
  }
});

test("spam and not-fits are counted but not posted", async () => {
  const LEADS = fakeKv();
  const slack = fakeSlack();
  const env = { SLACK_BOT_TOKEN: "xoxb", INBOUND_SLACK_CHANNEL: "C1", LEADS };
  const now = new Date("2026-11-10T12:00:00Z");
  try {
    await reportInbound(lead({ status: "spam", reason: "throwaway email", research: { verdict: "unavailable" } }), env, now);
    await reportInbound(lead({ status: "not_fit", company: "Toast", reason: "claude: POS vendor", ae: "" }), env, now);
    await reportInbound(lead({ fit: { icp_fit: "unavailable" }, research: { verdict: "unavailable" }, salesforce: { ok: false, error: "x" } }), env, now);
    assert.equal(slack.posts.length, 1);
    const day = JSON.parse(LEADS.store.get("day:2026-11-10")!);
    assert.deepEqual(day, { submissions: 3, spam: 1, zapier_errors: 1, claude_failures: 2, not_fit: [{ company: "Toast", reason: "POS vendor" }] });
  } finally {
    slack.restore();
  }
});

test("without a channel nothing posts, but counts still work", async () => {
  const LEADS = fakeKv();
  assert.equal((await reportInbound(lead(), { LEADS })).posted, "none");
  assert.equal(JSON.parse(LEADS.store.values().next().value!).submissions, 1);
});

test("daily messages: quiet on a good day, loud on a bad one", () => {
  assert.deepEqual(dailyMessages({ submissions: 4, spam: 0, zapier_errors: 0, claude_failures: 1, not_fit: [] }, "2026-11-09"), []);
  const bad = dailyMessages({ submissions: 0, spam: 0, zapier_errors: 2, claude_failures: 3, not_fit: [{ company: "Toast", reason: "POS vendor" }] }, "2026-11-09");
  assert.equal(bad.length, 2);
  assert.match(bad[0], /^🚨 \*Lead routing check for 2026-11-09\*/);
  assert.match(bad[0], /no demo form submissions/);
  assert.match(bad[0], /2 leads didn't reach Salesforce/);
  assert.match(bad[0], /Claude failed 3 times/);
  assert.match(bad[1], /^🚫 1 turned away on 2026-11-09: Toast \(POS vendor\)/);
});

test("the daily cron reports yesterday, and the 30-minute cron still runs the notifier", async () => {
  const LEADS = fakeKv();
  LEADS.store.set("day:2026-11-09", JSON.stringify({ submissions: 0, spam: 0, zapier_errors: 0, claude_failures: 0, not_fit: [] }));
  const slack = fakeSlack();
  const env = { ANTHROPIC_API_KEY: "k", JAMES_URL: "j", JILL_URL: "l", NOT_FIT_URL: "n", ALLOWED_ORIGINS: "", SLACK_BOT_TOKEN: "xoxb", INBOUND_SLACK_CHANNEL: "C1", LEADS } as Env;
  const waits: Promise<unknown>[] = [];
  try {
    await worker.scheduled({ scheduledTime: Date.parse("2026-11-10T01:00:00Z"), cron: DAILY_CRON }, env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    assert.equal(slack.posts.length, 1);
    assert.match(slack.posts[0].text, /2026-11-09/);
    // Missing day (no submissions recorded at all) also alerts.
    assert.equal((await dailyReport(new Date("2026-11-20T01:00:00Z"), env)).sent, 1);
    // The 30-minute cron goes to the Salesforce notifier, which is off without its settings.
    waits.length = 0;
    await worker.scheduled({ scheduledTime: Date.parse("2026-11-10T01:30:00Z"), cron: "*/30 * * * *" }, env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    assert.equal(slack.posts.length, 2);
  } finally {
    slack.restore();
  }
});

test("a demo request posts to Slack even when Zapier fails", async () => {
  const LEADS = fakeKv();
  const posts: string[] = [];
  const real = globalThis.fetch;
  let fitTries = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url.includes("hooks.zapier.com")) return new Response("boom", { status: 500 });
    if (req.url === "https://slack.com/api/chat.postMessage") {
      posts.push(JSON.parse(await req.text()).text);
      return Response.json({ ok: true });
    }
    if (req.url.includes("api.anthropic.com")) {
      const json = (await req.clone().json()) as any;
      // The fit check fails fast once with 403, then answers: the retry books the lead.
      if (!json.tools && ++fitTries === 1) return Response.json({ type: "error", error: { type: "permission_error", message: "Request not allowed" } }, { status: 403 });
      const out = json.tools
        ? { verdict: "verified", icp_fit: "fit", confidence: 0.9, company_name: "Burger Co", company_website: "", industry: "QSR", locations_claimed: "6-49", locations_found: "18", hq_country: "US", region: "us_west", person_matches_company: true, red_flags: [], summary: "18-unit QSR.", sources: [] }
        : { icp_fit: "fit", confidence: 0.9, reason: "QSR chain.", hq_region: "us_west" };
      return Response.json({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(out) }], usage: { input_tokens: 1, output_tokens: 1 } });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  const env = { ANTHROPIC_API_KEY: "k", ZAPIER_HOOK_URL: "https://hooks.zapier.com/hooks/catch/1/2/", JAMES_URL: "https://james.example", JILL_URL: "https://jill.example", NOT_FIT_URL: "https://notfit.example", ALLOWED_ORIGINS: "https://www.momos.com", SLACK_BOT_TOKEN: "xoxb", INBOUND_SLACK_CHANNEL: "C1", LEADS } as Env;
  const waits: Promise<unknown>[] = [];
  try {
    const res = await worker.fetch(
      new Request("https://w.example", { method: "POST", headers: { origin: "https://www.momos.com" }, body: JSON.stringify({ firstName: "Ana", lastName: "Lopez", email: "ana@burgerco.com", company: "Burger Co", title: "VP Marketing", country: "US", locations: "6-49", timezone: "America/Los_Angeles", elapsedMs: 9000 }) }),
      env,
      { waitUntil: (p) => waits.push(p) },
    );
    assert.equal(((await res.json()) as { url: string }).url, "https://james.example");
    await Promise.all(waits);
    assert.equal(fitTries, 2);
    assert.equal(posts.length, 1);
    assert.match(posts[0], /^🟢 \*New demo request → James\*/);
    assert.match(posts[0], /⚠️ \*Not in Salesforce:\* Zapier returned 500/);
    assert.equal(JSON.parse(LEADS.store.values().next().value!).zapier_errors, 1);
  } finally {
    globalThis.fetch = real;
  }
});

function fullKv() {
  const store = new Map<string, string>();
  const kv: Kv & { store: Map<string, string> } = {
    store,
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => void store.set(k, v),
    delete: async (k) => void store.delete(k),
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  };
  return kv;
}

function slackApi() {
  const calls: { method: string; body: any }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://slack.com/api/users.lookupByEmail")) {
      return Response.json(url.includes("jill%40momos.com") ? { ok: true, user: { id: "UJILL" } } : { ok: false, error: "users_not_found" });
    }
    if (url.startsWith("https://slack.com/api/")) {
      const method = url.split("/api/")[1];
      const body = JSON.parse(String(init?.body));
      calls.push({ method, body });
      return Response.json({ ok: true, ts: body.ts ?? "1700000000.000100", channel: "C0INBOUND1" });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = real) };
}

test("the AE is tagged from AE_SLACK, by Slack ID or email", async () => {
  const slack = slackApi();
  try {
    assert.equal(await aeSlackId({ SLACK_BOT_TOKEN: "x", AE_SLACK: "James=U0JAMES, Jill=jill@momos.com" }, "James"), "U0JAMES");
    assert.equal(await aeSlackId({ SLACK_BOT_TOKEN: "x", AE_SLACK: "James=U0JAMES, Jill=jill@momos.com" }, "jill"), "UJILL");
    assert.equal(await aeSlackId({ SLACK_BOT_TOKEN: "x", AE_SLACK: "James=nobody@momos.com" }, "James"), null);
    assert.equal(await aeSlackId({ SLACK_BOT_TOKEN: "x" }, "James"), null);
    assert.match(inboundMessage(lead(), "UJILL"), /^🟡 \*New demo request → <@UJILL>\*/);
    const LEADS = fullKv();
    await reportInbound(lead(), { SLACK_BOT_TOKEN: "x", INBOUND_SLACK_CHANNEL: "C0INBOUND1", AE_SLACK: "Jill=UJILL", LEADS });
    await reportInbound(lead(), { SLACK_BOT_TOKEN: "x", INBOUND_SLACK_CHANNEL: "C0INBOUND1", AE_SLACK: "Jill=UJILL", LEADS });
    assert.match(slack.calls[0].body.text, /→ <@UJILL>/);
    assert.match(slack.calls[1].body.text, /^↩️ .* → <@UJILL>$/);
  } finally {
    slack.restore();
  }
});

test("failed research posts at once as pending, then the cron fills it in", async () => {
  const LEADS = fullKv();
  const slack = slackApi();
  const env = { SLACK_BOT_TOKEN: "x", INBOUND_SLACK_CHANNEL: "C0INBOUND1", LEADS };
  const t0 = Date.parse("2026-11-10T10:00:00Z");
  const pending = lead({ research: { verdict: "pending", error: "403 Request not allowed" } });
  try {
    const posted = await reportInbound(pending, env, new Date(t0));
    assert.match(slack.calls[0].body.text, /Research: ⏳ Claude didn't answer, retrying/);
    await queueResearch(env, { lead: pending, form: {}, instant: {}, channel: posted.channel!, ts: posted.ts! }, t0);
    let tries = 0;
    const flaky = async () => {
      if (++tries < 2) throw new Error("403 Request not allowed");
      return { verdict: "verified", icp_fit: "fit", confidence: 0.9, locations_found: "72", summary: "Franchise group, 72 units." };
    };
    // Not due yet at +1 minute.
    assert.deepEqual(await retryResearch(env, flaky, t0 + 60_000), { done: 0, failed: 0, gave_up: 0 });
    // +2 minutes: fails again, waits for +5.
    assert.deepEqual(await retryResearch(env, flaky, t0 + 2 * 60_000), { done: 0, failed: 1, gave_up: 0 });
    assert.deepEqual(await retryResearch(env, flaky, t0 + 4 * 60_000), { done: 0, failed: 0, gave_up: 0 });
    // +5 minutes: works. The original post is updated in place.
    assert.deepEqual(await retryResearch(env, flaky, t0 + 5 * 60_000), { done: 1, failed: 0, gave_up: 0 });
    const update = slack.calls.find((c) => c.method === "chat.update")!;
    assert.equal(update.body.channel, "C0INBOUND1");
    assert.equal(update.body.ts, "1700000000.000100");
    assert.match(update.body.text, /Research: ✅ verified \(0\.9\)/);
    assert.match(update.body.text, /found \*72\* 🔺/);
    assert.match(update.body.text, /Research added after 3 tries \(5 min\)/);
    assert.equal([...LEADS.store.keys()].filter((k) => k.startsWith("retry:")).length, 0);
  } finally {
    slack.restore();
  }
});

test("research that never works gives up after about 2 hours and says so", async () => {
  const LEADS = fullKv();
  const slack = slackApi();
  const env = { SLACK_BOT_TOKEN: "x", INBOUND_SLACK_CHANNEL: "C0INBOUND1", LEADS };
  const t0 = Date.parse("2026-11-10T10:00:00Z");
  try {
    await queueResearch(env, { lead: lead({ research: { verdict: "pending" } }), form: {}, instant: {}, channel: "C0INBOUND1", ts: "1.2" }, t0);
    const broken = async () => { throw new Error("busy"); };
    let gaveUp = 0;
    for (let m = 0; m <= 130; m += 5) gaveUp += (await retryResearch(env, broken, t0 + m * 60_000)).gave_up;
    assert.equal(gaveUp, 1);
    const last = slack.calls.filter((c) => c.method === "chat.update").at(-1)!;
    assert.match(last.body.text, /Research: ❔ unavailable \(gave up after 10 tries\)/);
    assert.equal(LEADS.store.size, 0);
  } finally {
    slack.restore();
  }
});

test("the 5-minute cron runs the research retries", async () => {
  const LEADS = fullKv();
  const slack = slackApi();
  const env = { ANTHROPIC_API_KEY: "k", JAMES_URL: "j", JILL_URL: "l", NOT_FIT_URL: "n", ALLOWED_ORIGINS: "", SLACK_BOT_TOKEN: "x", INBOUND_SLACK_CHANNEL: "C0INBOUND1", LEADS } as Env;
  const waits: Promise<unknown>[] = [];
  try {
    await worker.scheduled({ scheduledTime: Date.now(), cron: RETRY_CRON }, env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    assert.equal(slack.calls.length, 0, "nothing queued, nothing posted");
  } finally {
    slack.restore();
  }
});

test("a form submission whose research fails is posted as pending and queued for the cron", async () => {
  const LEADS = fullKv();
  const posts: any[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url.includes("hooks.zapier.com")) return new Response("ok");
    if (req.url === "https://slack.com/api/chat.postMessage") {
      posts.push(JSON.parse(await req.text()));
      return Response.json({ ok: true, ts: "1700000000.000200", channel: "C0INBOUND1" });
    }
    if (req.url.includes("api.anthropic.com")) {
      const json = (await req.clone().json()) as any;
      if (json.tools) return Response.json({ type: "error", error: { type: "permission_error", message: "Request not allowed" } }, { status: 403 });
      return Response.json({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ icp_fit: "fit", confidence: 0.9, reason: "QSR chain.", hq_region: "us_west" }) }], usage: { input_tokens: 1, output_tokens: 1 } });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  const env = { ANTHROPIC_API_KEY: "k", ZAPIER_HOOK_URL: "https://hooks.zapier.com/hooks/catch/1/2/", JAMES_URL: "https://james.example", JILL_URL: "https://jill.example", NOT_FIT_URL: "https://notfit.example", ALLOWED_ORIGINS: "https://www.momos.com", SLACK_BOT_TOKEN: "xoxb", INBOUND_SLACK_CHANNEL: "C0INBOUND1", LEADS } as Env;
  const waits: Promise<unknown>[] = [];
  try {
    await worker.fetch(
      new Request("https://w.example", { method: "POST", headers: { origin: "https://www.momos.com" }, body: JSON.stringify({ firstName: "Ana", lastName: "Lopez", email: "ana@burgerco.com", company: "Burger Co", title: "VP Marketing", country: "US", locations: "6-49", timezone: "America/Los_Angeles", elapsedMs: 9000 }) }),
      env,
      { waitUntil: (p) => waits.push(p) },
    );
    await Promise.all(waits);
    assert.equal(posts.length, 1);
    assert.match(posts[0].text, /Research: ⏳/);
    const queued = [...LEADS.store.entries()].filter(([k]) => k.startsWith("retry:"));
    assert.equal(queued.length, 1);
    const item = JSON.parse(queued[0][1]);
    assert.equal(item.ts, "1700000000.000200");
    assert.equal(item.lead.company, "Burger Co");
  } finally {
    globalThis.fetch = real;
  }
});

test("the daily check goes to Vincent as a DM, or to the channel when nobody is set", async () => {
  const LEADS = fullKv();
  LEADS.store.set("day:2026-11-09", JSON.stringify({ submissions: 0, spam: 0, zapier_errors: 0, claude_failures: 0, not_fit: [] }));
  const slack = slackApi();
  try {
    const base = { SLACK_BOT_TOKEN: "x", INBOUND_SLACK_CHANNEL: "C0INBOUND1", LEADS };
    assert.equal((await dailyReport(new Date("2026-11-10T01:00:00Z"), { ...base, DAILY_REPORT_TO: "U0VINCENT" })).sent, 1);
    assert.equal(slack.calls[0].body.channel, "U0VINCENT");
    assert.match(slack.calls[0].body.text, /no demo form submissions/);
    // An email that Slack can't find falls back to the channel.
    await dailyReport(new Date("2026-11-10T01:00:00Z"), { ...base, DAILY_REPORT_TO: "nobody@momos.com" });
    assert.equal(slack.calls[1].body.channel, "C0INBOUND1");
    // An email Slack finds is DM'd.
    await dailyReport(new Date("2026-11-10T01:00:00Z"), { ...base, DAILY_REPORT_TO: "jill@momos.com" });
    assert.equal(slack.calls[2].body.channel, "UJILL");
  } finally {
    slack.restore();
  }
});
