// Read-only: lists the Salesforce Lead and Opportunity fields the lead notifier could use
// (source / channel / score / status / owner), their picklist values, and lead counts by
// source for the last 90 days. Prints field metadata and counts only, never names or emails.
// Run from the "Salesforce fields" GitHub Action. Needs SF_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET.
const { SF_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET } = process.env;
const API = "v62.0";

if (!SF_DOMAIN || !SF_CLIENT_ID || !SF_CLIENT_SECRET) {
  console.error("Missing SF_DOMAIN, SF_CLIENT_ID or SF_CLIENT_SECRET.");
  process.exit(1);
}

const base = SF_DOMAIN.replace(/\/+$/, "").replace(/^https?:\/\//, "").replace(/^/, "https://");

async function login() {
  const res = await fetch(`${base}/services/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: SF_CLIENT_ID, client_secret: SF_CLIENT_SECRET }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Salesforce login failed (${res.status}): ${json.error_description ?? json.error ?? "unknown"}`);
  return json;
}

const { access_token, instance_url } = await login();
const get = async (path) => {
  const res = await fetch(`${instance_url}/services/data/${API}${path}`, { headers: { authorization: `Bearer ${access_token}` } });
  if (!res.ok) throw new Error(`${path} returned ${res.status}: ${await res.text()}`);
  return res.json();
};

// Fields worth knowing about for "is this lead hot, where did it come from, who owns it".
const INTERESTING = /source|channel|score|grade|conversion|rating|status|owner|location|segment|region|utm|icp|fit|quality|mql|sql|campaign/i;

const out = [];
for (const object of ["Lead", "Opportunity"]) {
  let d;
  try {
    d = await get(`/sobjects/${object}/describe`);
  } catch (e) {
    // Usually the integration user's profile can't read this object. Report it and carry on.
    out.push(`## ${object}`, "", `Could not read ${object}: ${String(e.message).slice(0, 200)}`, "");
    continue;
  }
  out.push(`## ${object}`, "", "| API name | Label | Type | Values |", "|---|---|---|---|");
  for (const f of d.fields) {
    if (!INTERESTING.test(f.name) && !INTERESTING.test(f.label)) continue;
    const values = (f.picklistValues ?? []).filter((p) => p.active).map((p) => p.value).join(", ");
    out.push(`| \`${f.name}\` | ${f.label} | ${f.type} | ${values.slice(0, 400)} |`);
  }
  out.push("");
}

const counts = async (field) => {
  try {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT ${field} v, COUNT(Id) n FROM Lead WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY ${field} ORDER BY COUNT(Id) DESC`)}`);
    return r.records.map((x) => `| ${x.v ?? "(blank)"} | ${x.n} |`);
  } catch (e) {
    return [`| could not group by ${field}: ${String(e.message).slice(0, 120)} | |`];
  }
};
out.push("## Leads created in the last 90 days, by LeadSource", "", "| LeadSource | Leads |", "|---|---|", ...(await counts("LeadSource")), "");
out.push("## Leads created in the last 90 days, by Status", "", "| Status | Leads |", "|---|---|", ...(await counts("Status")), "");

// Score spread for leads from real sources, to pick the 🔥 bar. Counts and averages only.
const stats = async (where, label) => {
  try {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT COUNT(Id) n, MIN(Lead_Score_Total__c) lo, AVG(Lead_Score_Total__c) avg, MAX(Lead_Score_Total__c) hi FROM Lead WHERE CreatedDate = LAST_N_DAYS:90 AND ${where}`)}`);
    const x = r.records[0] ?? {};
    return `| ${label} | ${x.n} | ${x.lo ?? ""} | ${x.avg != null ? Math.round(x.avg) : ""} | ${x.hi ?? ""} |`;
  } catch (e) {
    return `| ${label} | could not query: ${String(e.message).slice(0, 120)} | | | |`;
  }
};
// All time, not just 90 days: how many leads the hot check could ever pick up.
const allTime = async (where) => {
  try {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT COUNT(Id) n FROM Lead WHERE IsConverted = false AND ${where}`)}`);
    return r.records[0]?.n ?? 0;
  } catch (e) {
    return `error: ${String(e.message).slice(0, 120)}`;
  }
};
out.push("## Open leads, all time", "", "| Leads | Count |", "|---|---|",
  `| MQL Contact Hot ticked | ${await allTime("MQL_Contact_Hot_c__c = true")} |`,
  `| ticked, score under 50 | ${await allTime("MQL_Contact_Hot_c__c = true AND (Lead_Score_Total__c < 50 OR Lead_Score_Total__c = null)")} |`,
  `| score 50+ | ${await allTime("Lead_Score_Total__c >= 50")} |`,
  `| hot and changed in the last 24h | ${await allTime("(Lead_Score_Total__c >= 50 OR MQL_Contact_Hot_c__c = true) AND LastModifiedDate = LAST_N_DAYS:1")} |`,
  "");

