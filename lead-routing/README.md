# Momos Lead Routing

```
Framer form ──► Cloudflare Worker
                  ├─ spam check + region (instant)
                  ├─ Claude Haiku: ICP fit? (max 3s, spinner on the form)
                  │
                  ├─ confident fit, Jill  ──► Jill's Google Calendar
                  ├─ confident fit, James ──► James's Google Calendar
                  ├─ 1-5 locations / maybe / no answer ──► thank-you popup, AE follows up
                  └─ not fit / spam       ──► thank-you popup

                  optional, after the redirect:
                  └─ Claude Opus + web search ──► JSON ──► Zapier ──► Salesforce + Slack
```

- `framer/LeadForm.tsx`: the Book a Demo form (Framer code component).
- `worker/`: the Cloudflare Worker.

## Routing

| Form | Region | AE |
|---|---|---|
| US / Canada / Mexico, Pacific or Mountain time zone | West Coast | James |
| US / Canada / Mexico, any other time zone | East Coast | Jill |
| UK, Europe, Turkey, UAE, Saudi, Qatar, Kuwait | Middle East / Europe | Jill |
| Australia, NZ, Southeast Asia, Japan, Korea, HK, India | APAC | James |
| "Other" | guessed from time zone | |

The form has no State field. West vs East comes from the visitor's browser time zone. If that is missing or not a North American one (someone travelling, odd browser settings), the Worker uses the state Cloudflare finds from their IP address.

To change who gets which region, edit `ROUTES` in `worker/src/route.ts`.

## ICP check

Before answering the form, the Worker asks Claude Haiku 5.5 whether the lead is an ICP fit. Claude sees the company name, job title, email domain, country and location count, and judges from what it already knows. There is no web search or website lookup here, so it stays fast (about 1 to 1.5 seconds).

- `fit` with confidence 0.7 or more: the visitor gets their AE's calendar (`status: routed`).
- `not_fit` with confidence 0.8 or more: thank-you popup, no follow-up (`status: not_fit`).
- The order is always **spam → ICP → region**. A confident fit whose region can't be determined is also a follow-up (Jill).
- Anything else (`maybe`, unsure, Claude over 3 seconds or failing), and every 1–5 location lead: thank-you popup, and the region's AE follows up (`status: follow_up`, sent to Zapier with `ae` set).

Obvious spam (filled honeypot, form filled in under 2 seconds, bad or throwaway email) never reaches Claude.

What counts as ICP is the prompt in `worker/src/fit.ts`. The confidence bars are `FIT_MIN_CONFIDENCE` and `NOT_FIT_MIN_CONFIDENCE` in the same file.

Every lead writes one line to the Worker's **Logs** tab: company, region, AE, Claude's verdict and confidence. Check it now and then to see who is being turned away.

## Setup

### 1. Anthropic API key

On console.anthropic.com (with the shared `marketing-team@momos.com` login): add billing, set a monthly spend limit, and create a key under **API Keys**.

### 2. Cloudflare Worker, deployed from GitHub

1. Cloudflare dashboard: **Workers & Pages → Create → Import a repository**.
2. Connect GitHub and pick `dev-momos-marketing/mkt-automation`.
3. Settings:
   - Project name: `momos-lead-routing`
   - Root directory: `lead-routing/worker`
   - Build command: `npm ci`
   - Deploy command: `npx wrangler deploy`
4. Deploy. Every push to the main branch deploys again.
5. Worker → **Settings → Variables and Secrets → Add**: type **Secret**, name `ANTHROPIC_API_KEY`, value the key from step 1.

Booking links, the not-fit page and the allowed websites are in `worker/wrangler.toml`. To change one, edit the file on GitHub and it redeploys.

### 3. Check it

```bash
curl -X POST https://momos-lead-routing.<your-subdomain>.workers.dev \
  -H "Origin: https://www.momos.com" \
  -d '{"firstName":"Test","lastName":"Lead","email":"test@shakeshack.com","company":"Shake Shack","title":"Marketing Director","country":"US","locations":"50-249","timezone":"America/New_York","elapsedMs":8000}'
```

Expect `"url":"https://calendar.app.google/RgDyFpMoE46wfyFv9"` (Jill). Try an agency (`"company":"Bright Digital Agency"`) and expect the thank-you page.

### 4. Framer

1. **Assets → Code → New file** named `LeadForm`, paste in `framer/LeadForm.tsx`.
2. Set `ENDPOINT` at the top to the Worker URL.
3. Put the component on the Book a Demo page in place of the old form.
4. Preview, submit a West Coast, an East Coast and a non-fit lead, check each lands on the right page. Publish.

## Optional: research to Salesforce + Slack

Add a second secret, `ZAPIER_HOOK_URL`. Then, after each redirect, Claude Opus 5.5 checks the lead with up to 3 web searches (is the company real, F&B, real location count, does the person work there, where it is based) and sends this JSON to Zapier:

```json
{
  "lead": { "first_name": "", "last_name": "", "email": "", "company": "", "job_title": "", "country": "", "locations": "" },
  "routing": { "status": "routed | follow_up | not_fit | spam", "reason": "ok", "ae": "James", "region": "us_west", "redirect_url": "", "region_mismatch": false },
  "fit": { "icp_fit": "fit | maybe | not_fit | unavailable | skipped", "confidence": 0.9, "reason": "" },
  "verification": {
    "verdict": "verified | suspicious | spam",
    "icp_fit": "fit | maybe | not_fit",
    "confidence": 0.92,
    "company_name": "", "company_website": "", "industry": "",
    "locations_claimed": "6-49", "locations_found": "18",
    "hq_country": "", "region": "us_west",
    "person_matches_company": true,
    "red_flags": [],
    "summary": "Two lines for the AE.",
    "sources": []
  },
  "utm": { "utm_source": "", "utm_medium": "", "utm_campaign": "", "utm_term": "", "utm_content": "", "utm_channel": "", "gclid_c": "" },
  "meta": { "timezone": "", "page_url": "", "referrer": "", "elapsed_ms": 0, "submitted_at": "" }
}
```

If the research fails or takes over 25 seconds, the lead still goes to Zapier with `"verification": { "verdict": "unavailable" }`. Without `ZAPIER_HOOK_URL`, none of this runs.

Zapier setup:

1. Trigger: **Webhooks by Zapier > Catch Hook** (not Raw). Copy its URL into the `ZAPIER_HOOK_URL` secret.
2. **Salesforce Create Lead**: map `lead__*` and `utm__*` fields. Put `verification__summary` in the description.
3. **Filter**: only continue if `routing__status` is `routed` OR `follow_up`.
4. **Slack** message:

```
{{routing__ae}} · {{routing__region}} · {{verification__verdict}} · ICP {{fit__icp_fit}}
{{lead__first_name}} {{lead__last_name}}, {{lead__job_title}} at {{verification__company_name}}
{{lead__email}} · {{lead__country}} · Locations: said {{lead__locations}}, found {{verification__locations_found}}
{{verification__summary}}
Red flags: {{verification__red_flags}}
```

## Test

```bash
cd worker
npm ci
npm test            # routing, the ICP gate, timeouts, and a full Worker run with Claude and Zapier faked
npm run typecheck
```

## Ownership

Everything runs on shared Momos accounts (`marketing-team@momos.com`): GitHub, Cloudflare, Anthropic. Keep a second admin on each, and keep the logins and two-step backup codes in the company password manager. If James or Jill changes, edit the URL in `worker/wrangler.toml`.
