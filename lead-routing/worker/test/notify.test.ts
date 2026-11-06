import { test } from "node:test";
import assert from "node:assert/strict";
import { blocks, clean, decide, hotQuery, leadQuery, message, notifyLeads, type NotifyEnv, type SfLead } from "../src/notify.ts";

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

test("query covers 35 to 5 minutes before the run", () => {
  const q = leadQuery(new Date("2026-11-04T10:30:00.000Z"), env);
  assert.match(q, /CreatedDate >= 2026-11-04T09:55:00Z AND CreatedDate < 2026-11-04T10:25:00Z/);
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

test("hot query looks back 45 minutes for score or flag", () => {
  const q = hotQuery(new Date("2026-11-04T10:30:00Z"), { ...env, HOT_SCORE: "50" })!;
  assert.match(q, /LastModifiedDate >= 2026-11-04T09:45:00Z/);
  assert.match(q, /\(Conversion_Score__c >= 50 OR MQL_Contact_Hot_c__c = true\)/);
  assert.equal(hotQuery(new Date(), { ...env, LEAD_SCORE_FIELD: "", LEAD_HOT_FLAG_FIELD: "" }), null);
});

function fakeKv(seeded = true) {
  const store = new Map<string, string>(seeded ? [["seeded:score-50", "2026-11-06"]] : []);
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
      if (q.startsWith("SELECT Id FROM Lead")) return Response.json({ records: hot }); // first-run seed
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
    // Next run still sees it in the 45-minute window: not posted again.
    const second = await notifyLeads(new Date("2026-11-04T10:45:00Z"), { ...env, SEEN });
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
    assert.equal(SEEN.store.size, 14); // 13 leads + the seed marker
  } finally {
    sf.restore();
  }
});

