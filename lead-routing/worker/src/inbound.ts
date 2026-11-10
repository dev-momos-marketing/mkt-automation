// Inbound alerts: the Worker posts each demo request to Slack itself, through Beacon, so a lead
// never depends on Zapier's filter to be seen. Zapier only creates the Salesforce lead.
//
// - One post per demo request that isn't spam or a confident not-fit, after the research.
// - A repeat submission from the same email within 7 days gets one short line, not a new post.
// - "said 1-5, found 70+" gets a 🔺, because people often answer for their own store.
// - If Zapier fails, the post says the lead isn't in Salesforce.
// - Once a day: a health alert (no submissions, Zapier errors, Claude failures) and a one-line
//   roll-up of the leads that were turned away, so a wrong not-fit still gets seen.
//
// Off until INBOUND_SLACK_CHANNEL and SLACK_BOT_TOKEN are set. Counts and repeats need the LEADS
// KV store; without it, every submission posts and the daily report is skipped.

export type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export interface InboundEnv {
  SLACK_BOT_TOKEN?: string;
  INBOUND_SLACK_CHANNEL?: string; // channel ID (C...) or name. Empty: no inbound posts
  LEADS?: Kv;
}

export type InboundLead = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title: string;
  country: string;
  locations: string; // the form's bucket: 1-5, 6-49, 50-249, 250+
  status: "routed" | "follow_up" | "not_fit" | "spam";
  reason: string;
  ae: string; // James, Jill or ""
  region: string;
  fit: { icp_fit: string; confidence?: number };
  research: {
    verdict: string; // verified | suspicious | spam | unavailable
    icp_fit?: string;
    confidence?: number;
    company_name?: string;
    company_website?: string;
    industry?: string;
    locations_found?: string;
    hq_country?: string;
    person_matches_company?: boolean;
    red_flags?: string[];
    summary?: string;
    error?: string;
  };
  utm: { source: string; campaign: string };
  salesforce: { ok: boolean; error?: string }; // the Zapier send
};

export type DayStats = {
  submissions: number;
  spam: number;
  zapier_errors: number;
  claude_failures: number;
  not_fit: { company: string; reason: string }[];
};

const REPEAT_TTL_S = 7 * 24 * 3600;
const DAY_TTL_S = 14 * 24 * 3600;
const BUCKET_TOP: Record<string, number> = { "1-5": 5, "6-49": 49, "50-249": 249 };

// The first number in what the research found ("About 70-98 brand-wide" -> 70, "6,700+" -> 6700).
export function firstNumber(s = ""): number | null {
  const m = s.replace(/(\d),(\d{3})/g, "$1$2").match(/\d+/);
  return m ? Number(m[0]) : null;
}

// True when the web found far more locations than the form's answer. 250+ can't be undersold.
export function sizeMismatch(bucket: string, found = ""): boolean {
  const top = BUCKET_TOP[bucket];
  const n = firstNumber(found);
  if (!top || n == null) return false;
  return n >= 10 && n >= top * 2;
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const VERDICT_ICON: Record<string, string> = { verified: "✅", suspicious: "⚠️", spam: "⛔", unavailable: "❔" };
const clean = (s = "") => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!).trim();

export function inboundMessage(l: InboundLead): string {
  const r = l.research;
  const sure = l.reason === "ok";
  const head = sure ? `🟢 *New demo request → ${l.ae || "no AE"}*` : `🟡 *New demo request → ${l.ae || "no AE"}* (unsure, booked anyway)`;
  const name = clean(`${l.firstName} ${l.lastName}`) || "No name";
  const company = clean(r.company_name || l.company) || "Unknown company";
  const site = r.company_website ? ` · <${r.company_website}|website>` : "";
  const found = r.locations_found ? ` · found *${clean(r.locations_found)}*${sizeMismatch(l.locations, r.locations_found) ? " 🔺" : ""}` : "";
  const lines = [
    `${head} · ${l.region}`,
    `*${name}* · ${clean(l.title) || "no title"}`,
    `*${company}*${site}${r.industry ? ` · ${clean(r.industry)}` : ""}`,
    `${clean(l.email)} · ${clean(l.country) || "no country"}${r.hq_country ? ` · HQ ${clean(r.hq_country)}` : ""}`,
    `Locations: said *${clean(l.locations) || "?"}*${found}`,
    `Booking check: ${sure ? `${l.fit.icp_fit}${l.fit.confidence != null ? ` ${l.fit.confidence}` : ""}` : clean(l.reason)}`,
    r.verdict === "unavailable"
      ? `Research: ❔ unavailable${r.error ? ` (${clean(r.error).slice(0, 80)})` : ""}`
      : `Research: ${VERDICT_ICON[r.verdict] ?? ""} ${r.verdict}${r.confidence != null ? ` (${r.confidence})` : ""} · ICP ${r.icp_fit ?? "?"} · works there: ${r.person_matches_company ? "yes" : "no"}`,
  ];
  if (r.red_flags?.length) lines.push(`Red flags: ${clean(r.red_flags.join("; "))}`);
  if (r.summary) lines.push(clean(r.summary));
  if (l.utm.source || l.utm.campaign) lines.push(`_Source: ${clean(l.utm.source) || "-"} / ${clean(l.utm.campaign) || "-"}_`);
  if (!l.salesforce.ok) lines.push(`⚠️ *Not in Salesforce:* ${clean(l.salesforce.error ?? "Zapier failed")}. Add it by hand.`);
  return lines.join("\n");
}

