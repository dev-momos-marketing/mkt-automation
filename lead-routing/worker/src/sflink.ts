// The "Open in Salesforce" link on each lead post. Zapier creates the Salesforce lead a little
// after the post goes out, so the 5-minute cron looks the lead up by email and adds the link to
// every copy of the post (the channel and the AE's DM). It tries for about an hour, then stops
// quietly: the post just has no link.
//
// Needs the SF_* secrets (read-only integration user) and the LEADS KV store. Off without them.
import { updatePosts, type InboundEnv } from "./inbound.ts";
import { query, salesforce, type NotifyEnv } from "./notify.ts";

type LinkEnv = InboundEnv & NotifyEnv;
export type PendingLink = { postKey: string; email: string; attempts: number; next: number; first: number };

export const LINK_AFTER_MIN = [1, 3, 6, 10, 20, 30, 60];
const LINK_TTL_S = 24 * 3600;

const sfReady = (env: LinkEnv) => !!(env.SF_DOMAIN && env.SF_CLIENT_ID && env.SF_CLIENT_SECRET && env.LEADS && env.SLACK_BOT_TOKEN);

export async function queueLink(env: LinkEnv, postKey: string, email: string, now = Date.now()): Promise<void> {
  if (!sfReady(env) || !email.trim()) return;
  const item: PendingLink = { postKey, email: email.trim().toLowerCase(), attempts: 0, first: now, next: now + LINK_AFTER_MIN[0] * 60_000 };
  await env.LEADS!.put(`sflink:${postKey}`, JSON.stringify(item), { expirationTtl: LINK_TTL_S });
}

// SOQL string literal: backslash and quote escaped.
export const soqlString = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

export type LeadLookup = (email: string) => Promise<string | null>;

// The newest Salesforce lead with this email, as a link. Null when it isn't there yet.
export function salesforceLookup(env: LinkEnv): LeadLookup {
  let sf: { token: string; instanceUrl: string } | null = null;
  return async (email) => {
    sf ??= await salesforce(env);
    const rows = await query(sf, `SELECT Id FROM Lead WHERE Email = ${soqlString(email)} ORDER BY CreatedDate DESC LIMIT 1`);
    return rows[0]?.Id ? `${sf.instanceUrl}/lightning/r/Lead/${rows[0].Id}/view` : null;
  };
}

// Runs from the 5-minute cron. At most `max` lookups a run.
export async function linkSalesforce(env: LinkEnv, now = Date.now(), lookup: LeadLookup = salesforceLookup(env), max = 10): Promise<{ linked: number; waiting: number; gave_up: number }> {
  const result = { linked: 0, waiting: 0, gave_up: 0 };
  if (!sfReady(env) || !env.LEADS?.list) return result;
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.LEADS.list({ prefix: "sflink:", cursor });
    keys.push(...page.keys.map((k) => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  let handled = 0;
  for (const key of keys) {
    if (handled >= max) break;
    const raw = await env.LEADS.get(key);
    if (!raw) continue;
    const item = JSON.parse(raw) as PendingLink;
    if (item.next > now) continue;
    handled++;
    let url: string | null = null;
    try {
      url = await lookup(item.email);
    } catch (err) {
      console.log(JSON.stringify({ sflink: "lookup failed", error: err instanceof Error ? err.message : String(err) }));
    }
    if (url) {
      await updatePosts(env, item.postKey, (l) => ({ ...l, salesforceUrl: url! }));
      await env.LEADS.delete?.(key);
      result.linked++;
      continue;
    }
    const attempts = item.attempts + 1;
    const wait = LINK_AFTER_MIN[attempts];
    if (wait == null) {
      await env.LEADS.delete?.(key);
      result.gave_up++;
      continue;
    }
    await env.LEADS.put(key, JSON.stringify({ ...item, attempts, next: item.first + wait * 60_000 }), { expirationTtl: LINK_TTL_S });
    result.waiting++;
  }
  if (handled) console.log(JSON.stringify({ sflinks: handled, ...result }));
  return result;
}
