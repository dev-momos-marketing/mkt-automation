import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, leadQuery, message, notifyLeads, type NotifyEnv, type SfLead } from "../src/notify.ts";

const env: NotifyEnv = {
  SF_DOMAIN: "http://momos.my.salesforce.com/", // as pasted from a browser: http and a trailing slash
  SF_CLIENT_ID: "id",
  SF_CLIENT_SECRET: "secret",
  SLACK_BOT_TOKEN: "xoxb-test",
  SLACK_CHANNEL: "top-funnel-deal",
  LEAD_SOURCE_FIELD: "LeadSource",
  LEAD_LOCATIONS_FIELD: "NoofOutlets__c",
  SKIP_CREATORS: "Momos Marketing",
  BULK_LIMIT: "10",
};

const lead = (over: Partial<SfLead> = {}): SfLead => ({
  Id: "00Q1",
  Name: "Ana Lopez",
  Company: "Burger Co",
  Title: "VP Marketing",
  Status: "New (Uncontacted)",
  Owner: { Name: "Jill Bucci", Email: "jill@momos.com" },
  CreatedBy: { Name: "James Burdick" },
  LeadSource: "Conference (Attendee)",
  ...over,
});

test("which leads reach the channel", () => {
  assert.deepEqual(decide(lead(), env), { post: true });
  // A rep's lead posts whatever its source, blank included.
  assert.deepEqual(decide(lead({ LeadSource: null }), env), { post: true });
  assert.deepEqual(decide(lead({ LeadSource: "Inbound", CreatedBy: { Name: "Noah Stern" } }), env), { post: true });
  // The form automation's leads are already in Slack through Zapier.
  assert.deepEqual(decide(lead({ LeadSource: "Inbound", CreatedBy: { Name: "Momos Marketing" } }), env), { post: false, why: "made by Momos Marketing" });
  assert.equal(decide(lead({ CreatedBy: { Name: "momos marketing " } }), env).post, false);
  assert.equal(decide(lead({ Status: "Disqualified" }), env).post, false);
  assert.equal(decide(lead({ Status: "Duplicate" }), env).post, false);
});

test("query covers 35 to 5 minutes before the run and asks for the creator", () => {
  const q = leadQuery(new Date("2026-11-04T10:30:00.000Z"), env);
  assert.match(q, /CreatedDate >= 2026-11-04T09:55:00Z AND CreatedDate < 2026-11-04T10:25:00Z/);
  assert.match(q, /CreatedBy\.Name/);
  assert.match(q, /Owner\.Email/);
  assert.match(q, /NoofOutlets__c/);
  assert.doesNotMatch(q, /Score|Hot/);
});

test("message", () => {
  const text = message(lead({ NoofOutlets__c: 24 }), env, "https://momos.my.salesforce.com", "U123");
  assert.match(text, /^🟢 \*Burger Co\* · Ana Lopez, VP Marketing/);
  assert.match(text, /Conference \(Attendee\) · 24 locations · added by James Burdick · owner <@U123>/);
  assert.match(text, /lightning\/r\/Lead\/00Q1\/view/);
  assert.match(message(lead({ LeadSource: null }), env, "https://x", null), /no source · added by James Burdick · owner Jill Bucci/);
});

function fakeSalesforce(fresh: SfLead[]) {
  const posts: string[] = [];
  const urls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/services/oauth2/token")) return Response.json({ access_token: "t", instance_url: "https://momos.my.salesforce.com" });
    if (url.includes("/query?q=")) return Response.json({ records: fresh });
    if (url.includes("users.lookupByEmail")) return Response.json({ ok: true, user: { id: "U123" } });
    if (url.endsWith("chat.postMessage")) {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.channel, "top-funnel-deal");
      posts.push(body.text);
      return Response.json({ ok: true });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  return { posts, urls, restore: () => (globalThis.fetch = realFetch) };
}

test("a run posts rep leads and leaves out the form automation's", async () => {
  const sf = fakeSalesforce([lead(), lead({ Id: "00Q2", LeadSource: "Inbound", CreatedBy: { Name: "Momos Marketing" } })]);
  try {
    const result = await notifyLeads(new Date("2026-11-04T10:15:00Z"), env);
    assert.deepEqual(result, { posted: 1, skipped: 1, imported: 0 });
    assert.equal(sf.posts.length, 1);
    assert.match(sf.posts[0], /^🟢 \*Burger Co\*/);
    assert.match(sf.urls[0], /^https:\/\/momos\.my\.salesforce\.com\/services\/oauth2\/token$/);
  } finally {
    sf.restore();
  }
});

test("an import posts one line, while other reps' leads in the same run still post", async () => {
  const batch = Array.from({ length: 11 }, (_, i) => lead({ Id: `00QB${i}`, LeadSource: null, CreatedBy: { Name: "Tai Nguyen" } }));
  const sf = fakeSalesforce([...batch, lead({ Id: "00QR" })]);
  try {
    const result = await notifyLeads(new Date("2026-11-04T10:15:00Z"), env);
    assert.deepEqual(result, { posted: 1, skipped: 0, imported: 11 });
    assert.equal(sf.posts.length, 2);
    assert.ok(sf.posts.some((p) => /Tai Nguyen imported 11 leads/.test(p)));
    assert.ok(sf.posts.some((p) => /added by James Burdick/.test(p)));
  } finally {
    sf.restore();
  }
});

test("exactly the bulk limit still posts each lead", async () => {
  const ten = Array.from({ length: 10 }, (_, i) => lead({ Id: `00QT${i}` }));
  const sf = fakeSalesforce(ten);
  try {
    const result = await notifyLeads(new Date("2026-11-04T10:15:00Z"), env);
    assert.deepEqual(result, { posted: 10, skipped: 0, imported: 0 });
  } finally {
    sf.restore();
  }
});

test("notifier stays off without settings", async () => {
  const result = await notifyLeads(new Date(), { SLACK_CHANNEL: "x" });
  assert.deepEqual(result, { posted: 0, skipped: 0, imported: 0 });
});
