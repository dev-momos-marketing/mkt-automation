import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, leadQuery, message, notifyLeads, type NotifyEnv, type SfLead } from "../src/notify.ts";

const env: NotifyEnv = {
  SF_DOMAIN: "http://momos.my.salesforce.com/", // as pasted from a browser: http and a trailing slash
  SF_CLIENT_ID: "id",
  SF_CLIENT_SECRET: "secret",
  SLACK_BOT_TOKEN: "xoxb-test",
  SLACK_CHANNEL: "vincent-test-beacon",
  LEAD_SOURCE_FIELD: "LeadSource",
  LEAD_SCORE_FIELD: "Conversion_Score__c",
  HOT_SCORE: "70",
  SKIP_SOURCES: "Outbound (AE),Outbound (SDR)",
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
  assert.equal(decide(lead({ LeadSource: "Outbound (AE)", Conversion_Score__c: 99 }), env).post, false);
  assert.equal(decide(lead({ LeadSource: "Conference (SDR)" }), env).post, false);
  assert.deepEqual(decide(lead({ LeadSource: "Conference (SDR)", Conversion_Score__c: 70 }), env), { post: true, hot: true });
  assert.equal(decide(lead({ Status: "Disqualified" }), env).post, false);
  // Unknown or blank sources still post: one channel for every lead.
  assert.equal(decide(lead({ LeadSource: null }), env).post, true);
});

test("without a score field every lead posts as 🟢", () => {
  const noScore = { ...env, LEAD_SCORE_FIELD: "" };
  assert.deepEqual(decide(lead({ Conversion_Score__c: 99 }), noScore), { post: true, hot: false });
  assert.equal(decide(lead({ LeadSource: "Conference (SDR)" }), noScore).post, false);
});

test("query covers 10 to 5 minutes before the run", () => {
  const q = leadQuery(new Date("2026-11-04T10:15:00.000Z"), env);
  assert.match(q, /CreatedDate >= 2026-11-04T10:05:00Z AND CreatedDate < 2026-11-04T10:10:00Z/);
  assert.match(q, /Conversion_Score__c/);
  assert.match(q, /Owner\.Email/);
});

test("message", () => {
  const text = message(lead({ Conversion_Score__c: 85 }), env, true, "https://momos.my.salesforce.com", "U123");
  assert.match(text, /^🔥 \*Burger Co\* · Ana Lopez, VP Marketing/);
  assert.match(text, /Inbound · score 85 · owner <@U123>/);
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
      return Response.json({ records: [lead({ Conversion_Score__c: 90 }), lead({ Id: "00Q2", LeadSource: "Outbound (AE)" })] });
    }
    if (url.includes("users.lookupByEmail")) return Response.json({ ok: true, user: { id: "U123" } });
    if (url.endsWith("chat.postMessage")) return Response.json({ ok: true });
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  try {
    const result = await notifyLeads(new Date("2026-11-04T10:15:00Z"), env);
    assert.deepEqual(result, { posted: 1, skipped: 1 });
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
  assert.deepEqual(result, { posted: 0, skipped: 0 });
});
