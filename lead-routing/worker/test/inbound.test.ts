import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { DAILY_CRON, type Env } from "../src/index.ts";
import { dailyMessages, dailyReport, firstNumber, inboundMessage, reportInbound, sizeMismatch, type InboundLead, type Kv } from "../src/inbound.ts";

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
