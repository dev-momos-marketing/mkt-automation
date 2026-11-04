// Lead notifier: every 5 minutes, posts the new Salesforce leads worth knowing about to one
// Slack channel, through the Beacon app. Salesforce is the one place every source lands
// (demo form, Conversion forms, conferences, referrals, partners), so this covers all of them.
//
// No state: each run looks at leads created between 10 and 5 minutes before it was scheduled.
// The 5-minute lag gives Conversion time to sync its score onto the lead. Runs don't overlap,
// so a lead is posted once.

export interface NotifyEnv {
  SF_DOMAIN?: string; // e.g. momos.my.salesforce.com
  SF_CLIENT_ID?: string; // secret
  SF_CLIENT_SECRET?: string; // secret
  SLACK_BOT_TOKEN?: string; // secret: Beacon's bot token (xoxb-...), needs chat:write
  SLACK_CHANNEL?: string;
  LEAD_SOURCE_FIELD?: string; // Lead field holding the channel, default LeadSource
  LEAD_SCORE_FIELD?: string; // Conversion's score field on Lead. Empty: no scores, no 🔥
  HOT_SCORE?: string; // score at or above this is 🔥
  SKIP_SOURCES?: string; // comma separated: never posted (the rep created the lead)
  SCORE_ONLY_SOURCES?: string; // comma separated: posted only when the score is hot
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
const WINDOW_MS = 5 * 60_000;
const SYNC_LAG_MS = 5 * 60_000;
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

// Which leads reach the channel. Order: junk status, then the source rules, then the score.
export function decide(lead: SfLead, env: NotifyEnv): Decision {
  if (lead.Status && JUNK_STATUS.test(lead.Status)) return { post: false, why: `status ${lead.Status}` };
  const source = sourceOf(lead, env).toLowerCase();
  if (list(env.SKIP_SOURCES).includes(source)) return { post: false, why: `source ${source}` };
  const score = scoreOf(lead, env);
  const hot = score != null && score >= Number(env.HOT_SCORE || 70);
  if (list(env.SCORE_ONLY_SOURCES).includes(source) && !hot) return { post: false, why: `source ${source}, score ${score}` };
  return { post: true, hot };
}

export function message(lead: SfLead, env: NotifyEnv, hot: boolean, instanceUrl: string, ownerSlackId: string | null): string {
  const score = scoreOf(lead, env);
  const owner = ownerSlackId ? `<@${ownerSlackId}>` : (lead.Owner?.Name ?? "no owner");
  const who = [lead.Name, lead.Title].filter(Boolean).join(", ");
  const parts = [
    `${hot ? "🔥" : "🟢"} *${lead.Company || "Unknown company"}*${who ? ` · ${who}` : ""}`,
    [sourceOf(lead, env) || "no source", score != null ? `score ${score}` : null, `owner ${owner}`].filter(Boolean).join(" · "),
    `<${instanceUrl}/lightning/r/Lead/${lead.Id}/view|Open in Salesforce>`,
  ];
  return parts.join("\n");
}

// SOQL datetime literal: 2026-11-04T10:05:00Z, no quotes, no milliseconds.
const soqlDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function leadQuery(scheduled: Date, env: NotifyEnv): string {
  const end = new Date(scheduled.getTime() - SYNC_LAG_MS);
  const start = new Date(end.getTime() - WINDOW_MS);
  const fields = new Set(["Id", "Name", "Company", "Title", "Status", "Owner.Name", "Owner.Email", env.LEAD_SOURCE_FIELD?.trim() || "LeadSource"]);
  if (env.LEAD_SCORE_FIELD?.trim()) fields.add(env.LEAD_SCORE_FIELD.trim());
  return `SELECT ${[...fields].join(", ")} FROM Lead WHERE CreatedDate >= ${soqlDate(start)} AND CreatedDate < ${soqlDate(end)} AND IsConverted = false ORDER BY CreatedDate`;
}

async function salesforce(env: NotifyEnv): Promise<{ token: string; instanceUrl: string }> {
  const base = env.SF_DOMAIN!.trim().replace(/\/+$/, "").replace(/^(?!https:\/\/)/, "https://");
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

export async function notifyLeads(scheduled: Date, env: NotifyEnv): Promise<{ posted: number; skipped: number }> {
  if (!env.SF_DOMAIN || !env.SF_CLIENT_ID || !env.SF_CLIENT_SECRET || !env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL) {
    console.log(JSON.stringify({ notifier: "off", reason: "missing Salesforce or Slack settings" }));
    return { posted: 0, skipped: 0 };
  }
  const sf = await salesforce(env);
  const res = await fetch(`${sf.instanceUrl}/services/data/${API}/query?q=${encodeURIComponent(leadQuery(scheduled, env))}`, {
    headers: { authorization: `Bearer ${sf.token}` },
  });
  if (!res.ok) throw new Error(`Salesforce query returned ${res.status}: ${await res.text()}`);
  const { records } = (await res.json()) as { records: SfLead[] };

  const ids = new Map<string, string | null>();
  let posted = 0;
  let skipped = 0;
  for (const lead of records) {
    const d = decide(lead, env);
    if (!d.post) {
      skipped++;
      console.log(JSON.stringify({ notifier: "skip", lead: lead.Id, why: d.why }));
      continue;
    }
    const text = message(lead, env, d.hot, sf.instanceUrl, await slackIdFor(env, lead.Owner?.Email, ids));
    const out = await slack(env, "chat.postMessage", { channel: env.SLACK_CHANNEL.trim(), text, unfurl_links: false });
    if (out.ok) posted++;
    else console.error(JSON.stringify({ notifier: "slack error", lead: lead.Id, error: out.error }));
  }
  console.log(JSON.stringify({ notifier: "run", leads: records.length, posted, skipped }));
  return { posted, skipped };
}
