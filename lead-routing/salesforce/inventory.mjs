// Read-only: what the Salesforce org holds that lifecycle automation could use. Lists the
// objects the integration user can read with record counts, installed packages (from API
// name prefixes), custom fields on the main objects with how many Leads fill each one,
// campaigns, activity, field history and opportunity stages. Prints metadata, counts and
// campaign names only, never people's names or emails.
// Run from the "Salesforce fields" GitHub Action. Needs SF_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET.
const { SF_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET } = process.env;
const API = "v62.0";

if (!SF_DOMAIN || !SF_CLIENT_ID || !SF_CLIENT_SECRET) {
  console.error("Missing SF_DOMAIN, SF_CLIENT_ID or SF_CLIENT_SECRET.");
  process.exit(1);
}

const base = SF_DOMAIN.replace(/\/+$/, "").replace(/^https?:\/\//, "").replace(/^/, "https://");
const tokenRes = await fetch(`${base}/services/oauth2/token`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: SF_CLIENT_ID, client_secret: SF_CLIENT_SECRET }),
});
const token = await tokenRes.json();
if (!tokenRes.ok) throw new Error(`Salesforce login failed (${tokenRes.status}): ${token.error_description ?? token.error ?? "unknown"}`);

const get = async (path) => {
  const res = await fetch(`${token.instance_url}/services/data/${API}${path}`, { headers: { authorization: `Bearer ${token.access_token}` } });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  return res.json();
};
const query = (soql) => get(`/query?q=${encodeURIComponent(soql)}`);
const tryQuery = async (soql) => {
  try {
    return await query(soql);
  } catch (e) {
    return { error: String(e.message) };
  }
};
const cell = (v) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").slice(0, 300);
const out = [];
const table = (title, head, rows) => {
  out.push(`## ${title}`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...(rows.length ? rows : [`| ${head.map(() => "").join(" | ")} |`]), "");
};

