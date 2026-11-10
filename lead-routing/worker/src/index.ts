// Momos lead routing Worker.
// 1. Spam check and region in microseconds, then a fast Claude call decides ICP fit (max 3s).
// 2. Answers the Framer form: the AE's calendar, unless the lead is spam or a confident not-fit
//    (NOT_FIT_URL).
// 3. Optional: if ZAPIER_HOOK_URL is set, Claude researches the lead after answering and
//    the result goes to Zapier (Salesforce + Slack).
// 4. Beacon posts each demo request to INBOUND_SLACK_CHANNEL itself, after the research, so no
//    lead depends on Zapier's filter to be seen. Daily at 01:00 UTC: a health alert and the
//    turned-away roll-up. See inbound.ts.
// 5. Every 30 minutes (cron in wrangler.toml): new Salesforce leads that reps added by hand go
//    to SLACK_CHANNEL through Beacon. See notify.ts.
import { guessRegion, instantRoute, ROUTES, type FormData, type Instant, type IpLocation } from "./route.ts";
import { checkFit, FIT_MIN_CONFIDENCE, NOT_FIT_MIN_CONFIDENCE, type Fit, type Timings } from "./fit.ts";
import { verifyLead, type ResearchModel, type Verification } from "./verify.ts";
import { notifyLeads, type NotifyEnv } from "./notify.ts";
import { dailyReport, reportInbound, type InboundEnv, type InboundLead } from "./inbound.ts";

// The daily cron in wrangler.toml. Every other cron run is the 30-minute lead notifier.
export const DAILY_CRON = "0 1 * * *";

export interface Env extends NotifyEnv, InboundEnv {
  ANTHROPIC_API_KEY: string;
  ZAPIER_HOOK_URL?: string; // optional: no Zapier, no background research
  JAMES_URL: string;
  JILL_URL: string;
  NOT_FIT_URL: string;
  ALLOWED_ORIGINS: string; // comma separated
  RESEARCH_MODEL?: string; // "haiku" (default) or "opus"
  SUBMIT_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> }; // see wrangler.toml
}

type Ctx = { waitUntil(p: Promise<unknown>): void };

// The visitor waits for the fit check, so it gets 3s. After that they go to their AE anyway.
const FIT_BUDGET_MS = 3_000;
// Cloudflare stops background work 30s after the response, so the research gets 25s.
const CLAUDE_BUDGET_MS = 25_000;
// A retry needs at least this much time left to be worth starting.
const MIN_RETRY_MS = 500;
const RESEARCH_RETRY_MIN_MS = 5_000;
const AE_NAMES = { james: "James", jill: "Jill" } as const;

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  const ok = allowed.includes(origin) || /^https:\/\/[a-z0-9-]+\.framer\.(app|website|ai)$/.test(origin);
  return ok
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" }
    : {};
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export type FitResult = Fit | { icp_fit: "unavailable" | "skipped"; error?: string };

// Every lead books a demo except a confident not_fit, which is turned away. A maybe, an unsure
// answer, no answer in time or a failed check all book the AE's calendar: a missed lead costs
// more than a demo with a weak one. The reason says why, so the AE can see it in Slack.
async function gate(form: FormData, instant: Instant, env: Env, timings: Timings): Promise<{ instant: Instant; fit: FitResult }> {
  if (instant.status !== "routed") return { instant, fit: { icp_fit: "skipped" } };
  // A fast failure (403 Request not allowed, 529 busy) is tried once more inside the same 3 s.
  const deadline = Date.now() + FIT_BUDGET_MS;
  let error = "fit check took too long";
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now();
    if (left < MIN_RETRY_MS) break;
    try {
      const fit = await withTimeout(checkFit(env.ANTHROPIC_API_KEY.trim(), form, left, timings), left, "fit check took too long");
      if (fit.icp_fit === "not_fit" && fit.confidence >= NOT_FIT_MIN_CONFIDENCE) {
        return { instant: { ...instant, status: "not_fit", reason: `claude: ${fit.reason}`, ae: null }, fit };
      }
      if (fit.icp_fit === "fit" && fit.confidence >= FIT_MIN_CONFIDENCE) return { instant, fit };
      return { instant: { ...instant, reason: `claude ${fit.icp_fit} ${fit.confidence}: ${fit.reason}` }, fit };
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.log(JSON.stringify({ fit_attempt: attempt + 1, error }));
    }
  }
  return { instant: { ...instant, reason: "fit check unavailable" }, fit: { icp_fit: "unavailable", error } };
}

