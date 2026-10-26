import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { notify, windowFor, type Env } from "../src/index.ts";
import { notLegitReason, rulesFrom, type Lead } from "../src/legit.ts";
import { newLeadsQuery } from "../src/salesforce.ts";

const env: Env = {
  SF_DOMAIN: "https://momos.my.salesforce.com",
  SF_CLIENT_ID: "id",
  SF_CLIENT_SECRET: "secret",
  SLACK_BOT_TOKEN: "xoxb-test",
  SLACK_CHANNEL_ID: "C123",
  SKIP_STATUSES: "Unqualified,Junk",
  INTERNAL_DOMAINS: "momos.com",
  BATCH_SIZE: "5", // lower than the default so the import test stays small
};

const lead: Lead = {
  Id: "00Q000000000001",
  FirstName: "Ana",
  LastName: "Lopez",
  Email: "ana@burgerco.com",
  Phone: null,
  Company: "Burger Co",
  Title: "VP Marketing",
  Country: "US",
  LeadSource: "Conference",
  Status: "Open - Not Contacted",
  Description: "Met at the booth, 18 locations.",
  CreatedDate: "2026-10-26T07:41:12.000+0000",
  Owner: { Name: "Jill" },
  CreatedBy: { Name: "Noah Stern" },
};

const rules = rulesFrom(env.SKIP_STATUSES, env.INTERNAL_DOMAINS);

test("legit leads", () => {
  assert.equal(notLegitReason(lead, rules), null);
  // Typed in from a conference with only a phone number.
  assert.equal(notLegitReason({ ...lead, Email: null, Phone: "+1 (415) 555-0100" }, rules), null);
  // "Testa" and "Contest Kitchen" are real names, not tests.
  assert.equal(notLegitReason({ ...lead, LastName: "Testa", Company: "Contest Kitchen" }, rules), null);
});

test("not legit leads", () => {
  assert.equal(notLegitReason({ ...lead, Status: "Unqualified" }, rules), "status Unqualified");
  assert.equal(notLegitReason({ ...lead, Email: null }, rules), "no email or phone");
  assert.equal(notLegitReason({ ...lead, Email: "ana@" }, rules), "invalid email");
  assert.equal(notLegitReason({ ...lead, Email: "x@mailinator.com" }, rules), "throwaway email");
  assert.equal(notLegitReason({ ...lead, Email: "noah@momos.com" }, rules), "internal email");
  assert.equal(notLegitReason({ ...lead, Company: "[not provided]" }, rules), "no company");
  assert.equal(notLegitReason({ ...lead, LastName: "Test" }, rules), "test lead");
  assert.equal(notLegitReason({ ...lead, Company: "asdf" }, rules), "test lead");
});

test("windows follow each other with no gap or overlap", () => {
  const t = Date.parse("2026-10-26T10:30:00.000Z");
  const a = windowFor(t);
  const b = windowFor(t + 30 * 60_000);
  assert.equal(a.from.toISOString(), "2026-10-26T09:59:00.000Z");
  assert.equal(a.to.toISOString(), "2026-10-26T10:29:00.000Z");
  assert.equal(b.from.getTime(), a.to.getTime());
  // A late start still reads the same 30 minutes.
  assert.equal(windowFor(t + 40_000).from.getTime(), a.from.getTime());
});

test("SOQL query", () => {
  const q = newLeadsQuery(new Date("2026-10-26T07:41:00.000Z"), new Date("2026-10-26T07:42:00.000Z"));
  assert.match(q, /CreatedDate >= 2026-10-26T07:41:00Z AND CreatedDate < 2026-10-26T07:42:00Z/);
  assert.match(q, /IsConverted = false/);
});

// Runs Beacon with Salesforce and Slack faked out.
async function run(records: Lead[], opts: { slack?: (body: any) => unknown } = {}) {
  const posts: any[] = [];
  const queries: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    if (req.url === "https://momos.my.salesforce.com/services/oauth2/token") {
      const form = new URLSearchParams(await req.text());
      assert.equal(form.get("grant_type"), "client_credentials");
      return Response.json({ access_token: "tok", instance_url: "https://momos.my.salesforce.com" });
    }
    if (req.url.startsWith("https://momos.my.salesforce.com/services/data/")) {
      assert.equal(req.headers.get("authorization"), "Bearer tok");
      queries.push(new URL(req.url).searchParams.get("q") ?? "");
      return Response.json({ records, done: true });
    }
    if (req.url === "https://slack.com/api/chat.postMessage") {
      assert.equal(req.headers.get("authorization"), "Bearer xoxb-test");
      const body = await req.json();
      posts.push(body);
      return Response.json(opts.slack?.(body) ?? { ok: true });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  try {
    const result = await notify(env, new Date("2026-10-26T07:41:00Z"), new Date("2026-10-26T07:42:00Z"));
    return { result, posts, queries };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("posts a card for each legit lead, skips the rest", async () => {
  const { result, posts, queries } = await run([lead, { ...lead, Id: "00Q2", Email: "noah@momos.com" }]);
  assert.deepEqual(result, { posted: 1, skipped: 1 });
  assert.equal(queries.length, 1);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].channel, "C123");
  assert.equal(posts[0].text, "New lead (Conference): Ana Lopez at Burger Co");
  const card = JSON.stringify(posts[0].blocks);
  assert.match(card, /New lead · Conference/);
  assert.match(card, /lightning\/r\/Lead\/00Q000000000001\/view/);
  assert.match(card, /Added by Noah Stern/);
  assert.match(card, /Met at the booth/);
});

test("escapes Slack markup", async () => {
  const { posts } = await run([{ ...lead, Company: "Fish & Chips <Co>" }]);
  assert.match(JSON.stringify(posts[0].blocks), /Fish &amp; Chips &lt;Co&gt;/);
});

test("an import gets one summary message", async () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...lead, Id: `00Q${i}`, LastName: `Lopez${i}` }));
  const { result, posts } = await run(many);
  assert.equal(result.posted, 12);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].text, "12 new leads (Conference)");
});

test("no new leads, no posts", async () => {
  const { posts } = await run([]);
  assert.equal(posts.length, 0);
});

test("a Slack error fails the run so it shows in the logs", async () => {
  await assert.rejects(run([lead], { slack: () => ({ ok: false, error: "not_in_channel" }) }), /not_in_channel/);
});

test("fetch is a 404", async () => {
  assert.equal((await worker.fetch()).status, 404);
});