// 1. Objects the user can read, with counts.
const global = await get("/sobjects");
const queryable = global.sobjects.filter((o) => o.queryable && !o.deprecatedAndHidden);
const KEY = ["Lead", "Contact", "Account", "Opportunity", "OpportunityContactRole", "Campaign", "CampaignMember", "Task", "Event", "EmailMessage", "LeadHistory", "ContactHistory", "OpportunityHistory", "User", "Case", "Contract", "Order", "Product2", "Quote", "ListEmail", "ActivityHistory"];
const skip = /(Share|Feed|History|ChangeEvent|Tag|__mdt|__e|__x|__b)$/;
const picked = queryable.filter((o) => KEY.includes(o.name) || (o.custom && !skip.test(o.name)));
const objectRows = [];
for (const o of picked) {
  const r = await tryQuery(`SELECT COUNT() FROM ${o.name}`);
  objectRows.push(`| \`${o.name}\` | ${cell(o.label)} | ${o.custom ? "custom" : "standard"} | ${r.error ? `can't read: ${cell(r.error).slice(0, 80)}` : r.totalSize} |`);
}
table(`Objects (${queryable.length} queryable in total; key standard and all custom shown)`, ["API name", "Label", "Kind", "Records"], objectRows);

// 2. Installed packages, from namespace prefixes on objects and fields.
const namespaces = new Map();
const addNs = (name, where) => {
  const m = /^([A-Za-z0-9]+)__[A-Za-z0-9_]+__[a-z]+$/.exec(name);
  if (!m) return;
  const s = namespaces.get(m[1]) ?? new Set();
  s.add(where);
  namespaces.set(m[1], s);
};
for (const o of global.sobjects) addNs(o.name, o.name);

// 3. Custom fields on the main objects.
const described = {};
for (const name of ["Lead", "Contact", "Account", "Opportunity", "Campaign", "CampaignMember", "Task", "Event"]) {
  try {
    described[name] = await get(`/sobjects/${name}/describe`);
  } catch (e) {
    out.push(`## ${name} fields`, "", `Could not read ${name}: ${cell(e.message)}`, "");
    continue;
  }
  for (const f of described[name].fields) if (f.custom) addNs(f.name, `${name} fields`);
}
table("Installed packages (namespace prefixes)", ["Prefix", "Found on"], [...namespaces].map(([ns, where]) => `| \`${ns}\` | ${cell([...where].slice(0, 8).join(", "))} |`));

// Lead fields get a fill count (how many Leads have a value), the rest get metadata only.
const totalLeads = (await tryQuery("SELECT COUNT() FROM Lead")).totalSize ?? 0;
const lead = described.Lead;
if (lead) {
  const rows = [];
  for (const f of lead.fields.filter((f) => f.custom || ["LeadSource", "Status", "Rating", "Industry", "NumberOfEmployees", "AnnualRevenue", "Country", "State", "Title", "Website", "HasOptedOutOfEmail", "LastActivityDate", "ConvertedDate"].includes(f.name))) {
    let filled = "";
    if (f.filterable && !["textarea", "base64", "location", "address"].includes(f.type)) {
      const cond = f.type === "boolean" ? `${f.name} = true` : `${f.name} != null`;
      const r = await tryQuery(`SELECT COUNT() FROM Lead WHERE ${cond}`);
      filled = r.error ? "?" : `${r.totalSize}`;
    }
    const values = (f.picklistValues ?? []).filter((p) => p.active).map((p) => p.value).join(", ");
    rows.push(`| \`${f.name}\` | ${cell(f.label)} | ${f.type}${f.calculated ? " (formula)" : ""} | ${filled} | ${cell(values)} |`);
  }
  table(`Lead fields (${totalLeads} leads; filled = leads with a value, or ticked)`, ["API name", "Label", "Type", "Filled", "Values"], rows);
}
for (const name of ["Contact", "Account", "Opportunity", "Campaign", "CampaignMember", "Task", "Event"]) {
  const d = described[name];
  if (!d) continue;
  const fields = d.fields.filter((f) => f.custom || (name === "Opportunity" && ["StageName", "Type", "LeadSource", "Amount", "CloseDate", "ForecastCategoryName"].includes(f.name)) || (["Task", "Event"].includes(name) && ["Type", "TaskSubtype", "EventSubtype", "Status"].includes(f.name)));
  table(`${name} fields (custom, plus key standard)`, ["API name", "Label", "Type", "Values"], fields.map((f) => `| \`${f.name}\` | ${cell(f.label)} | ${f.type}${f.calculated ? " (formula)" : ""} | ${cell((f.picklistValues ?? []).filter((p) => p.active).map((p) => p.value).join(", "))} |`));
}

// 4. Campaigns and members.
const camps = await tryQuery("SELECT Name, Type, Status, IsActive, StartDate, NumberOfLeads, NumberOfContacts, NumberOfResponses, NumberOfConvertedLeads, NumberOfOpportunities, NumberOfWonOpportunities FROM Campaign ORDER BY CreatedDate DESC LIMIT 60");
if (camps.error) out.push("## Campaigns", "", `Could not read: ${cell(camps.error)}`, "");
else table(`Campaigns (latest 60 of ${camps.totalSize})`, ["Name", "Type", "Status", "Active", "Start", "Leads", "Contacts", "Responses", "Converted", "Opps", "Won"], camps.records.map((c) => `| ${cell(c.Name)} | ${cell(c.Type)} | ${cell(c.Status)} | ${c.IsActive ? "yes" : ""} | ${c.StartDate ?? ""} | ${c.NumberOfLeads} | ${c.NumberOfContacts} | ${c.NumberOfResponses} | ${c.NumberOfConvertedLeads} | ${c.NumberOfOpportunities} | ${c.NumberOfWonOpportunities} |`));
const cm = await tryQuery("SELECT Status, HasResponded, COUNT(Id) n FROM CampaignMember GROUP BY Status, HasResponded ORDER BY COUNT(Id) DESC LIMIT 30");
if (!cm.error) table("Campaign member statuses", ["Status", "Responded", "Members"], cm.records.map((r) => `| ${cell(r.Status)} | ${r.HasResponded ? "yes" : ""} | ${r.n} |`));

// 5. Activity in the last 90 days.
const grouped = async (title, soql, cols) => {
  const r = await tryQuery(soql);
  if (r.error) out.push(`## ${title}`, "", `Could not read: ${cell(r.error)}`, "");
  else table(title, cols, r.records.map((x) => `| ${cols.slice(0, -1).map((c) => cell(x[c] ?? "(blank)")).join(" | ")} | ${x.n} |`));
};
await grouped("Tasks in the last 90 days", "SELECT Type, TaskSubtype, COUNT(Id) n FROM Task WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY Type, TaskSubtype ORDER BY COUNT(Id) DESC LIMIT 30", ["Type", "TaskSubtype", "n"]);
await grouped("Events in the last 90 days", "SELECT Type, EventSubtype, COUNT(Id) n FROM Event WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY Type, EventSubtype ORDER BY COUNT(Id) DESC LIMIT 30", ["Type", "EventSubtype", "n"]);
await grouped("Lead field history, last 90 days (tracked fields)", "SELECT Field, COUNT(Id) n FROM LeadHistory WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY Field ORDER BY COUNT(Id) DESC LIMIT 40", ["Field", "n"]);

// 6. Pipeline.
await grouped("Opportunities by stage", "SELECT StageName, COUNT(Id) n FROM Opportunity GROUP BY StageName ORDER BY COUNT(Id) DESC", ["StageName", "n"]);
await grouped("Opportunities by Lead Source", "SELECT LeadSource, COUNT(Id) n FROM Opportunity GROUP BY LeadSource ORDER BY COUNT(Id) DESC LIMIT 20", ["LeadSource", "n"]);
await grouped("Contacts by Lead Source", "SELECT LeadSource, COUNT(Id) n FROM Contact GROUP BY LeadSource ORDER BY COUNT(Id) DESC LIMIT 20", ["LeadSource", "n"]);
await grouped("Leads by Lead Source Detail, all time", "SELECT Specific_Lead_Source__c, COUNT(Id) n FROM Lead GROUP BY Specific_Lead_Source__c ORDER BY COUNT(Id) DESC LIMIT 20", ["Specific_Lead_Source__c", "n"]);
await grouped("Leads by Engage flow status, all time", "SELECT Gong__Flow_Status__c, COUNT(Id) n FROM Lead GROUP BY Gong__Flow_Status__c ORDER BY COUNT(Id) DESC LIMIT 20", ["Gong__Flow_Status__c", "n"]);

console.log(out.join("\n"));
