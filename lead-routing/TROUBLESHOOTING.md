# Book a Demo Form: What To Do If Something Breaks

A plain-English guide for anyone on the team. No coding needed, unless a step says to ask Vincent.

Owner: Vincent (Marketing) · Every account below logs in with **marketing-team@momos.com** · Last updated: October 2026

---

## 1. How it works, in 30 seconds

1. A visitor fills in the **Book a Demo** form on momos.com.
2. The form sends it to our **routing service** on Cloudflare. In about 2 seconds, Claude (AI) checks whether it's a real restaurant brand.
3. The visitor is then sent to the right person:
   - **Jill** (East US, Europe, Middle East, Africa): momos.com/book-a-demo-us
   - **James** (West US, Asia-Pacific): James's Google Calendar
   - **Not a fit, or junk**: a "Thanks for reaching out!" popup. They stay on the page.
4. About 30 seconds later, Claude looks the company up online. A summary lands in **Slack** and a lead is created in **Salesforce** (through **Zapier**). This lead is also stored in Conversion.ai.

**It's built to fail safe.** If the AI or the routing service breaks, visitors still land on Jill's booking page. Real prospects can still book. What you lose is the routing to James and the Slack/Salesforce summary.

---

## 2. The 2-minute health check

Do this whenever something feels off, and after any change. Use a normal browser window on momos.com.

| Test | Fill in | What should happen |
|---|---|---|
| **A. Good lead** | Test James · test@gyg.com.au · Guzman y Gomez · Head of Digital · Australia · 250+ | You land on **James's Google Calendar**. A Slack message appears within about 1 minute. |
| **B. Junk lead** | John Doe · johndoe@mailinator.com · asdf · asdf · United States · 1-5 | The **thank-you popup** appears and you stay on the page. No Slack message (that's correct). |

- **Both work:** everything is fine. Delete the test lead in Salesforce.
- **Test A lands on Jill's page instead:** go to problem 1 below.
- **Test A works but no Slack message:** go to problem 3.

---

## 3. Problems and what to do

### Problem 1: Everyone goes to Jill's page (even Australia, West Coast and junk leads)
**What it means:** the form can't reach the routing service, so it uses the safe fallback.

1. Log in to **dash.cloudflare.com** → **Workers & Pages** → **momos-lead-routing**.
2. Open the **Deployments** tab. If a deployment happened around when it broke, someone changed something. Click **⋯** next to the previous deployment → **Rollback**. Then redo the health check.
3. Check **cloudflarestatus.com** for an outage.
4. Still broken? Message Vincent with the time it started. Visitors are still reaching Jill in the meantime.

### Problem 2: The form is missing, blank, or looks broken on the website
**What it means:** the form's code in Framer got damaged, usually by a cut-off paste.

1. Open Framer, project **Momos Website 2025** → **Assets** → **Code** → **LeadForm**.
2. Scroll to the very bottom. The last line should be just `}`. If the code stops mid-line, the paste was cut off.
3. Fix it one of two ways:
   - **Easiest:** use Framer's version history to restore the last working version, then **Publish**.
   - **Or:** open GitHub → `dev-momos-marketing/mkt-automation` → `lead-routing/framer/LeadForm.tsx` → copy all → paste it back into Framer in parts (Framer cuts off long pastes) → **Publish**.
4. **Emergency:** put a simple "Book a demo" button that links to **/book-a-demo-us** on the page and publish. That keeps leads coming while it's fixed.

### Problem 3: People reach the calendars, but no Slack messages or Salesforce leads
**What it means:** the Zapier part has stopped.

1. Log in to **zapier.com** → **Zaps** → **"Get-started Form Automation | 2027"**.
2. Is it switched **On**? If not, turn it on.
3. Click **Zap History**:
   - **Runs with errors** (red): click one. It usually says Slack or Salesforce needs reconnecting. Go to **Apps**, reconnect that app, then **Replay** the failed runs.
   - **No runs at all since it broke:** the routing service isn't sending to Zapier. Message Vincent (he'll check the `ZAPIER_HOOK_URL` setting in Cloudflare).
4. **"Stopped by filter" runs are normal.** Those are not-fit and junk leads, which we don't send to Salesforce.

### Problem 4: Slack messages say ❔ "unavailable" on most leads
**What it means:** the AI research isn't working. Usually that's the money running out.

