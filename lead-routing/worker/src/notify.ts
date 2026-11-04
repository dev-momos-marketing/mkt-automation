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

// Slack mrkdwn: escape what came from Salesforce so it can't break links or mention people.
const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const has = (v: unknown) => v != null && v !== "" && v !== 0;
const day = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10) : "");

// The detailed post: who, how to reach them, where, why it's hot, the score broken down.
export function blocks(lead: SfLead, env: NotifyEnv, hot: boolean, instanceUrl: string, ownerSlackId: string | null): unknown[] {
  const f = (k: string) => lead[k];
  const score = scoreOf(lead, env);
  const flag = env.LEAD_HOT_FLAG_FIELD?.trim();
  const locField = env.LEAD_LOCATIONS_FIELD?.trim();
  const owner = ownerSlackId ? `<@${ownerSlackId}>` : esc(lead.Owner?.Name ?? "no owner");
  const company = String(lead.Company || "Unknown company");
  const out: unknown[] = [
    { type: "header", text: { type: "plain_text", text: `${hot ? "🔥 Hot lead" : "🟢 New lead"}: ${company}`.slice(0, 150), emoji: true } },
  ];

  const who = [lead.Name ? `*${esc(lead.Name)}*` : null, has(lead.Title) ? esc(lead.Title) : null].filter(Boolean).join(" · ");
  const reach = [
    has(f("Email")) ? `<mailto:${esc(f("Email"))}|${esc(f("Email"))}>` : null,
    has(f("Phone")) ? esc(f("Phone")) : null,
  ].filter(Boolean).join(" · ");
  if (who || reach) out.push({ type: "section", text: { type: "mrkdwn", text: [who, reach].filter(Boolean).join("\n") } });

  const place = ["City", "State", "Country"].map(f).filter(has).map(esc).join(", ");
  const source = [sourceOf(lead, env) || "no source", f("Specific_Lead_Source__c"), f("Campaign_Source__c")].filter(has).map(esc).join(" · ");
  const website = has(f("Website")) ? String(f("Website")) : "";
  const websiteUrl = /^https?:\/\//.test(website) ? website : `https://${website}`;
  const fields: [string, string][] = [
    ["Owner", owner],
    ["Status", has(lead.Status) ? esc(lead.Status) : ""],
    ["Source", source],
    ["Locations", locField && has(lead[locField]) ? esc(lead[locField]) : ""],
    ["Based in", place],
    ["Industry", has(f("Industry")) ? esc(f("Industry")) : ""],
    ["Website", website ? `<${esc(websiteUrl)}|${esc(website.replace(/^https?:\/\//, ""))}>` : ""],
    ["Est. MQL value", has(f("Estimated_MQL_Value__c")) ? `$${Number(f("Estimated_MQL_Value__c")).toLocaleString("en-US")}` : ""],
    ["Created", day(f("CreatedDate"))],
    ["Last activity", day(f("LastActivityDate"))],
  ];
  const shown = fields.filter(([, v]) => v).map(([k, v]) => ({ type: "mrkdwn", text: `*${k}*\n${v}` }));
  if (shown.length) out.push({ type: "section", fields: shown.slice(0, 10) });

  if (score != null || hot) {
    const bar = Number(env.HOT_SCORE || 70);
    const why = hot
      ? [flag && lead[flag] === true ? "MQL Contact Hot is ticked" : null, score != null && score >= bar ? `score is ${bar}+` : null].filter(Boolean).join(" and ")
      : "";
    const tiers = [
      has(f("Lead_Score_Profile_Fit__c"))
        ? `profile fit ${esc(f("Lead_Score_Profile_Fit__c"))}${has(f("Lead_Score_Profile_Tier__c")) ? ` (${esc(f("Lead_Score_Profile_Tier__c"))})` : ""}`
        : null,
      has(f("Lead_Score_Engagement_Tier__c")) ? `engagement ${esc(f("Lead_Score_Engagement_Tier__c"))}` : null,
    ].filter(Boolean).join(" · ");
    const parts: [string, string][] = [
      ["Website", "Lead_Score_Website_Engagement__c"], ["Email opens", "Lead_Score_Email_Open_Engagement__c"],
      ["Email clicks", "Lead_Score_Email_Click_Engagement__c"], ["Forms", "Lead_Score_Form_Submission__c"],
      ["Events", "Lead_Score_Event_Engagement__c"], ["Offline", "Lead_Score_Offline_Engagement__c"],
    ];
    const breakdown = parts.filter(([, k]) => has(f(k))).map(([label, k]) => `${label} ${esc(f(k))}`).join(" · ");
    const lines = [
      why ? `*Why it's hot:* ${why}` : null,
      `*Score ${score ?? "n/a"}*${tiers ? ` · ${tiers}` : ""}`,
      breakdown ? `Points from: ${breakdown}` : null,
    ].filter(Boolean);
    out.push({ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } });
  }

  const utm = [f("UTM_Source_MKTG_only__c"), f("UTM_Campaign_MKTG_only__c")].filter(has).map(esc).join(" / ");
  const context = [
    has(f("Gong__Flow_Status__c")) ? `Gong flow: ${esc(f("Gong__Flow_Status__c"))}` : null,
    utm ? `UTM: ${utm}` : null,
    has(f("Description")) ? `Note: ${esc(String(f("Description")).replace(/\s+/g, " ").slice(0, 200))}` : null,
  ].filter(Boolean) as string[];
  if (context.length) out.push({ type: "context", elements: context.map((t) => ({ type: "mrkdwn", text: t })) });

  out.push({
    type: "actions",
    elements: [{ type: "button", text: { type: "plain_text", text: "Open in Salesforce" }, url: `${instanceUrl}/lightning/r/Lead/${lead.Id}/view`, style: "primary" }],
  });
  return out;
}

