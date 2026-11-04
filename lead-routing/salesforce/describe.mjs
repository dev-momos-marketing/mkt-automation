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
  const d = await get(`/sobjects/${object}/describe`);
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

console.log(out.join("\n"));
