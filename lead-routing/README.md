# Momos Lead Routing

```
Framer form ──► Cloudflare Worker
                  ├─ spam check + region (instant)
                  ├─ Claude Haiku: ICP fit? (max 3s, spinner on the form)
                  │
                  ├─ fit / maybe / no answer, Jill  ──► Jill's Google Calendar
                  ├─ fit / maybe / no answer, James ──► James's Google Calendar
                  └─ confident not fit / spam       ──► thank-you popup

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

- Every lead gets their AE's calendar (`status: routed`), whatever the location count, unless it is spam or Claude answers `not_fit` with confidence 0.8 or more. Those get the thank-you popup (`status: not_fit` or `spam`).
- The order is always **spam → ICP → region**. Every booking has an AE: if the country, time zone and IP don't settle the region, it's guessed from the IP country, then Claude's guess of the company's HQ, then East (Jill).
- A `maybe`, a low-confidence answer, or Claude over 3 seconds or failing still books the calendar. `routing.reason` says why (for example `claude maybe 0.6: size unclear` or `fit check unavailable`), so the AE can see it in Slack.

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
3. **Filter**: only continue if `routing__status` is `routed` OR `follow_up`. Leads Claude was unsure about are `routed`, so they always post. Only spam and confident not-fits stop.
4. **Slack** message to #inbound-form-get-started (kept; Beacon's inbound alerts post to their own channel, see below):

```
{{routing__ae}} · {{routing__region}} · {{verification__verdict}} · ICP {{fit__icp_fit}} · {{routing__reason}}
{{lead__first_name}} {{lead__last_name}}, {{lead__job_title}} at {{verification__company_name}}
{{lead__email}} · {{lead__country}} · Locations: said {{lead__locations}}, found {{verification__locations_found}}
{{verification__summary}}
Red flags: {{verification__red_flags}}
```

## Claude through Cloudflare AI Gateway

Set the Worker secret `AI_GATEWAY_URL` and every Claude call (fit check and research) goes through Cloudflare AI Gateway. The gateway reaches Anthropic from a fixed place, so the Worker's location no longer matters: this stops the `403 Request not allowed` errors that came from Cloudflare running the Worker in regions Anthropic doesn't serve. The gateway's dashboard also logs every call.

1. Cloudflare dashboard → **AI** → **AI Gateway** → **Create authentication token** (AI Gateway permission). The `default` gateway is created on the first call that carries this token.
2. Worker → **Settings → Variables and Secrets**, add two **Secrets**:
   - `AI_GATEWAY_URL`: `https://gateway.ai.cloudflare.com/v1/<account id>/default/anthropic` (the account ID is in the dashboard address bar).
   - `AI_GATEWAY_TOKEN`: the token from step 1.

No `AI_GATEWAY_URL`: calls go straight to `api.anthropic.com`, as before. Code: `worker/src/claude.ts`.

## Inbound alerts: every demo request in Slack, from the Worker

After the research, Beacon posts each demo request to the channel in the `INBOUND_SLACK_CHANNEL` Worker secret itself, so no lead depends on Zapier's filter to be seen. Zapier only creates the Salesforce lead. Code: `worker/src/inbound.ts`.

```
🟡 *New demo request → @Jill* (unsure, booked anyway) · us_east
*Sam Rivera* · Owner
*Taco Place* · website · Fast casual
sam@tacoplace.com · US · HQ US
Locations: said *1-5* · found *About 70* 🔺
Booking check: claude maybe 0.6: size unclear
Research: ⚠️ suspicious (0.7) · ICP maybe · works there: yes
Franchise owner of Taco Place units.
_Source: google / brand_
```

- 🟢 Claude was sure; 🟡 it wasn't, and the lead booked anyway. Spam and confident not-fits aren't posted.
- 🔺 the web found at least twice the form's answer (and 10 or more), e.g. "said 1-5, found 70".
- ⚠️ *Not in Salesforce*: Zapier failed. Add the lead by hand.
- ↩️ the same email submitted again within 7 days: one short line in place of a new post.
- The AE is tagged when `AE_SLACK` is set in `worker/wrangler.toml` (`James=<Slack member ID or email>,Jill=...`). Empty: the name is shown.
- The fit check retries once inside its 3 seconds. If the research still fails, the post goes out at once with "⏳ research pending". A 5-minute cron retries it for about 2 hours (2, 5, 10, 20, 30, 45, 60, 90 and 120 minutes after the first try) and updates the same post when it works, or says it gave up.
- Every day at 01:00 UTC, Beacon sends a 🚨 check as a DM to each person in `DAILY_REPORT_TO` (`worker/wrangler.toml`, Slack member IDs or emails; empty sends it to the inbound channel) if the day before had no submissions, any Zapier error, or 2 or more Claude failures, and a 🚫 line listing the leads that were turned away. Nothing is posted on a good day with no turn-aways.