// SOQL datetime literal: 2026-11-04T10:05:00Z, no quotes, no milliseconds.
const soqlDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

// Extra Lead fields shown in the post. Only the ones the integration user can read are queried
// (checked once per run), so a hidden or renamed field drops out instead of breaking the query.
export const DETAIL_FIELDS = [
  "Email", "Phone", "Website", "Industry", "City", "State", "Country", "CreatedDate", "LastActivityDate",
  "Specific_Lead_Source__c", "Campaign_Source__c", "UTM_Source_MKTG_only__c", "UTM_Campaign_MKTG_only__c",
  "Lead_Score_Profile_Fit__c", "Lead_Score_Profile_Tier__c", "Lead_Score_Engagement_Tier__c",
  "Lead_Score_Website_Engagement__c", "Lead_Score_Email_Open_Engagement__c", "Lead_Score_Email_Click_Engagement__c",
  "Lead_Score_Form_Submission__c", "Lead_Score_Event_Engagement__c", "Lead_Score_Offline_Engagement__c",
  "Gong__Flow_Status__c", "Estimated_MQL_Value__c", "Description",
];

function selectFields(env: NotifyEnv, extra: string[] = []): string {
  const fields = new Set(["Id", "Name", "Company", "Title", "Status", "Owner.Name", "Owner.Email", env.LEAD_SOURCE_FIELD?.trim() || "LeadSource"]);
  for (const f of [env.LEAD_SCORE_FIELD, env.LEAD_HOT_FLAG_FIELD, env.LEAD_LOCATIONS_FIELD]) if (f?.trim()) fields.add(f.trim());
  for (const f of extra) fields.add(f);
  return [...fields].join(", ");
}

export function leadQuery(scheduled: Date, env: NotifyEnv, extra: string[] = []): string {
  const end = new Date(scheduled.getTime() - SYNC_LAG_MS);
  const start = new Date(end.getTime() - WINDOW_MS);
  return `SELECT ${selectFields(env, extra)} FROM Lead WHERE CreatedDate >= ${soqlDate(start)} AND CreatedDate < ${soqlDate(end)} AND IsConverted = false ORDER BY CreatedDate`;
}

// Leads changed in the last 45 minutes that are hot now. Null when no score or flag is set up.
export function hotQuery(scheduled: Date, env: NotifyEnv, extra: string[] = []): string | null {
  const hot: string[] = [];
  const score = env.LEAD_SCORE_FIELD?.trim();
  const flag = env.LEAD_HOT_FLAG_FIELD?.trim();
  if (score) hot.push(`${score} >= ${Number(env.HOT_SCORE || 70)}`);
  if (flag) hot.push(`${flag} = true`);
  if (!hot.length) return null;
  const since = new Date(scheduled.getTime() - HOT_LOOKBACK_MS);
  return `SELECT ${selectFields(env, extra)} FROM Lead WHERE LastModifiedDate >= ${soqlDate(since)} AND IsConverted = false AND (${hot.join(" OR ")}) ORDER BY LastModifiedDate LIMIT 200`;
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
    const json = (await res.json()) as { ok: boolean; error?: string; user?: { id: string } };
    const id = json.ok && json.user ? json.user.id : null;
    // missing_scope: Beacon needs users:read.email. users_not_found: their Slack email differs from Salesforce.
    if (!id) console.log(JSON.stringify({ notifier: "owner not found in Slack", error: json.error ?? "unknown" }));
    cache.set(email, id);
    return id;
  } catch {
    return null;
  }
}

// Which of DETAIL_FIELDS the integration user can read. On any error, none: the post is shorter, not broken.
async function readableDetails(sf: { token: string; instanceUrl: string }): Promise<string[]> {
  try {
    const res = await fetch(`${sf.instanceUrl}/services/data/${API}/sobjects/Lead/describe`, { headers: { authorization: `Bearer ${sf.token}` } });
    if (!res.ok) return [];
    const names = new Set(((await res.json()) as { fields: { name: string }[] }).fields.map((x) => x.name));
    return DETAIL_FIELDS.filter((x) => names.has(x));
  } catch {
    return [];
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
  const extra = await readableDetails(sf);
  const ids = new Map<string, string | null>();
  const seenKey = (lead: SfLead) => `hot:${lead.Id}`;
  const post = async (lead: SfLead, hot: boolean): Promise<boolean> => {
    const ownerId = await slackIdFor(env, lead.Owner?.Email, ids);
    // text is the fallback for notifications and old clients; blocks is the detailed post.
    const text = message(lead, env, hot, sf.instanceUrl, ownerId);
    const out = await slack(env, "chat.postMessage", { channel, text, blocks: blocks(lead, env, hot, sf.instanceUrl, ownerId), unfurl_links: false, unfurl_media: false });
    if (!out.ok) console.error(JSON.stringify({ notifier: "slack error", lead: lead.Id, error: out.error }));
    if (out.ok && hot && env.SEEN) await env.SEEN.put(seenKey(lead), "1", { expirationTtl: SEEN_TTL_S });
    return !!out.ok;
  };

  // 1. New leads from named sources.
  let posted = 0;
  let skipped = 0;
  const fresh = await query(sf, leadQuery(scheduled, env, extra));
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
  const hq = hotQuery(scheduled, env, extra);
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
