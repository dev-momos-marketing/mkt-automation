# Beacon

Posts every new, legit Salesforce Lead to Slack (#partner-deals), as the Beacon app.

```
Book-a-demo form ──► Worker ──► Zapier ──┐
Conference leads (typed in) ─────────────┼──► Salesforce Lead
Event leads (typed in) ──────────────────┘          │
                                     every minute, Beacon reads the new ones
                                                    │
                          spam / test / internal / Unqualified? ──► skipped (logged)
                                                    │
                                                    ▼
                                   card in #partner-deals, about 1-2 minutes later
```

It doesn't matter how a lead gets into Salesforce. A lead typed in by hand, a Book-a-demo lead from Zapier and an import are all treated the same way.

## What counts as legit

A new Lead is posted unless one of these is true (`src/legit.ts`):

| Skipped when | Example |
|---|---|
| Status is in `SKIP_STATUSES` | Unqualified, Junk |
| No email and no phone number | |
| Email is invalid or a throwaway | `x@mailinator.com` |
| Email is one of ours (`INTERNAL_DOMAINS`) | `noah@momos.com` |
| No company | `[not provided]` |
| Name or company is a test word | "Test", "asdf", "dummy" |

Book-a-demo leads have already passed the spam and ICP checks in `lead-routing/`. Zapier only creates leads with the `routed` or `follow_up` status.

Every new lead writes one line to the Worker's **Logs** tab: lead ID, company, source, posted or not, and why. Check there if a lead didn't show up.

If more than `BATCH_SIZE` (5) legit leads arrive in the same minute, which usually means someone imported a list, Beacon posts one summary message instead of a card for each lead.

To show the source on each card, fill in **Lead Source** for leads you type in, e.g. `Conference` or `Event`.

## Setup

### 1. Slack: Beacon's token

1. api.slack.com/apps → **Beacon** → **OAuth & Permissions** → Bot Token Scopes: add `chat:write`. Reinstall the app if Slack asks.
2. Copy the **Bot User OAuth Token** (`xoxb-...`).
3. In #partner-deals, type `/invite @Beacon`.
4. Copy the channel ID: right-click the channel → **View channel details** → bottom of the panel. Put it in `SLACK_CHANNEL_ID` in `wrangler.toml`.

Beacon doesn't need Socket Mode or `slack run` for this. It runs on Cloudflare.

### 2. Salesforce: an app Beacon can sign in with

A Salesforce admin does this once.

1. Setup → **External Client App Manager** → **New External Client App**. On older orgs, use **App Manager → New Connected App**.
2. Name it `Beacon`. Turn on **OAuth**. For the callback URL, enter `https://login.salesforce.com` (it's never used). For the scopes, choose **Manage user data via APIs (api)**.
3. Turn on **Enable Client Credentials Flow**.
4. Under the app's **Policies**, set **Run As** to a user who can read all Leads. A dedicated integration user is best.
5. Copy the **Consumer Key** and **Consumer Secret**.
6. Setup → **My Domain**: check that `SF_DOMAIN` in `wrangler.toml` matches, e.g. `https://momos.my.salesforce.com`.

### 3. Cloudflare Worker, deployed from GitHub

1. **Workers & Pages → Create → Import a repository** → `dev-momos-marketing/mkt-automation`.
2. Use these settings:
   - Project name: `momos-beacon`
   - Root directory: `beacon`
   - Build command: `npm install` (no lockfile yet. Once one is committed, switch to `npm ci`)
   - Deploy command: `npx wrangler deploy`
3. Worker → **Settings → Variables and Secrets**. Add three secrets: `SF_CLIENT_ID`, `SF_CLIENT_SECRET` and `SLACK_BOT_TOKEN`.

The schedule (every minute) is in `wrangler.toml` and starts with the first deploy.

### 4. Check it

Create a Lead in Salesforce. Give it a real-looking name, an email and a company, and set Lead Source to `Conference`. Within about 2 minutes, a card should appear in #partner-deals. If it doesn't, open the Worker's **Logs** tab:

- `Salesforce login 400`: the key or secret is wrong, or Client Credentials Flow or Run As isn't set.
- `Slack: not_in_channel`: run `/invite @Beacon` in the channel.
- `Slack: channel_not_found`: `SLACK_CHANNEL_ID` is wrong.
- `posted: false`: the reason says which rule skipped the lead.

## Good to know

- **Delay:** a lead appears 1 to 2 minutes after it's saved. Each run reads one past minute, which gives slow Salesforce saves time to finish.
- **Failed runs:** each run reads only its own minute, so nothing is stored between runs. If Salesforce or Slack is down during a run, the leads from that minute aren't posted. The error is in the Logs tab.
- **Double posts:** if the Zapier flow in `lead-routing/` also has a Slack step for #partner-deals, Book-a-demo leads show up twice. Turn that Slack step off, or point it at another channel.

## Test

```bash
npm install
npm test            # legit rules, minute windows, and a full run with Salesforce and Slack faked
npm run typecheck
```