out.push("## Lead_Score_Total__c, leads created in the last 90 days", "", "| Leads | Count | Min | Avg | Max |", "|---|---|---|---|---|",
  await stats("LeadSource != null", "with a Lead Source"),
  await stats("LeadSource = 'Inbound'", "Inbound"),
  await stats("Lead_Score_Total__c >= 50", "score 50+"),
  await stats("Lead_Score_Total__c >= 100", "score 100+"),
  await stats("MQL_Contact_Hot_c__c = true", "MQL Contact Hot ticked"),
  await stats("MQL_Contact_Hot_c__c = true AND (Lead_Score_Total__c < 50 OR Lead_Score_Total__c = null)", "ticked but score under 50"),
  await stats("Status = 'MQLs (ICP-Verified)'", "Status MQLs (ICP-Verified)"),
  "");

// How the score is built: each part's spread, the tiers, and the numbers behind the top leads.
// Numbers and tiers only, no names or emails.
const PARTS = ["Lead_Score_Total__c", "Lead_Score_Profile_Fit__c", "Lead_Score_Form_Submission__c", "Lead_Score_Email_Open_Engagement__c",
  "Lead_Score_Email_Click_Engagement__c", "Lead_Score_Website_Engagement__c", "Lead_Score_Event_Engagement__c", "Lead_Score_Offline_Engagement__c"];
try {
  out.push("## Score parts, open leads with a score", "", "| Part | Leads > 0 | Min | Avg | Max |", "|---|---|---|---|---|");
  for (const f of PARTS) {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT COUNT(Id) n, MIN(${f}) lo, AVG(${f}) avg, MAX(${f}) hi FROM Lead WHERE IsConverted = false AND ${f} > 0`)}`);
    const x = r.records[0] ?? {};
    out.push(`| ${f.replace("Lead_Score_", "").replace("__c", "")} | ${x.n} | ${x.lo ?? ""} | ${x.avg != null ? Math.round(x.avg * 10) / 10 : ""} | ${x.hi ?? ""} |`);
  }
  out.push("");
  for (const f of ["Lead_Score_Profile_Tier__c", "Lead_Score_Engagement_Tier__c"]) {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT ${f} v, COUNT(Id) n, AVG(Lead_Score_Total__c) avg FROM Lead WHERE IsConverted = false GROUP BY ${f} ORDER BY COUNT(Id) DESC LIMIT 15`)}`);
    out.push(`## ${f.replace("__c", "")}`, "", "| Value | Leads | Avg total score |", "|---|---|---|",
      ...r.records.map((x) => `| ${x.v ?? "(blank)"} | ${x.n} | ${x.avg != null ? Math.round(x.avg) : ""} |`), "");
  }
  const top = await get(`/query?q=${encodeURIComponent(`SELECT ${PARTS.join(", ")}, Lead_Score_Profile_Tier__c, Lead_Score_Engagement_Tier__c, MQL_Contact_Hot_c__c, LeadSource, Status FROM Lead WHERE IsConverted = false AND Lead_Score_Total__c > 0 ORDER BY Lead_Score_Total__c DESC LIMIT 15`)}`);
  out.push("## Top 15 scores, broken down", "", "| Total | Fit | Form | Open | Click | Web | Event | Offline | Fit tier | Eng. tier | Hot tick | Source | Status |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...top.records.map((x) => `| ${PARTS.map((f) => x[f] ?? "").join(" | ")} | ${x.Lead_Score_Profile_Tier__c ?? ""} | ${x.Lead_Score_Engagement_Tier__c ?? ""} | ${x.MQL_Contact_Hot_c__c ? "yes" : ""} | ${x.LeadSource ?? ""} | ${x.Status ?? ""} |`), "");
} catch (e) {
  out.push(`Score breakdown failed: ${String(e.message).slice(0, 200)}`, "");
}

