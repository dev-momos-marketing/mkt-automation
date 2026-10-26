// Beacon: posts every new, legit Salesforce Lead to Slack.
// Every 30 minutes (cron in wrangler.toml) it reads the Leads created in the 30 minutes before,
// drops spam, tests and our own people (legit.ts), and posts the rest as Beacon.
// Any source works: Book-a-demo (via Zapier), conference and event leads typed in by hand, imports.
import { notLegitReason, rulesFrom, type Lead } from "./legit.ts";
import { login, newLeads } from "./salesforce.ts";
import { batchSummary, leadCard, post } from "./slack.ts";

export interface Env {
  SF_DOMAIN: string; // e.g. https://fun-ruby-7024.my.salesforce.com
  SF_CLIENT_ID: string;
  SF_CLIENT_SECRET: string;
  SLACK_BOT_TOKEN: string; // Beacon's xoxb- token
  SLACK_CHANNEL_ID: string;
  SKIP_STATUSES?: string; // comma separated Lead Status values
  INTERNAL_DOMAINS?: string; // comma separated
  BATCH_SIZE?: string; // more legit leads than this in one run: one summary message
}

const MINUTE = 60_000;
// How often Beacon runs. Keep in step with crons in wrangler.toml.
export const EVERY_MINUTES = 30;

// Each run reads the 30 minutes that ended one minute ago, e.g. the 10:30 run reads 9:59 to 10:29.
// The windows follow each other with no gap or overlap, so every lead is read exactly once
// and nothing needs to be stored. The minute of delay lets slow Salesforce saves land first.
export function windowFor(scheduledTime: number): { from: Date; to: Date } {
  const every = EVERY_MINUTES * MINUTE;
  const run = Math.floor(scheduledTime / every) * every;
  return { from: new Date(run - every - MINUTE), to: new Date(run - MINUTE) };
}

export async function notify(env: Env, from: Date, to: Date): Promise<{ posted: number; skipped: number }> {
  const sf = await login(env.SF_DOMAIN, env.SF_CLIENT_ID, env.SF_CLIENT_SECRET);
  const leads = await newLeads(sf, from, to);
  const rules = rulesFrom(env.SKIP_STATUSES, env.INTERNAL_DOMAINS);

  const legit: Lead[] = [];
  for (const lead of leads) {
    const reason = notLegitReason(lead, rules);
    // One line per new lead in the Logs tab. No email or name, just enough to audit the filter.
    console.log(JSON.stringify({ lead: lead.Id, company: lead.Company, source: lead.LeadSource, posted: !reason, reason }));
    if (!reason) legit.push(lead);
  }

  const batch = Number(env.BATCH_SIZE ?? "10") || 10;
  if (legit.length > batch) {
    await post(env.SLACK_BOT_TOKEN, env.SLACK_CHANNEL_ID, batchSummary(legit, sf.instanceUrl));
  } else {
    for (const lead of legit) await post(env.SLACK_BOT_TOKEN, env.SLACK_CHANNEL_ID, leadCard(lead, sf.instanceUrl));
  }
  return { posted: legit.length, skipped: leads.length - legit.length };
}

export default {
  async scheduled(controller: { scheduledTime: number }, env: Env): Promise<void> {
    const { from, to } = windowFor(controller.scheduledTime);
    // A failure here shows as an error in the Logs tab. Those leads will not be posted.
    await notify(env, from, to);
  },

  async fetch(): Promise<Response> {
    return new Response("Beacon runs on a schedule. Nothing to see here.", { status: 404 });
  },
};
