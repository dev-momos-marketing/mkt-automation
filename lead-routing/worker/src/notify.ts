// Lead notifier: every 30 minutes, Beacon posts the leads reps added to Salesforce by hand to
// one Slack channel. Inbound leads already reach Slack through the demo form's Zapier step, so
// leads made by the form automation's user (SKIP_CREATORS) are left out. Bulk imports are left
// out too: when one person creates more than BULK_LIMIT leads in a run, Beacon posts one line
// for them instead of each lead.
//
// Each run looks at leads created between 35 and 5 minutes before it. Runs don't overlap, so
// each lead is posted once. There is no score check: Conversion.ai's score didn't predict deals.

export interface NotifyEnv {
  SF_DOMAIN?: string; // e.g. momos.my.salesforce.com
  SF_CLIENT_ID?: string; // secret
  SF_CLIENT_SECRET?: string; // secret
  SLACK_BOT_TOKEN?: string; // secret: Beacon's bot token (xoxb-...), needs chat:write
  SLACK_CHANNEL?: string;
  LEAD_SOURCE_FIELD?: string; // Lead field holding the channel, default LeadSource
  LEAD_LOCATIONS_FIELD?: string; // optional number-of-locations field, shown in the post
  SKIP_CREATORS?: string; // comma separated Salesforce user names whose leads are never posted
  BULK_LIMIT?: string; // more than this many leads from one creator in a run counts as an import
}

export type SfLead = {
  Id: string;
  Name?: string | null;
  Company?: string | null;
  Title?: string | null;
  Status?: string | null;
  Owner?: { Name?: string | null; Email?: string | null } | null;
  CreatedBy?: { Name?: string | null } | null;
  [field: string]: unknown;
};

export type Decision = { post: false; why: string } | { post: true };

const API = "v62.0";
const WINDOW_MS = 30 * 60_000; // the cron interval in wrangler.toml: change both together
const SYNC_LAG_MS = 5 * 60_000;
const JUNK_STATUS = /disqualif|junk|spam|unqualif|duplicate/i;

const list = (s?: string) =>
  (s ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export const creatorOf = (lead: SfLead): string => lead.CreatedBy?.Name?.trim() ?? "";

export function sourceOf(lead: SfLead, env: NotifyEnv): string {
  const v = lead[env.LEAD_SOURCE_FIELD?.trim() || "LeadSource"];
  return typeof v === "string" ? v : "";
}

export const bulkLimit = (env: NotifyEnv): number => {
  const n = Number(env.BULK_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 10;
};

// One lead on its own: junk status, then who made it.
export function decide(lead: SfLead, env: NotifyEnv): Decision {
  if (lead.Status && JUNK_STATUS.test(lead.Status)) return { post: false, why: `status ${lead.Status}` };
  const creator = creatorOf(lead);
  if (list(env.SKIP_CREATORS).includes(creator.toLowerCase())) return { post: false, why: `made by ${creator}` };
  return { post: true };
}

export function message(lead: SfLead, env: NotifyEnv, instanceUrl: string, ownerSlackId: string | null): string {
  const owner = ownerSlackId ? `<@${ownerSlackId}>` : (lead.Owner?.Name ?? "no owner");
  const who = [lead.Name, lead.Title].filter(Boolean).join(", ");
  const locField = env.LEAD_LOCATIONS_FIELD?.trim();
  const locations = locField && lead[locField] != null && lead[locField] !== "" ? `${lead[locField]} locations` : null;
  const creator = creatorOf(lead);
  return [
    `🟢 *${lead.Company || "Unknown company"}*${who ? ` · ${who}` : ""}`,
    [sourceOf(lead, env) || "no source", locations, creator ? `added by ${creator}` : null, `owner ${owner}`].filter(Boolean).join(" · "),
    `<${instanceUrl}/lightning/r/Lead/${lead.Id}/view|Open in Salesforce>`,
  ].join("\n");
}

// SOQL datetime literal: 2026-11-04T10:05:00Z, no quotes, no milliseconds.
const soqlDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function leadQuery(scheduled: Date, env: NotifyEnv): string {
  const fields = new Set(["Id", "Name", "Company", "Title", "Status", "Owner.Name", "Owner.Email", "CreatedBy.Name", env.LEAD_SOURCE_FIELD?.trim() || "LeadSource"]);
  if (env.LEAD_LOCATIONS_FIELD?.trim()) fields.add(env.LEAD_LOCATIONS_FIELD.trim());
  const end = new Date(scheduled.getTime() - SYNC_LAG_MS);
  const start = new Date(end.getTime() - WINDOW_MS);
  return `SELECT ${[...fields].join(", ")} FROM Lead WHERE CreatedDate >= ${soqlDate(start)} AND CreatedDate < ${soqlDate(end)} AND IsConverted = false ORDER BY CreatedDate`;
}

export async function salesforce(env: NotifyEnv): Promise<{ token: string; instanceUrl: string }> {
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

export async function query(sf: { token: string; instanceUrl: string }, soql: string): Promise<SfLead[]> {
  const res = await fetch(`${sf.instanceUrl}/services/data/${API}/query?q=${encodeURIComponent(soql)}`, {
    headers: { authorization: `Bearer ${sf.token}` },
  });
  if (!res.ok) throw new Error(`Salesforce query returned ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { records: SfLead[] }).records;
}

export async function notifyLeads(scheduled: Date, env: NotifyEnv): Promise<{ posted: number; skipped: number; imported: number }> {
  if (!env.SF_DOMAIN || !env.SF_CLIENT_ID || !env.SF_CLIENT_SECRET || !env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL) {
    console.log(JSON.stringify({ notifier: "off", reason: "missing Salesforce or Slack settings" }));
    return { posted: 0, skipped: 0, imported: 0 };
  }
  const channel = env.SLACK_CHANNEL.trim();
  const sf = await salesforce(env);
  const ids = new Map<string, string | null>();

  let skipped = 0;
  const byCreator = new Map<string, SfLead[]>();
  const fresh = await query(sf, leadQuery(scheduled, env));
  for (const lead of fresh) {
    const d = decide(lead, env);
    if (!d.post) {
      skipped++;
      console.log(JSON.stringify({ notifier: "skip", lead: lead.Id, why: d.why }));
      continue;
    }
    const creator = creatorOf(lead);
    byCreator.set(creator, [...(byCreator.get(creator) ?? []), lead]);
  }

  let posted = 0;
  let imported = 0;
  for (const [creator, leads] of byCreator) {
    if (leads.length > bulkLimit(env)) {
      // An import: one line for the batch.
      imported += leads.length;
      await slack(env, "chat.postMessage", { channel, text: `📥 ${creator || "Someone"} imported ${leads.length} leads. They aren't posted one by one.` });
      continue;
    }
    for (const lead of leads) {
      const text = message(lead, env, sf.instanceUrl, await slackIdFor(env, lead.Owner?.Email, ids));
      const out = await slack(env, "chat.postMessage", { channel, text, unfurl_links: false });
      if (out.ok) posted++;
      else console.error(JSON.stringify({ notifier: "slack error", lead: lead.Id, error: out.error }));
    }
  }

  console.log(JSON.stringify({ notifier: "run", new_leads: fresh.length, posted, skipped, imported }));
  return { posted, skipped, imported };
}
