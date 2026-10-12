// Momos lead routing Worker.
// 1. Spam check and region in microseconds, then a fast Claude call decides ICP fit (max 3s).
// 2. Answers the Framer form: fit goes to the AE's calendar, a confident not-fit to NOT_FIT_URL.
// 3. Optional: if ZAPIER_HOOK_URL is set, Claude researches the lead after answering and
//    the result goes to Zapier (Salesforce + Slack).
import { instantRoute, type FormData, type Instant, type IpLocation } from "./route.ts";
import { checkFit, NOT_FIT_MIN_CONFIDENCE, type Fit } from "./fit.ts";
import { verifyLead, type Verification } from "./verify.ts";

export interface Env {
  ANTHROPIC_API_KEY: string;
  ZAPIER_HOOK_URL?: string; // optional: no Zapier, no background research
  JAMES_URL: string;
  JILL_URL: string;
  NOT_FIT_URL: string;
  ALLOWED_ORIGINS: string; // comma separated
}

type Ctx = { waitUntil(p: Promise<unknown>): void };

// The visitor waits for the fit check, so it gets 3s. After that they go to their AE anyway.
const FIT_BUDGET_MS = 3_000;
// Cloudflare stops background work 30s after the response, so the research gets 25s.
const CLAUDE_BUDGET_MS = 25_000;
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

// Asks Claude about fit and turns a confident not_fit into a not_fit route.
// Any failure lets the lead through: a real lead is never blocked by a slow or broken check.
async function gate(form: FormData, instant: Instant, env: Env): Promise<{ instant: Instant; fit: FitResult }> {
  if (instant.status !== "routed") return { instant, fit: { icp_fit: "skipped" } };
  try {
    const fit = await withTimeout(checkFit(env.ANTHROPIC_API_KEY, form, FIT_BUDGET_MS), FIT_BUDGET_MS, "fit check took too long");
    if (fit.icp_fit === "not_fit" && fit.confidence >= NOT_FIT_MIN_CONFIDENCE) {
      return { instant: { ...instant, status: "not_fit", reason: `claude: ${fit.reason}`, ae: null }, fit };
    }
    return { instant, fit };
  } catch (err) {
    return { instant, fit: { icp_fit: "unavailable", error: err instanceof Error ? err.message : String(err) } };
  }
}

function urlFor(instant: Instant, env: Env): string {
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

async function verifyAndSend(form: FormData, instant: Instant, url: string, fit: FitResult, env: Env, hook: string) {
  let v: Verification | null = null;
  let error: string | undefined;
  // Obvious spam skips Claude to save time and money. It still goes to Zapier so nothing disappears.
  if (instant.status !== "spam") {
    try {
      v = await withTimeout(verifyLead(env.ANTHROPIC_API_KEY, form, instant, CLAUDE_BUDGET_MS), CLAUDE_BUDGET_MS, "Claude took too long");
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
  const res = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(zapierPayload(form, instant, url, fit, v, error)),
  });
  if (!res.ok) console.error("Zapier returned", res.status);
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const headers = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers });

    let form: FormData;
    try {
      // Read as text so the form can send text/plain and skip the CORS preflight round trip.
      const parsed = JSON.parse(await req.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      form = parsed;
    } catch {
      return Response.json({ url: env.JILL_URL }, { status: 400, headers });
    }

    const cf = (req as Request & { cf?: IpLocation }).cf ?? {};
    const { instant, fit } = await gate(form, instantRoute(form, { country: cf.country, regionCode: cf.regionCode }), env);
    const url = urlFor(instant, env);
    // One line per lead in Cloudflare's Logs tab. No email or name, just enough to audit the gate.
    console.log(JSON.stringify({
      company: form.company, status: instant.status, reason: instant.reason, region: instant.region,
      ae: instant.ae, icp_fit: fit.icp_fit, confidence: "confidence" in fit ? fit.confidence : null,
      fit_reason: "reason" in fit ? fit.reason : null, fit_error: "error" in fit ? fit.error : null,
    }));
    if (env.ZAPIER_HOOK_URL) ctx.waitUntil(verifyAndSend(form, instant, url, fit, env, env.ZAPIER_HOOK_URL));
    return Response.json({ url }, { headers });
  },
};