// Does the score predict deals? Compare leads that converted or reached SQL with the rest.
// Counts and averages only.
const agg = async (where) => {
  try {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT COUNT(Id) n, AVG(Lead_Score_Total__c) avg, MAX(Lead_Score_Total__c) hi FROM Lead WHERE ${where}`)}`);
    const x = r.records[0] ?? {};
    return [x.n ?? 0, x.avg != null ? Math.round(x.avg * 10) / 10 : "", x.hi ?? ""];
  } catch (e) {
    return [`error: ${String(e.message).slice(0, 100)}`, "", ""];
  }
};
const GROUPS = [
  ["Converted (became contact/opportunity)", "IsConverted = true"],
  ["Reached SQL (date set)", "Date_Reached_Sales_Accepted_SQL__c != null"],
  ["Status Sales Accepted (SQL)", "Status = 'Sales Accepted (SQL)'"],
  ["Inbound, converted", "LeadSource = 'Inbound' AND IsConverted = true"],
  ["Inbound, not converted", "LeadSource = 'Inbound' AND IsConverted = false"],
  ["Everyone else (open, not SQL)", "IsConverted = false AND Date_Reached_Sales_Accepted_SQL__c = null"],
];
out.push("## Does the score predict deals?", "", "| Group | Leads | Avg score | Max score |", "|---|---|---|---|");
for (const [label, where] of GROUPS) out.push(`| ${label} | ${(await agg(where)).join(" | ")} |`);
out.push("");
const BANDS = [["0 or blank", "(Lead_Score_Total__c = null OR Lead_Score_Total__c = 0)"], ["1-9", "Lead_Score_Total__c >= 1 AND Lead_Score_Total__c < 10"],
  ["10-24", "Lead_Score_Total__c >= 10 AND Lead_Score_Total__c < 25"], ["25-49", "Lead_Score_Total__c >= 25 AND Lead_Score_Total__c < 50"], ["50+", "Lead_Score_Total__c >= 50"]];
out.push("## Conversion rate by score band", "", "| Score | Leads | Converted | Reached SQL | % converted | % SQL |", "|---|---|---|---|---|---|");
for (const [label, where] of BANDS) {
  const [all] = await agg(where);
  const [conv] = await agg(`${where} AND IsConverted = true`);
  const [sql] = await agg(`${where} AND (IsConverted = true OR Date_Reached_Sales_Accepted_SQL__c != null)`);
  const pct = (a) => (typeof a === "number" && typeof all === "number" && all > 0 ? `${Math.round((a / all) * 1000) / 10}%` : "");
  out.push(`| ${label} | ${all} | ${conv} | ${sql} | ${pct(conv)} | ${pct(sql)} |`);
}
out.push("");
try {
  for (const f of ["Lead_Score_Engagement_Tier__c", "Lead_Score_Profile_Tier__c", "LeadSource"]) {
    const r = await get(`/query?q=${encodeURIComponent(`SELECT ${f} v, COUNT(Id) n, AVG(Lead_Score_Total__c) avg FROM Lead WHERE IsConverted = true OR Date_Reached_Sales_Accepted_SQL__c != null GROUP BY ${f} ORDER BY COUNT(Id) DESC LIMIT 12`)}`);
    out.push(`## Converted or SQL leads by ${f.replace("__c", "")}`, "", "| Value | Leads | Avg score |", "|---|---|---|",
      ...r.records.map((x) => `| ${x.v ?? "(blank)"} | ${x.n} | ${x.avg != null ? Math.round(x.avg) : ""} |`), "");
  }
} catch (e) {
  out.push(`Breakdown failed: ${String(e.message).slice(0, 200)}`, "");
}

console.log(out.join("\n"));