export function repeatMessage(l: InboundLead, count: number): string {
  return `↩️ ${clean(`${l.firstName} ${l.lastName}`) || "Someone"} (${clean(l.company) || "unknown company"}) submitted the demo form again: ${ordinal(count)} time this week. → ${l.ae || "no AE"}`;
}

export async function slackPost(token: string, channel: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${token.trim()}` },
      body: JSON.stringify({ channel: channel.trim(), text, unfurl_links: false, unfurl_media: false }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    return json.ok ? { ok: true } : { ok: false, error: json.error ?? `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const dayKey = (d: Date) => `day:${d.toISOString().slice(0, 10)}`;

async function readDay(kv: Kv, key: string): Promise<DayStats> {
  const empty: DayStats = { submissions: 0, spam: 0, zapier_errors: 0, claude_failures: 0, not_fit: [] };
  try {
    return { ...empty, ...JSON.parse((await kv.get(key)) ?? "{}") };
  } catch {
    return empty;
  }
}

// How many times this email submitted in the last 7 days, this one included. 1 without KV.
async function countSubmission(kv: Kv | undefined, email: string): Promise<number> {
  if (!kv || !email) return 1;
  const key = `sub:${email.trim().toLowerCase()}`;
  const n = Number((await kv.get(key)) ?? 0) + 1;
  await kv.put(key, String(n), { expirationTtl: REPEAT_TTL_S });
  return n;
}

// Called once per form submission, after the research and the Zapier send. Never throws.
export async function reportInbound(l: InboundLead, env: InboundEnv, now = new Date()): Promise<{ posted: "lead" | "repeat" | "none"; error?: string }> {
  try {
    if (env.LEADS) {
      const key = dayKey(now);
      const day = await readDay(env.LEADS, key);
      day.submissions++;
      if (l.status === "spam") day.spam++;
      if (!l.salesforce.ok) day.zapier_errors++;
      if (l.fit.icp_fit === "unavailable") day.claude_failures++;
      if (l.research.verdict === "unavailable" && l.status !== "spam") day.claude_failures++;
      if (l.status === "not_fit") day.not_fit = [...day.not_fit, { company: l.company || "?", reason: l.reason.replace(/^claude: /, "") }].slice(-50);
      await env.LEADS.put(key, JSON.stringify(day), { expirationTtl: DAY_TTL_S });
    }
    if (!env.SLACK_BOT_TOKEN || !env.INBOUND_SLACK_CHANNEL) return { posted: "none" };
    if (l.status === "spam" || l.status === "not_fit") return { posted: "none" };
    const count = await countSubmission(env.LEADS, l.email);
    const text = count > 1 ? repeatMessage(l, count) : inboundMessage(l);
    const out = await slackPost(env.SLACK_BOT_TOKEN, env.INBOUND_SLACK_CHANNEL, text);
    if (!out.ok) {
      console.error(JSON.stringify({ inbound: "slack error", error: out.error }));
      return { posted: "none", error: out.error };
    }
    return { posted: count > 1 ? "repeat" : "lead" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ inbound: "failed", error }));
    return { posted: "none", error };
  }
}

// The daily report for the day before `now` (UTC). Health alert first, then the turned-away roll-up.
export function dailyMessages(day: DayStats, date: string): string[] {
  const out: string[] = [];
  const problems: string[] = [];
  if (day.submissions === 0) problems.push("no demo form submissions at all. Check the form on momos.com/get-started and the Worker logs");
  if (day.zapier_errors > 0) problems.push(`${day.zapier_errors} lead${day.zapier_errors > 1 ? "s" : ""} didn't reach Salesforce (Zapier error). Check Zap History`);
  if (day.claude_failures >= 2) problems.push(`Claude failed ${day.claude_failures} times (timeouts or 403). Check the Anthropic console and the Worker logs`);
  if (problems.length) out.push(`🚨 *Lead routing check for ${date}*\n${problems.map((p) => `• ${p}`).join("\n")}`);
  if (day.not_fit.length) {
    const list = day.not_fit.map((n) => `${clean(n.company)} (${clean(n.reason).slice(0, 60)})`).join("; ");
    out.push(`🚫 ${day.not_fit.length} turned away on ${date}: ${list}. Reply here if any of them is a real lead.`);
  }
  return out;
}

export async function dailyReport(now: Date, env: InboundEnv): Promise<{ sent: number }> {
  if (!env.LEADS || !env.SLACK_BOT_TOKEN || !env.INBOUND_SLACK_CHANNEL) return { sent: 0 };
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const day = await readDay(env.LEADS, dayKey(yesterday));
  let sent = 0;
  for (const text of dailyMessages(day, yesterday.toISOString().slice(0, 10))) {
    if ((await slackPost(env.SLACK_BOT_TOKEN, env.INBOUND_SLACK_CHANNEL, text)).ok) sent++;
  }
  console.log(JSON.stringify({ inbound: "daily", date: dayKey(yesterday), ...day, not_fit: day.not_fit.length, sent }));
  return { sent };
}