1. Log in to **console.anthropic.com** → **Billing**. Check there's credit left and the **monthly spend limit** hasn't been reached. Add credit or raise the limit. About $25 a month is plenty for us.
2. Check **status.anthropic.com** for an outage.
3. Leads still reach the calendars while this is broken. Only the summary is missing.
4. One ❔ now and then is normal: the lookup took too long.

### Problem 5: A real restaurant brand got the "thanks" popup instead of a calendar
**What it means:** the AI wrongly thought they weren't a fit. It's rare, because we only turn people away when the AI is very sure.

1. Find their details: **Zapier** → **Zap History** → the run around that time marked **"Stopped by filter"**. Click it to see their name, email and company.
2. Reach out to them by hand. The popup also gave them **sales@momos.com**, so check that inbox too.
3. Tell Vincent the company name so the AI's rules can be tuned.

### Problem 6: A lead went to the "wrong" salesperson
1. Check against the rules:
   - **US, Canada and Mexico** depend on the visitor's computer time zone: Pacific and Mountain go to James, everything else to Jill.
   - **Europe, Middle East and Africa** go to Jill. **Asia-Pacific** goes to James.
   - **Latin America** goes by time zone.
   - Someone travelling or on a VPN can land differently. That's expected.
2. Just forward the lead to the right person.
3. If it keeps happening for one country, tell Vincent.

### Problem 6b: Testing from outside the US and every US lead goes to Jill
**This is expected.** For US, Canada and Mexico, the form decides East vs West from the **computer's time zone**. A VPN doesn't change that. From Vietnam, your time zone is Asia, so the system can't tell the coast and defaults to Jill.

To test like a real West Coast visitor, add **`?tz=America/Los_Angeles`** to the end of the page address, e.g. `momos.com/get-started-new?tz=America/Los_Angeles`.

| Add to the address | Pick country | Should go to |
|---|---|---|
| `?tz=America/Los_Angeles` | United States | **James** |
| `?tz=America/New_York` | United States | **Jill** |
| (nothing) | Australia | **James** |
| (nothing) | United Kingdom | **Jill** |

**To see why a lead went where it did:** Cloudflare → Workers & Pages → **momos-lead-routing** → **Observability** → **Logs**. Each lead has one line:
- `ae`: who it went to
- `region`: the region it was given
- `form_country`: the country they picked
- `timezone`: their computer's time zone
- `ip_country` / `ip_region`: where their internet connection is

Send a screenshot of that line to Vincent.

### Problem 7: James's or Jill's booking link changed
You can update it yourself in GitHub (takes 2 minutes).

1. Go to **github.com/dev-momos-marketing/mkt-automation** → `lead-routing` → `worker` → `wrangler.toml`.
2. Click the **pencil** icon (Edit).
3. Change the link next to `JAMES_URL =` or `JILL_URL =`. Keep the quote marks.
4. Click **Commit changes** → commit to **main**.
5. Wait about 2 minutes (it goes live by itself), then run the health check.

### Problem 8: The Anthropic bill suddenly jumps
1. **console.anthropic.com** → **Cost**. Normal is a few dollars a month.
2. The spend limit stops it going above the cap, so there's no runaway risk.
3. Usually it's a burst of form spam. Tell Vincent.

---

## 4. Where everything lives

| What | Where | What it's for |
|---|---|---|
| The form | **Framer** → Momos Website 2025 → Assets → Code → LeadForm | What visitors see |
| Routing service | **dash.cloudflare.com** → Workers & Pages → momos-lead-routing | Decides where leads go. **Observability → Logs** shows one line per lead. |
| AI (Claude) | **console.anthropic.com** | Billing, spend limit, costs |
| Zapier | **zapier.com** → "Get-started Form Automation \| 2027" | Sends leads to Salesforce and Slack |
| Code and full docs | **github.com/dev-momos-marketing/mkt-automation** → `lead-routing` | The technical documentation (`DOCUMENTATION.md`) is here too |

Logins and two-step backup codes: in the company password manager, under **marketing-team@momos.com**.

---

## 5. Please don't

- **Don't** share, paste or screenshot the Claude API key, or the Zapier hook link. They're stored as hidden "Secrets" in Cloudflare, and that's the only place they should live.
- **Don't** delete or rename the Worker `momos-lead-routing`, or the Zapier Zap.
- **Don't** edit code files other than the links in Problem 7. Ask Vincent.

---

## 6. When to call Vincent

Call when the health check fails and the steps above didn't fix it within about 15 minutes. Send him:
- **When** it started
- **What you saw**: which page you landed on, and any message on screen
- **What you already tried**
