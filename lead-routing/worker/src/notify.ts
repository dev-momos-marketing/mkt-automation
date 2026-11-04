// Lead notifier: every 30 minutes, posts the new Salesforce leads worth knowing about to one
// Slack channel, through the Beacon app. Salesforce is the one place every source lands
// (demo form, Conversion forms, conferences, referrals, partners), so this covers all of them.
//
// Two checks per run:
// 1. New leads from named sources (Inbound, referrals, partners, conferences): leads created
//    between 35 and 5 minutes before the run, so Conversion has time to score them. Runs don't
//    overlap, so each is posted once.
// 2. Leads that just turned hot (score at HOT_SCORE or MQL Contact Hot ticked), any source. In
//    Salesforce these are mostly imported leads that warmed up later. Posted once: the SEEN store
//    (Cloudflare KV) remembers which hot leads were already posted.

export interface NotifyEnv {
  SF_DOMAIN?: string; // e.g. momos.my.salesforce.com
  SF_CLIENT_ID?: string; // secret
  SF_CLIENT_SECRET?: string; // secret
  SLACK_BOT_TOKEN?: string; // secret: Beacon's bot token (xoxb-...), needs chat:write
  SLACK_CHANNEL?: string;
  LEAD_SOURCE_FIELD?: string; // Lead field holding the channel, default LeadSource
  LEAD_SCORE_FIELD?: string; // Conversion's score field on Lead. Empty: no scores
  HOT_SCORE?: string; // score at or above this is 🔥
  LEAD_HOT_FLAG_FIELD?: string; // optional checkbox on Lead that also makes a lead 🔥
  LEAD_LOCATIONS_FIELD?: string; // optional number-of-locations field, shown in the post
  NOTIFY_SOURCES?: string; // comma separated: these sources are posted. Anything else, blank included, is not
  SCORE_ONLY_SOURCES?: string; // comma separated: posted only when 🔥
  SEEN?: { get(key: string): Promise<string | null>; put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> };
}

export type SfLead = {
  Id: string;
  Name?: string | null;
  Company?: string | null;
  Title?: string | null;
  Status?: string | null;
  Owner?: { Name?: string | null; Email?: string | null } | null;
  [field: string]: unknown;
};

export type Decision = { post: false; why: string } | { post: true; hot: boolean };

const API = "v62.0";
const WINDOW_MS = 30 * 60_000; // the cron interval in wrangler.toml: change both together
const SYNC_LAG_MS = 5 * 60_000;
const HOT_LOOKBACK_MS = 45 * 60_000; // overlaps runs on purpose; SEEN stops repeats
const SEEN_TTL_S = 180 * 24 * 3600;
const MAX_HOT_POSTS = 10; // per run, so a bulk update can't flood the channel
const JUNK_STATUS = /disqualif|junk|spam|unqualif|duplicate/i;