test("detailed post: who, reach, where, why hot, score breakdown", () => {
  const rich = lead({
    Name: "Isabella Jiao", Title: "Marketing", Company: "Tattle", LeadSource: null, Conversion_Score__c: 21,
    MQL_Contact_Hot_c__c: true, NoofOutlets__c: 12, Email: "isabella@tattle.com", Phone: "+1 555 0100",
    Website: "tattle.com", City: "Austin", State: "TX", Country: "United States", Industry: "Restaurants",
    CreatedDate: "2026-10-01T08:00:00.000+0000", Lead_Score_Profile_Fit__c: 15, Lead_Score_Profile_Tier__c: "B",
    Lead_Score_Website_Engagement__c: 4, Lead_Score_Email_Open_Engagement__c: 2, Lead_Score_Form_Submission__c: 0,
    Gong__Flow_Status__c: "In progress", Description: "Wants <reviews> & social",
  });
  const b = blocks(rich, { ...env, HOT_SCORE: "50" }, true, "https://sf", "U123") as any[];
  const all = JSON.stringify(b);
  assert.equal(b[0].text.text, "🔥 Hot lead: Tattle");
  assert.match(b[1].text.text, /\*Isabella Jiao\* · Marketing\n<mailto:isabella@tattle\.com\|isabella@tattle\.com> · \+1 555 0100/);
  const fields = b[2].fields.map((x: any) => x.text);
  assert.ok(fields.includes("*Owner*\n<@U123>"));
  assert.ok(fields.includes("*Locations*\n12"));
  assert.ok(fields.includes("*Based in*\nAustin, TX, United States"));
  assert.ok(fields.includes("*Website*\n<https://tattle.com|tattle.com>"));
  assert.ok(fields.includes("*Created*\n2026-10-01"));
  assert.match(b[3].text.text, /\*Why it's hot:\* MQL Contact Hot is ticked\n\*Score 21\* · profile fit 15 \(B\)\nPoints from: Website 4 · Email opens 2$/);
  assert.match(all, /Gong flow: In progress/);
  assert.match(all, /Wants &lt;reviews&gt; &amp; social/); // escaped, can't inject links or mentions
  assert.equal(b.at(-1).elements[0].url, "https://sf/lightning/r/Lead/00Q1/view");
});

test("detailed post skips what's empty", () => {
  const b = blocks(lead({ Title: null, Conversion_Score__c: 40 }), env, false, "https://sf", null) as any[];
  assert.equal(b[0].text.text, "🟢 New lead: Burger Co");
  const all = JSON.stringify(b);
  assert.doesNotMatch(all, /Why it's hot|Based in|Website|Points from/);
  assert.match(all, /Jill Bucci/);
});

test("only detail fields Salesforce lets us read are queried", async () => {
  let soql = "";
  let posted: any;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/services/oauth2/token")) return Response.json({ access_token: "t", instance_url: "https://sf" });
    if (url.endsWith("/sobjects/Lead/describe")) return Response.json({ fields: [{ name: "Email" }, { name: "City" }] });
    if (url.includes("/query?q=")) {
      const q = decodeURIComponent(url.split("q=")[1]);
      if (q.includes("CreatedDate >=")) soql = q;
      return Response.json({ records: q.includes("CreatedDate >=") ? [lead({ Email: "a@b.co", City: "Austin" })] : [] });
    }
    if (url.includes("users.lookupByEmail")) return Response.json({ ok: false, error: "missing_scope" });
    if (url.endsWith("chat.postMessage")) {
      posted = JSON.parse(String(init?.body));
      return Response.json({ ok: true });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  try {
    await notifyLeads(new Date("2026-11-04T10:30:00Z"), { ...env, SEEN: fakeKv() });
    assert.match(soql, /, Email, City FROM Lead/);
    assert.doesNotMatch(soql, /Phone|Gong__Flow_Status__c/);
    assert.ok(Array.isArray(posted.blocks));
    assert.match(posted.text, /Burger Co/); // plain text kept for notifications
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("first run remembers leads already hot without posting them", async () => {
  const SEEN = fakeKv(false);
  const old = [lead({ Id: "00QA", Conversion_Score__c: 52 }), lead({ Id: "00QB", Conversion_Score__c: 60 })];
  const sf = fakeSalesforce([], old);
  try {
    const first = await notifyLeads(new Date("2026-11-06T02:00:00Z"), { ...env, HOT_SCORE: "50", SEEN });
    assert.equal(first.hot, 0);
    assert.equal(sf.posts.length, 0);
    assert.ok(SEEN.store.has("hot:00QA") && SEEN.store.has("hot:00QB") && SEEN.store.has("seeded:score-50"));
    // Next run: the same leads changed again. Still not posted, they were already hot.
    const second = await notifyLeads(new Date("2026-11-06T02:30:00Z"), { ...env, HOT_SCORE: "50", SEEN });
    assert.equal(second.hot, 0);
    assert.equal(sf.posts.length, 0);
  } finally {
    sf.restore();
  }
});

test("seed query lists every hot lead, with no time window", () => {
  const q = hotQuery(null, { ...env, HOT_SCORE: "50", LEAD_HOT_FLAG_FIELD: "" })!;
  assert.equal(q, "SELECT Id FROM Lead WHERE IsConverted = false AND (Conversion_Score__c >= 50) LIMIT 2000");
});

test("leads with no real company are junk, null names are cleaned", () => {
  assert.equal(decide(lead({ Company: "Not Provided", Conversion_Score__c: 90 }), env).post, false);
  assert.equal(decide(lead({ Company: "N/A" }), env).post, false);
  assert.equal(decide(lead({ Company: null }), env).post, false);
  assert.equal(decide(lead({ Company: "null" }), env).post, false);
  assert.equal(decide(lead({ Company: "T2D Concepts" }), env).post, true);
  assert.equal(clean("null null"), "");
  assert.equal(clean("null Not Provided"), "Not Provided");
  assert.match(message(lead({ Company: "T2D Concepts", Name: "null null", Title: null }), env, true, "https://x", null), /^🔥 \*T2D Concepts\* · \(no name\)\n/);
});

test("a junk lead that turns hot isn't posted", async () => {
  const SEEN = fakeKv();
  const sf = fakeSalesforce([], [lead({ Id: "00QJ", Company: "Not Provided", Name: "null Not Provided", Conversion_Score__c: 70 })]);
  try {
    const r = await notifyLeads(new Date("2026-11-06T02:00:00Z"), { ...env, SEEN });
    assert.equal(r.hot, 0);
    assert.equal(sf.posts.length, 0);
  } finally {
    sf.restore();
  }
});
