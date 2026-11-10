import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { type Env } from "../src/index.ts";
import { slackSignatureOk, soqlText } from "../src/ask.ts";

const SECRET = "test-signing-secret";

async function sign(body: string, ts = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v0:${ts}:${body}`));
  return { ts: String(ts), sig: "v0=" + [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("") };
}

const env = {
  ANTHROPIC_API_KEY: "sk-test", JAMES_URL: "https://james.example", JILL_URL: "https://jill.example", NOT_FIT_URL: "https://notfit.example",
  ALLOWED_ORIGINS: "https://www.momos.com", SLACK_BOT_TOKEN: "xoxb-test", SLACK_SIGNING_SECRET: SECRET,
  SF_DOMAIN: "momos.my.salesforce.com", SF_CLIENT_ID: "id", SF_CLIENT_SECRET: "secret",
} as Env;

async function post(body: unknown, opts: { badSig?: boolean; retry?: boolean; ts?: number } = {}) {
  const raw = JSON.stringify(body);
  const { ts, sig } = await sign(raw, opts.ts);
  const headers: Record<string, string> = { "content-type": "application/json", "x-slack-request-timestamp": ts, "x-slack-signature": opts.badSig ? sig.replace(/.$/, "0") : sig };
  if (opts.retry) headers["x-slack-retry-num"] = "1";
  const waits: Promise<unknown>[] = [];
  const res = await worker.fetch(new Request("https://w.example/slack/events", { method: "POST", headers, body: raw }), env, { waitUntil: (p) => waits.push(p) });
  return { res, waits };
}

test("Slack signatures: right, wrong, and too old", async () => {
  const body = '{"a":1}';
  const now = Math.floor(Date.now() / 1000);
  const { ts, sig } = await sign(body, now);
  assert.equal(await slackSignatureOk(SECRET, ts, sig, body, now), true);
  assert.equal(await slackSignatureOk(SECRET, ts, sig, body + " ", now), false);
  assert.equal(await slackSignatureOk("other", ts, sig, body, now), false);
  assert.equal(await slackSignatureOk(SECRET, ts, sig, body, now + 600), false, "replayed after 10 minutes");
  assert.equal(await slackSignatureOk(SECRET, null, sig, body, now), false);
});

test("Slack text can't break out of the SOQL string", () => {
  assert.equal(soqlText("O'Brien"), "O\\'Brien");
  assert.equal(soqlText("50%_off"), "50\\%\\_off");
  assert.equal(soqlText("a\\b"), "a\\\\b");
  assert.equal(soqlText("x".repeat(200)).length, 80);
});

test("Slack's URL check gets the challenge back; bad signatures get 401", async () => {
  const ok = await post({ type: "url_verification", challenge: "abc123" });
  assert.equal(ok.res.status, 200);
  assert.equal(await ok.res.text(), "abc123");
  const bad = await post({ type: "url_verification", challenge: "abc123" }, { badSig: true });
  assert.equal(bad.res.status, 401);
  const old = await post({ type: "url_verification", challenge: "abc123" }, { ts: Math.floor(Date.now() / 1000) - 3600 });
  assert.equal(old.res.status, 401);
});

test("Slack retries and Beacon's own messages are acknowledged and ignored", async () => {
  const retry = await post({ type: "event_callback", event: { type: "app_mention", text: "<@U1> hi", channel: "C1", ts: "1.1" } }, { retry: true });
  assert.equal(retry.res.status, 200);
  assert.equal(retry.waits.length, 0);
  const own = await post({ type: "event_callback", event: { type: "app_mention", bot_id: "B1", text: "<@U1> hi", channel: "C1", ts: "1.1" } });
  assert.equal(own.waits.length, 0);
});

test("a question: Beacon posts 'looking into it', looks up Salesforce, then edits in the answer", async () => {
  const slack: { method: string; body: any }[] = [];
  const soql: string[] = [];
  let claudeCalls = 0;
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = req.url;
    if (url.startsWith("https://slack.com/api/")) {
      const method = url.split("/api/")[1].split("?")[0];
      const body = req.method === "POST" ? JSON.parse(await req.text()) : null;
      slack.push({ method, body });
      if (method === "conversations.replies") return Response.json({ ok: true, messages: [{ ts: "9.0", text: "We met them at MURTEC" }, { ts: "9.1", text: "<@UBEACON> who is Burger Co?" }] });
      return Response.json({ ok: true, ts: "9.2", channel: "C1" });
    }
    if (url.endsWith("/services/oauth2/token")) return Response.json({ access_token: "t", instance_url: "https://momos.my.salesforce.com" });
    if (url.includes("/query?q=")) {
      soql.push(decodeURIComponent(url.split("q=")[1]));
      return Response.json({ records: [{ Id: "00Q9", Name: "Ana Lopez", Company: "Burger Co", Title: "VP Marketing", Status: "Engaged", LeadSource: "Inbound", CreatedDate: "2026-11-02T10:00:00.000+0000", Owner: { Name: "Jill" }, CreatedBy: { Name: "Momos Marketing" }, NoofOutlets__c: 18 }] });
    }
    if (url.includes("api.anthropic.com")) {
      claudeCalls++;
      const json = (await req.clone().json()) as any;
      assert.match(json.messages[0].content, /<question>\nwho is Burger Co\?\n<\/question>/);
      assert.match(json.messages[0].content, /We met them at MURTEC/, "the thread is passed along");
      if (claudeCalls === 1) {
        return Response.json({ id: "m1", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
          content: [{ type: "tool_use", id: "tu1", name: "find_leads", input: { text: "Burger Co" } }] });
      }
      const result = json.messages.at(-1).content[0];
      assert.equal(result.type, "tool_result");
      assert.match(result.content, /Ana Lopez/);
      return Response.json({ id: "m2", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
        content: [{ type: "text", text: "*Burger Co* is an 18-location QSR. <https://momos.my.salesforce.com/lightning/r/Lead/00Q9/view|Ana Lopez> (VP Marketing) is Engaged, owner Jill." }] });
    }
    throw new Error("unexpected fetch " + url);
  }) as typeof fetch;
  try {
    const { res, waits } = await post({ type: "event_callback", event: { type: "app_mention", user: "U2", text: "<@UBEACON> who is Burger Co?", channel: "C1", ts: "9.1", thread_ts: "9.0" } });
    assert.equal(res.status, 200, "Slack gets its answer right away");
    await Promise.all(waits);
    assert.equal(slack[0].method, "chat.postMessage");
    assert.equal(slack[0].body.text, "⏳ Looking into it…");
    assert.equal(slack[0].body.thread_ts, "9.0", "answers in the thread");
    assert.match(soql[0], /Company LIKE '%Burger Co%'/);
    const update = slack.find((s) => s.method === "chat.update")!;
    assert.equal(update.body.ts, "9.2");
    assert.match(update.body.text, /18-location QSR/);
    assert.equal(claudeCalls, 2);
  } finally {
    globalThis.fetch = real;
  }
});

test("a mention with no question gets the help text", async () => {
  const posts: any[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url === "https://slack.com/api/chat.postMessage") {
      posts.push(JSON.parse(await req.text()));
      return Response.json({ ok: true, ts: "1.2" });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  try {
    const { waits } = await post({ type: "event_callback", event: { type: "app_mention", text: "<@UBEACON>", channel: "C1", ts: "1.1" } });
    await Promise.all(waits);
    assert.equal(posts.length, 1);
    assert.match(posts[0].text, /Tag me with a question/);
    assert.equal(posts[0].thread_ts, "1.1");
  } finally {
    globalThis.fetch = real;
  }
});

test("a question in Beacon's DM is answered in the conversation, not a thread", async () => {
  const posts: any[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url.startsWith("https://slack.com/api/")) {
      posts.push({ method: req.url.split("/api/")[1], body: JSON.parse(await req.text()) });
      return Response.json({ ok: true, ts: "5.2", channel: "D1" });
    }
    if (req.url.includes("api.anthropic.com")) {
      return Response.json({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: "Hi! Ask me about leads." }] });
    }
    throw new Error("unexpected fetch " + req.url);
  }) as typeof fetch;
  try {
    const { waits } = await post({ type: "event_callback", event: { type: "message", channel_type: "im", user: "U2", text: "hello?", channel: "D1", ts: "5.1" } });
    await Promise.all(waits);
    assert.equal(posts[0].body.channel, "D1");
    assert.equal(posts[0].body.thread_ts, undefined, "no thread in a DM");
    assert.equal(posts.find((p) => p.method === "chat.update").body.text, "Hi! Ask me about leads.");
    // Edits and Beacon's own DM messages don't trigger an answer.
    const edit = await post({ type: "event_callback", event: { type: "message", subtype: "message_changed", channel_type: "im", channel: "D1", ts: "5.3" } });
    assert.equal(edit.waits.length, 0);
    const own = await post({ type: "event_callback", event: { type: "message", channel_type: "im", bot_id: "B1", text: "x", channel: "D1", ts: "5.4" } });
    assert.equal(own.waits.length, 0);
  } finally {
    globalThis.fetch = real;
  }
});