const list = (s?: string) =>
  (s ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export function scoreOf(lead: SfLead, env: NotifyEnv): number | null {
  const field = env.LEAD_SCORE_FIELD?.trim();
  if (!field) return null;
  const n = Number(lead[field]);
  return lead[field] == null || Number.isNaN(n) ? null : n;
}

export function sourceOf(lead: SfLead, env: NotifyEnv): string {
  const v = lead[env.LEAD_SOURCE_FIELD?.trim() || "LeadSource"];
  return typeof v === "string" ? v : "";
}

export function isHot(lead: SfLead, env: NotifyEnv): boolean {
  const score = scoreOf(lead, env);
  const flag = env.LEAD_HOT_FLAG_FIELD?.trim();
  return (score != null && score >= Number(env.HOT_SCORE || 70)) || (!!flag && lead[flag] === true);
}

// Which leads reach the channel. Order: junk status, then the source, then 🔥.
// Only named sources post: most leads in Salesforce are bulk imports with no source.
export function decide(lead: SfLead, env: NotifyEnv): Decision {
  if (lead.Status && JUNK_STATUS.test(lead.Status)) return { post: false, why: `status ${lead.Status}` };
  const source = sourceOf(lead, env).toLowerCase();
  const hot = isHot(lead, env);
  if (list(env.NOTIFY_SOURCES).includes(source)) return { post: true, hot };
  if (list(env.SCORE_ONLY_SOURCES).includes(source) && hot) return { post: true, hot };
  return { post: false, why: `source ${source || "(blank)"}${hot ? "" : ", not hot"}` };
}

export function message(lead: SfLead, env: NotifyEnv, hot: boolean, instanceUrl: string, ownerSlackId: string | null): string {
  const score = scoreOf(lead, env);
  const owner = ownerSlackId ? `<@${ownerSlackId}>` : (lead.Owner?.Name ?? "no owner");
  const who = [lead.Name, lead.Title].filter(Boolean).join(", ");
  const locField = env.LEAD_LOCATIONS_FIELD?.trim();
  const locations = locField && lead[locField] != null && lead[locField] !== "" ? `${lead[locField]} locations` : null;
  const parts = [
    `${hot ? "🔥" : "🟢"} *${lead.Company || "Unknown company"}*${who ? ` · ${who}` : ""}`,
    [sourceOf(lead, env) || "no source", locations, score != null ? `score ${score}` : null, `owner ${owner}`].filter(Boolean).join(" · "),
    `<${instanceUrl}/lightning/r/Lead/${lead.Id}/view|Open in Salesforce>`,
  ];
  return parts.join("\n");
}

// SOQL datetime literal: 2026-11-04T10:05:00Z, no quotes, no milliseconds.
const soqlDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function selectFields(env: NotifyEnv): string {
  const fields = new Set(["Id", "Name", "Company", "Title", "Status", "Owner.Name", "Owner.Email", env.LEAD_SOURCE_FIELD?.trim() || "LeadSource"]);
  for (const f of [env.LEAD_SCORE_FIELD, env.LEAD_HOT_FLAG_FIELD, env.LEAD_LOCATIONS_FIELD]) if (f?.trim()) fields.add(f.trim());
  return [...fields].join(", ");
}

export function leadQuery(scheduled: Date, env: NotifyEnv): string {
  const end = new Date(scheduled.getTime() - SYNC_LAG_MS);
  const start = new Date(end.getTime() - WINDOW_MS);
  return `SELECT ${selectFields(env)} FROM Lead WHERE CreatedDate >= ${soqlDate(start)} AND CreatedDate < ${soqlDate(end)} AND IsConverted = false ORDER BY CreatedDate`;
}

// Leads changed in the last 45 minutes that are hot now. Null when no score or flag is set up.
export function hotQuery(scheduled: Date, env: NotifyEnv): string | null {
  const hot: string[] = [];
  const score = env.LEAD_SCORE_FIELD?.trim();
  const flag = env.LEAD_HOT_FLAG_FIELD?.trim();
  if (score) hot.push(`${score} >= ${Number(env.HOT_SCORE || 70)}`);
  if (flag) hot.push(`${flag} = true`);
  if (!hot.length) return null;
  const since = new Date(scheduled.getTime() - HOT_LOOKBACK_MS);
  return `SELECT ${selectFields(env)} FROM Lead WHERE LastModifiedDate >= ${soqlDate(since)} AND IsConverted = false AND (${hot.join(" OR ")}) ORDER BY LastModifiedDate LIMIT 200`;
}

async function salesforce(env: NotifyEnv): Promise<{ token: string; instanceUrl: string }> {
  const base = env.SF_DOMAIN!.trim().replace(/\/+$/, "").replace(/^https?:\/\//, "").replace(/^/, "https://");
  const res = await fetch(`${base}/services/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.SF_CLIENT_ID!.trim(), client_secret: env.SF_CLIENT_SECRET!.trim() }),
  });
  const json = (await res.json()) as { access_token?: string; instance_url?: string; error_description?: string };
  if (!res.ok || !json.access_token || !json.instance_url) throw new Error(`Salesforce login failed (${res.status}): ${json.error_description ?? ""}`);
  return { token: json.access_token, instanceUrl: json.instance_url };
}

async function slack(env: NotifyEnv, method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${env.SLACK_BOT_TOKEN!.trim()}` },
    body: JSON.stringify(body),
  });
  return (await res.json()) as Record<string, unknown>;
}

