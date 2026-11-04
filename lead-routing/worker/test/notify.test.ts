import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, hotQuery, leadQuery, message, notifyLeads, type NotifyEnv, type SfLead } from "../src/notify.ts";

const env: NotifyEnv = {
  SF_DOMAIN: "http://momos.my.salesforce.com/", // as pasted from a browser: http and a trailing slash
  SF_CLIENT_ID: "id",
  SF_CLIENT_SECRET: "secret",
  SLACK_BOT_TOKEN: "xoxb-test",
  SLACK_CHANNEL: "vincent-test-beacon",
  LEAD_SOURCE_FIELD: "LeadSource",
  LEAD_SCORE_FIELD: "Conversion_Score__c",
  HOT_SCORE: "70",
  LEAD_HOT_FLAG_FIELD: "MQL_Contact_Hot_c__c",
  LEAD_LOCATIONS_FIELD: "NoofOutlets__c",
  NOTIFY_SOURCES: "Inbound,External Referral,Conference (Attendee)",
  SCORE_ONLY_SOURCES: "Conference (SDR),Marketing (SDR)",
};

const lead = (over: Partial<SfLead> = {}): SfLead => ({
  Id: "00Q1",
  Name: "Ana Lopez",
  Company: "Burger Co",
  Title: "VP Marketing",
  Status: "Open - Not Contacted",
  Owner: { Name: "Jill Bucci", Email: "jill@momos.com" },
  LeadSource: "Inbound",
  Conversion_Score__c: 40,
  ...over,
});

test("which leads reach the channel", () => {
  assert.deepEqual(decide(lead(), env), { post: true, hot: false });
  assert.deepEqual(decide(lead({ Conversion_Score__c: 85 }), env), { post: true, hot: true });
  assert.equal(decide(lead({ LeadSource: "outbound_ae", Conversion_Score__c: 99 }), env).post, false);
  assert.equal(decide(lead({ LeadSource: "Conference (SDR)" }), env).post, false);
  assert.deepEqual(decide(lead({ LeadSource: "Conference (SDR)", Conversion_Score__c: 70 }), env), { post: true, hot: true });
  assert.equal(decide(lead({ Status: "Disqualified" }), env).post, false);
  // Blank (bulk imports) and unlisted sources never post, even when hot.
  assert.equal(decide(lead({ LeadSource: null, Conversion_Score__c: 99 }), env).post, false);
  assert.equal(decide(lead({ LeadSource: "Sales Agency" }), env).post, false);
  // The MQL Contact Hot checkbox makes a lead 🔥 whatever the score.
  assert.deepEqual(decide(lead({ MQL_Contact_Hot_c__c: true }), env), { post: true, hot: true });
});

test("without a score field every lead posts as 🟢", () => {
  const noScore = { ...env, LEAD_SCORE_FIELD: "", LEAD_HOT_FLAG_FIELD: "" };
  assert.deepEqual(decide(lead({ Conversion_Score__c: 99 }), noScore), { post: true, hot: false });
  assert.equal(decide(lead({ LeadSource: "Conference (SDR)" }), noScore).post, false);
});

test("query covers 10 to 5 minutes before the run", () => {
  const q = leadQuery(new Date("2026-11-04T10:15:00.000Z"), env);
  assert.match(q, /CreatedDate >= 2026-11-04T10:05:00Z AND CreatedDate < 2026-11-04T10:10:00Z/);
  assert.match(q, /Conversion_Score__c/);
  assert.match(q, /Owner\.Email/);
  assert.match(q, /MQL_Contact_Hot_c__c/);
  assert.match(q, /NoofOutlets__c/);
});

test("message", () => {
  const text = message(lead({ Conversion_Score__c: 85 }), env, true, "https://momos.my.salesforce.com", "U123");
  assert.match(text, /^🔥 \*Burger Co\* · Ana Lopez, VP Marketing/);
  assert.match(text, /Inbound · score 85 · owner <@U123>/);
  assert.match(message(lead({ NoofOutlets__c: 24 }), env, false, "https://x", null), /Inbound · 24 locations · score 40/);
  assert.match(text, /lightning\/r\/Lead\/00Q1\/view/);
  assert.match(message(lead(), env, false, "https://x", null), /owner Jill Bucci/);
});