// True when this IP has sent more than the limit in wrangler.toml. Fails open if the limiter is missing or errors.
async function rateLimited(req: Request, env: Env): Promise<boolean> {
  const ip = req.headers.get("cf-connecting-ip");
  if (!env.SUBMIT_LIMIT || !ip) return false;
  try {
    return !(await env.SUBMIT_LIMIT.limit({ key: ip })).success;
  } catch {
    return false;
  }
}

function testTimezone(pageUrl: unknown): string | null {
  try {
    const tz = new URL(String(pageUrl)).searchParams.get("tz");
    return tz && /^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(tz) ? tz : null;
  } catch {
    return null;
  }
}

function urlFor(instant: Instant, env: Env): string {
  if (instant.status !== "routed") return env.NOT_FIT_URL;
  if (instant.ae === "james") return env.JAMES_URL;
  if (instant.ae === "jill") return env.JILL_URL;
  return env.NOT_FIT_URL;
}

export function zapierPayload(form: FormData, instant: Instant, url: string, fit: FitResult, v: Verification | null, error?: string) {
  const pick = (k: string) => (typeof form[k] === "string" ? (form[k] as string) : "");
  return {
    lead: {
      first_name: pick("firstName"),
      last_name: pick("lastName"),
      email: pick("email"),
      company: pick("company"),
      job_title: pick("title"),
      country: pick("country"),
      locations: pick("locations"),
    },
    routing: {
      status: instant.status,
      reason: instant.reason,
      ae: instant.ae ? AE_NAMES[instant.ae] : "",
      region: instant.region,
      // True when the region was a best guess (IP location or the company's HQ), not the visitor's own clues.
      region_guessed: instant.status !== "spam" && !instant.regionSure,
      redirect_url: url,
      // Claude may place the company somewhere else than the form did. Worth a look in Slack.
      region_mismatch: !!v && v.region !== "unknown" && v.region !== instant.region,
    },
    fit,
    verification: v ?? { verdict: "unavailable", error: error ?? "" },
    utm: {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_term: pick("utm_term"),
      utm_content: pick("utm_content"),
      utm_channel: pick("utm_channel"),
      gclid_c: pick("gclid"),
    },
    meta: {
      timezone: pick("timezone"),
      page_url: pick("pageUrl"),
      referrer: pick("referrer"),
      elapsed_ms: form.elapsedMs ?? null,
      submitted_at: new Date().toISOString(),
    },
  };
}

function researchModel(env: Env): ResearchModel {
  return env.RESEARCH_MODEL?.trim().toLowerCase() === "opus" ? "opus" : "haiku";
}