Setup: add the Worker secret `INBOUND_SLACK_CHANNEL` (the channel's ID, `C...`; in Slack: channel name → About → Channel ID) and invite Beacon to that channel (`/invite @Beacon`). The `LEADS` KV store (repeats and daily counts) is created by Cloudflare on the first deploy. The Zap's own Slack step can stay: it keeps posting to its channel (#inbound-form-get-started), and Beacon posts to this one.

## Ask Beacon: answers when tagged in Slack

Tag `@Beacon` with a question and it answers in the thread: "who is Burger Co?", "how many leads came in this week, by source?", "how many demo requests yesterday, and who was turned away?". It posts "⏳ Looking into it…" and edits in the answer, usually within 10 to 20 seconds. Code: `worker/src/ask.ts`.

Claude (Haiku by default; set `BEACON_MODEL` to change it) can only read. Its tools:
- `find_leads`: Salesforce leads by company, name or email, with status, source, owner and a link
- `lead_stats`: lead counts for the last N days by source, status, owner, creator or country
- `demo_requests`: demo form submissions, spam and turned-away leads per day (the `LEADS` store)
- `web_search`: the open web, up to 3 searches per question

In a thread, Beacon reads the thread first (with the `channels:history` scope) so follow-up questions work.

Setup, in the Slack app (api.slack.com/apps → Beacon):
1. **Basic Information** → copy the **Signing Secret** into the Worker secret `SLACK_SIGNING_SECRET`.
2. **OAuth & Permissions** → bot scopes `app_mentions:read` and `channels:history` (plus `groups:history` for private channels). Reinstall the app.
3. **Event Subscriptions** → on. Request URL: `https://momos-lead-routing.marketing-team-a27.workers.dev/slack/events` (Slack checks it right away; the Worker must already have the secret). Under **Subscribe to bot events**, add `app_mention`. Save.
4. To ask Beacon in its own DM too: add the bot scope `im:history` and the bot event `message.im`, and turn on **App Home → Messages Tab → Allow users to send messages**. Reinstall.

Beacon only hears mentions in channels it's a member of. In a private channel, invite it first. Every Slack event writes a `"slack"` line to the Worker's logs, and a failed post writes `"slack post failed"` with Slack's reason.

## Lead notifier: leads reps add, in one Slack channel

Every 30 minutes the Worker checks Salesforce for leads created 35 to 5 minutes earlier, and Beacon posts the ones reps added by hand to the channel in the `SLACK_CHANNEL` Worker secret (a channel ID).

```
🟢 *Burger Co* · Ana Lopez, VP Marketing
Conference (Attendee) · 24 locations · added by James Burdick · owner @Jill
Open in Salesforce
```

- Leads made by a user in `SKIP_CREATORS` (Momos Marketing, the demo form's automation) are not posted: Inbound leads already reach Slack through Zapier.
- When one person creates more than `BULK_LIMIT` (10) leads in a run, it's an import: Beacon posts one "imported N leads" line. In the last 90 days, 31,491 of 31,779 new leads were imports.
- Status Disqualified, Junk, Spam, Unqualified or Duplicate: not posted.
- There is no score check. Conversion.ai's `Lead_Score_Total__c` is mostly email opens and clicks, and it didn't predict which leads converted.
- The owner is mentioned when Beacon can find their Slack account by email; otherwise their name is shown.

The code is `worker/src/notify.ts`. The settings are in `worker/wrangler.toml` under `[vars]`. Edit them there, not in the Cloudflare dashboard: each deploy resets dashboard values to the file.

Setup:

1. Salesforce admin: an External Client App with the client-credentials flow, run as a read-only integration user that can read Leads.
2. Run the **Salesforce fields** GitHub Action (repository secrets `SF_CLIENT_ID` and `SF_CLIENT_SECRET`; the domain is already in the workflow). It lists the Lead fields, the Lead Source values as stored, and who creates leads. Keep `SKIP_CREATORS` in step with it.
3. Slack: give Beacon the `chat:write` and `users:read.email` scopes, and invite it to the channel (`/invite @Beacon`).
4. Cloudflare Worker secrets: `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SLACK_BOT_TOKEN`. `SF_DOMAIN` is already in `wrangler.toml`.
5. The notifier stays off until all of these are set. Check the Worker's **Logs** for `"notifier"` lines: each run logs how many leads it saw, posted and skipped, and why.
6. Keep the Slack step in the Zapier Zap: it is how demo-form leads reach Slack.

## Test

```bash
cd worker
npm ci
npm test            # routing, the ICP gate, timeouts, and a full Worker run with Claude and Zapier faked
npm run typecheck
```

## Ownership

Everything runs on shared Momos accounts (`marketing-team@momos.com`): GitHub, Cloudflare, Anthropic. Keep a second admin on each, and keep the logins and two-step backup codes in the company password manager. If James or Jill changes, edit the URL in `worker/wrangler.toml`.