// The owner's Slack ID, so the post mentions them. Needs users:read.email; without it, the name is shown.
async function slackIdFor(env: NotifyEnv, email: string | null | undefined, cache: Map<string, string | null>): Promise<string | null> {
  if (!email) return null;
  if (cache.has(email)) return cache.get(email)!;
  try {
    const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN!.trim()}` },
    });
    const json = (await res.json()) as { ok: boolean; user?: { id: string } };
    const id = json.ok && json.user ? json.user.id : null;
    cache.set(email, id);
    return id;
  } catch {
    return null;
  }
}

async function query(sf: { token: string; instanceUrl: string }, soql: string): Promise<SfLead[]> {
  const res = await fetch(`${sf.instanceUrl}/services/data/${API}/query?q=${encodeURIComponent(soql)}`, {
    headers: { authorization: `Bearer ${sf.token}` },
  });
  if (!res.ok) throw new Error(`Salesforce query returned ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { records: SfLead[] }).records;
}

export async function notifyLeads(scheduled: Date, env: NotifyEnv): Promise<{ posted: number; skipped: number; hot: number }> {
  if (!env.SF_DOMAIN || !env.SF_CLIENT_ID || !env.SF_CLIENT_SECRET || !env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL) {
    console.log(JSON.stringify({ notifier: "off", reason: "missing Salesforce or Slack settings" }));
    return { posted: 0, skipped: 0, hot: 0 };
  }
  const channel = env.SLACK_CHANNEL.trim();
  const sf = await salesforce(env);
  const ids = new Map<string, string | null>();
  const seenKey = (lead: SfLead) => `hot:${lead.Id}`;
  const post = async (lead: SfLead, hot: boolean): Promise<boolean> => {
    const text = message(lead, env, hot, sf.instanceUrl, await slackIdFor(env, lead.Owner?.Email, ids));
    const out = await slack(env, "chat.postMessage", { channel, text, unfurl_links: false });
    if (!out.ok) console.error(JSON.stringify({ notifier: "slack error", lead: lead.Id, error: out.error }));
    if (out.ok && hot && env.SEEN) await env.SEEN.put(seenKey(lead), "1", { expirationTtl: SEEN_TTL_S });
    return !!out.ok;
  };

  // 1. New leads from named sources.
  let posted = 0;
  let skipped = 0;
  const fresh = await query(sf, leadQuery(scheduled, env));
  for (const lead of fresh) {
    const d = decide(lead, env);
    if (!d.post) {
      skipped++;
      console.log(JSON.stringify({ notifier: "skip", lead: lead.Id, why: d.why }));
      continue;
    }
    if (d.hot && env.SEEN && (await env.SEEN.get(seenKey(lead)))) continue; // check 2 already posted it
    if (await post(lead, d.hot)) posted++;
  }

  // 2. Leads that just turned hot, any source. Needs SEEN, or they would repeat every run.
  let hot = 0;
  const hq = hotQuery(scheduled, env);
  if (hq && env.SEEN) {
    const waiting: SfLead[] = [];
    for (const lead of await query(sf, hq)) {
      if (lead.Status && JUNK_STATUS.test(lead.Status)) continue;
      if (!(await env.SEEN.get(seenKey(lead)))) waiting.push(lead);
    }
    for (const lead of waiting.slice(0, MAX_HOT_POSTS)) if (await post(lead, true)) hot++;
    const rest = waiting.slice(MAX_HOT_POSTS);
    if (rest.length) {
      // A bulk update turned many hot at once: one line for the rest, and don't post them later.
      await slack(env, "chat.postMessage", { channel, text: `🔥 …and ${rest.length} more leads turned hot. Filter Salesforce leads by MQL Contact Hot to see them.` });
      for (const lead of rest) await env.SEEN.put(seenKey(lead), "1", { expirationTtl: SEEN_TTL_S });
    }
  } else if (hq) {
    console.log(JSON.stringify({ notifier: "hot check off", reason: "no SEEN store" }));
  }

  console.log(JSON.stringify({ notifier: "run", new_leads: fresh.length, posted, skipped, hot }));
  return { posted, skipped, hot };
}