// After the visitor has their answer: research the lead (one retry), send it to Zapier for
// Salesforce, then post it to Slack. Each step runs even if the one before failed.
async function afterAnswer(form: FormData, instant: Instant, url: string, fit: FitResult, env: Env) {
  let v: Verification | null = null;
  let error: string | undefined;
  // Obvious spam skips Claude to save time and money. It still goes to Zapier so nothing disappears.
  if (instant.status !== "spam") {
    const deadline = Date.now() + CLAUDE_BUDGET_MS;
    for (let attempt = 0; attempt < 2 && !v; attempt++) {
      const left = deadline - Date.now();
      if (attempt > 0 && left < RESEARCH_RETRY_MIN_MS) break;
      try {
        v = await withTimeout(verifyLead(env.ANTHROPIC_API_KEY.trim(), form, instant, left, researchModel(env)), left, "Claude took too long");
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }
  }
  const payload = zapierPayload(form, instant, url, fit, v, error);
  let salesforce: { ok: boolean; error?: string } = { ok: true };
  if (env.ZAPIER_HOOK_URL) {
    try {
      const res = await fetch(env.ZAPIER_HOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) salesforce = { ok: false, error: `Zapier returned ${res.status}` };
    } catch (err) {
      salesforce = { ok: false, error: `Zapier unreachable: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (!salesforce.ok) console.error(JSON.stringify({ zapier: "failed", error: salesforce.error }));
  } else {
    salesforce = { ok: false, error: "no ZAPIER_HOOK_URL set" };
  }
  const lead: InboundLead = {
    firstName: payload.lead.first_name,
    lastName: payload.lead.last_name,
    email: payload.lead.email,
    company: payload.lead.company,
    title: payload.lead.job_title,
    country: payload.lead.country,
    locations: payload.lead.locations,
    status: instant.status,
    reason: instant.reason,
    ae: payload.routing.ae,
    region: instant.region,
    fit: { icp_fit: fit.icp_fit, confidence: "confidence" in fit ? fit.confidence : undefined },
    research: v ? { ...v } : { verdict: "unavailable", error: error ?? (instant.status === "spam" ? "skipped for spam" : "") },
    utm: { source: payload.utm.utm_source, campaign: payload.utm.utm_campaign },
    salesforce,
  };
  await reportInbound(lead, env);
}

export default {
  async scheduled(event: { scheduledTime: number; cron?: string }, env: Env, ctx: Ctx): Promise<void> {
    const when = new Date(event.scheduledTime);
    const job = event.cron === DAILY_CRON ? dailyReport(when, env) : notifyLeads(when, env);
    ctx.waitUntil(job.catch((err) => console.error(event.cron === DAILY_CRON ? "daily report failed" : "notifier failed", err instanceof Error ? err.message : err)));
  },

  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const headers = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers });

    if (await rateLimited(req, env)) {
      console.log(JSON.stringify({ status: "spam", reason: "rate limited" }));
      return Response.json({ url: env.NOT_FIT_URL, status: "spam", ae: null, region: null }, { headers });
    }

    let form: FormData;
    try {
      // Read as text so the form can send text/plain and skip the CORS preflight round trip.
      const parsed = JSON.parse(await req.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      form = parsed;
    } catch {
      return Response.json({ url: env.JILL_URL }, { status: 400, headers });
    }

    // Testing: ?tz=America/Los_Angeles on the form's page acts as that time zone. Read from the
    // page URL the form sends, so it works without changing the Framer code.
    const testTz = testTimezone(form.pageUrl);
    if (testTz) form = { ...form, timezone: testTz };

    const cf = (req as Request & { cf?: IpLocation }).cf ?? {};
    const started = Date.now();
    const timings: Timings = { claude_ms: 0 };
    // 1. Spam (instantRoute). 2. Claude's ICP check (gate): only a confident not-fit is turned away.
    // 3. Region: if the visitor's clues weren't enough, guess it so every booking has an AE.
    const ip: IpLocation = { country: cf.country, regionCode: cf.regionCode };
    const gated = await gate(form, instantRoute(form, ip), env, timings);
    const fit = gated.fit;
    let instant: Instant = gated.instant;
    if (instant.status !== "spam" && !instant.regionSure) {
      const region = guessRegion(String(form.country ?? ""), ip, "hq_region" in fit ? fit.hq_region : "unknown");
      instant = { ...instant, region, ae: instant.ae ? ROUTES[region] : null };
    }
    const url = urlFor(instant, env);
    // One line per lead in Cloudflare's Logs tab. No email or name, just enough to audit the gate.
    console.log(JSON.stringify({
      company: form.company, status: instant.status, reason: instant.reason, region: instant.region,
      // Why this region: what the form said and where Cloudflare thinks the visitor is.
      form_country: form.country, timezone: form.timezone, ip_country: cf.country ?? null, ip_region: cf.regionCode ?? null,
      region_guessed: !instant.regionSure,
      ae: instant.ae, icp_fit: fit.icp_fit, confidence: "confidence" in fit ? fit.confidence : null,
      fit_reason: "reason" in fit ? fit.reason : null, fit_error: "error" in fit ? fit.error : null,
      total_ms: Date.now() - started, ...timings,
    }));
    if (env.ZAPIER_HOOK_URL || env.INBOUND_SLACK_CHANNEL || env.LEADS) ctx.waitUntil(afterAnswer(form, instant, url, fit, env));
    // ae and region are only for checking tests in the browser console. The form only uses url.
    return Response.json({ url, status: instant.status, ae: instant.status === "routed" ? instant.ae : null, region: instant.region }, { headers });
  },
};