test("a run logs in, queries, and posts only the right leads", async () => {
  const calls: { url: string; body?: string }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === "string" ? init.body : init?.body?.toString() });
    if (url.endsWith("/services/oauth2/token")) return Response.json({ access_token: "t", instance_url: "https://momos.my.salesforce.com" });
    if (url.includes("/query?q=")) {
      return Response.json({ records: [lead({ Conversion_Score__c: 90 }), lead({ Id: "00Q2", LeadSource: "outbound_ae" })] });
    }
    if (url.includes("users.lookupByEmail")) return Response.json({ ok: true, user: { id: "U123" } });
    if (url.endsWith("chat.postMessage")) return Response.json({ ok: true });
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  try {
    const result = await notifyLeads(new Date("2026-11-04T10:15:00Z"), env);
    assert.deepEqual(result, { posted: 1, skipped: 1, hot: 0 });
    const post = calls.find((c) => c.url.endsWith("chat.postMessage"))!;
    const body = JSON.parse(post.body!);
    assert.equal(body.channel, "vincent-test-beacon");
    assert.match(body.text, /🔥 \*Burger Co\*/);
    assert.match(calls[0].url, /^https:\/\/momos\.my\.salesforce\.com\/services\/oauth2\/token$/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("notifier stays off without settings", async () => {
  const result = await notifyLeads(new Date(), { SLACK_CHANNEL: "x" });
  assert.deepEqual(result, { posted: 0, skipped: 0, hot: 0 });
});

test("hot query looks back 15 minutes for score or flag", () => {
  const q = hotQuery(new Date("2026-11-04T10:15:00Z"), { ...env, HOT_SCORE: "50" })!;
  assert.match(q, /LastModifiedDate >= 2026-11-04T10:00:00Z/);
  assert.match(q, /\(Conversion_Score__c >= 50 OR MQL_Contact_Hot_c__c = true\)/);
  assert.equal(hotQuery(new Date(), { ...env, LEAD_SCORE_FIELD: "", LEAD_HOT_FLAG_FIELD: "" }), null);
});

function fakeKv() {
  const store = new Map<string, string>();
  return { store, get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => void store.set(k, v) };
}

function fakeSalesforce(fresh: SfLead[], hot: SfLead[]) {
  const posts: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/services/oauth2/token")) return Response.json({ access_token: "t", instance_url: "https://sf" });
    if (url.includes("/query?q=")) {
      const q = decodeURIComponent(url.split("q=")[1]);
      return Response.json({ records: q.includes("LastModifiedDate") ? hot : fresh });
    }
    if (url.includes("users.lookupByEmail")) return Response.json({ ok: false });
    if (url.endsWith("chat.postMessage")) {
      posts.push(JSON.parse(String(init?.body)).text);
      return Response.json({ ok: true });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  return { posts, restore: () => (globalThis.fetch = realFetch) };
}

test("a lead that turns hot is posted once, whatever its source", async () => {
  const SEEN = fakeKv();
  const warmed = lead({ Id: "00QH", Company: "Imported Co", LeadSource: null, Conversion_Score__c: 55, MQL_Contact_Hot_c__c: true });
  const sf = fakeSalesforce([], [warmed, lead({ Id: "00QX", Status: "Disqualified", MQL_Contact_Hot_c__c: true })]);
  try {
    const first = await notifyLeads(new Date("2026-11-04T10:15:00Z"), { ...env, SEEN });
    assert.equal(first.hot, 1);
    assert.match(sf.posts[0], /^🔥 \*Imported Co\*/);
    // Next run still sees it in the 15-minute window: not posted again.
    const second = await notifyLeads(new Date("2026-11-04T10:20:00Z"), { ...env, SEEN });
    assert.equal(second.hot, 0);
    assert.equal(sf.posts.length, 1);
  } finally {
    sf.restore();
  }
});

test("a new hot lead already posted by the hot check isn't posted twice", async () => {
  const SEEN = fakeKv();
  const hotNew = lead({ Id: "00QN", Conversion_Score__c: 80 });
  const sf = fakeSalesforce([hotNew], [hotNew]);
  try {
    await notifyLeads(new Date("2026-11-04T10:15:00Z"), { ...env, SEEN });
    assert.equal(sf.posts.length, 1);
  } finally {
    sf.restore();
  }
});

test("a bulk update posts 10 hot leads and one line for the rest", async () => {
  const SEEN = fakeKv();
  const many = Array.from({ length: 13 }, (_, i) => lead({ Id: `00Q${i}`, LeadSource: null, MQL_Contact_Hot_c__c: true }));
  const sf = fakeSalesforce([], many);
  try {
    const r = await notifyLeads(new Date("2026-11-04T10:15:00Z"), { ...env, SEEN });
    assert.equal(r.hot, 10);
    assert.equal(sf.posts.length, 11);
    assert.match(sf.posts[10], /and 3 more leads turned hot/);
    assert.equal(SEEN.store.size, 13);
  } finally {
    sf.restore();
  }
});
