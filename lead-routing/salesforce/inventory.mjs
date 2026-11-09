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

// 7. Who creates leads: staff user names (never lead names), by source, and how many land per day.
await grouped("Leads created in the last 90 days, by creator and Lead Source", "SELECT CreatedBy.Name creator, CreatedBy.IsActive active, LeadSource, COUNT(Id) n FROM Lead WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY CreatedBy.Name, CreatedBy.IsActive, LeadSource ORDER BY COUNT(Id) DESC LIMIT 60", ["creator", "active", "LeadSource", "n"]);
await grouped("Busiest creator-days in the last 90 days (bulk imports show as big days)", "SELECT CreatedBy.Name creator, DAY_ONLY(CreatedDate) day, COUNT(Id) n FROM Lead WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY CreatedBy.Name, DAY_ONLY(CreatedDate) ORDER BY COUNT(Id) DESC LIMIT 40", ["creator", "day", "n"]);
await grouped("Active users by profile", "SELECT Profile.Name profile, UserType, COUNT(Id) n FROM User WHERE IsActive = true GROUP BY Profile.Name, UserType ORDER BY COUNT(Id) DESC", ["profile", "UserType", "n"]);

// 8. What the big imports were: Tai Nguyen's busiest days, grouped by the fields an import carries.
const batch = "CreatedBy.Name = 'Tai Nguyen' AND (DAY_ONLY(CreatedDate) = 2026-10-23 OR DAY_ONLY(CreatedDate) = 2026-09-11 OR DAY_ONLY(CreatedDate) = 2026-10-30 OR DAY_ONLY(CreatedDate) = 2026-09-08)";
for (const [field, label] of [["DAY_ONLY(CreatedDate)", "day"], ["Campaign_Source__c", "campaign"], ["Latest_Sequence__c", "sequence"], ["Country", "country"], ["Industry", "industry"], ["BrandSector__c", "sector"], ["Lead_Score_Profile_Tier__c", "tier"], ["Specific_Lead_Source__c", "detail"], ["Status", "status"], ["Owner.Name", "owner"], ["LastModifiedBy.Name", "lastBy"]]) {
  await grouped(`Import days, by ${field}`, `SELECT ${field} ${label}, COUNT(Id) n FROM Lead WHERE ${batch} GROUP BY ${field} ORDER BY COUNT(Id) DESC LIMIT 15`, [label, "n"]);
}
const filled = [];
for (const f of ["Title", "Phone", "Email", "Website", "NoofOutlets__c", "LinkedIn__c", "DOZISF__ZoomInfo_Id__c", "Lead_Score_Total__c", "Gong__Current_Flow_Name__c", "ConferenceEvent__c"]) {
  const r = await tryQuery(`SELECT COUNT() FROM Lead WHERE ${batch} AND ${f} != null`);
  filled.push(`| \`${f}\` | ${r.error ? "?" : r.totalSize} |`);
}
const all = await tryQuery(`SELECT COUNT() FROM Lead WHERE ${batch}`);
table(`Import days: fields filled (of ${all.totalSize ?? "?"} leads)`, ["Field", "Filled"], filled);
const conv = await tryQuery(`SELECT COUNT() FROM Lead WHERE ${batch} AND (IsConverted = true OR Date_Reached_Sales_Accepted_SQL__c != null)`);
const touched = await tryQuery(`SELECT COUNT() FROM Lead WHERE ${batch} AND Status != 'New (Uncontacted)'`);
table("Import days: what happened since", ["Count", "Leads"], [`| converted or SQL | ${conv.totalSize ?? "?"} |`, `| moved past New (Uncontacted) | ${touched.totalSize ?? "?"} |`]);

// 9. Who the imported leads are. Reads emails to count domains and role inboxes (info@, sales@);
// prints domain counts and categories only, never an address or a person's name.
{
  const rows = [];
  let page = await tryQuery(`SELECT Email, Company FROM Lead WHERE ${batch}`);
  while (page && !page.error) {
    rows.push(...page.records);
    page = page.nextRecordsUrl ? await get(page.nextRecordsUrl.replace(/^\/services\/data\/v[\d.]+/, "")).catch((e) => ({ error: String(e) })) : null;
  }
  const FREE = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|gmx|mail|yandex|qq|163)\./i;
  const ROLE = /^(info|contact|hello|hi|admin|office|sales|marketing|events?|catering|reservations?|booking|bookings|enquiries|inquiries|support|team|careers|jobs|hr|accounts?|billing|orders?|manager|gm|press|media|partners?|franchise|franchising)$/i;
  const domains = new Map();
  const companies = new Map();
  let free = 0, role = 0, bad = 0;
  for (const r of rows) {
    const [local, domain] = String(r.Email ?? "").toLowerCase().split("@");
    if (!domain) { bad++; continue; }
    if (FREE.test(domain)) free++;
    else domains.set(domain, (domains.get(domain) ?? 0) + 1);
    if (ROLE.test(local.replace(/[0-9._-]+$/, ""))) role++;
    const c = (r.Company ?? "(blank)").trim() || "(blank)";
    companies.set(c, (companies.get(c) ?? 0) + 1);
  }
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
  table(`Imported leads: email kinds (${rows.length} read)`, ["Kind", "Leads"], [
    `| free email (Gmail, Yahoo, Outlook...) | ${free} |`,
    `| company domain | ${rows.length - free - bad} |`,
    `| distinct company domains | ${domains.size} |`,
    `| role inbox (info@, sales@, events@...) | ${role} |`,
    `| no valid email | ${bad} |`,
  ]);
  table("Imported leads: top 30 company domains", ["Domain", "Leads"], top(domains, 30).map(([d, n]) => `| ${cell(d)} | ${n} |`));
  const sizes = new Map();
  for (const n of domains.values()) { const b = n === 1 ? "1" : n <= 5 ? "2-5" : n <= 20 ? "6-20" : n <= 100 ? "21-100" : "100+"; sizes.set(b, (sizes.get(b) ?? 0) + 1); }
  table("Imported leads: people per company domain", ["People", "Domains"], ["1", "2-5", "6-20", "21-100", "100+"].map((b) => `| ${b} | ${sizes.get(b) ?? 0} |`));
  table("Imported leads: top 30 Company values", ["Company", "Leads"], top(companies, 30).map(([c, n]) => `| ${cell(c)} | ${n} |`));
}
await grouped("Imported leads: engagement tier", `SELECT Lead_Score_Engagement_Tier__c tier, COUNT(Id) n FROM Lead WHERE ${batch} GROUP BY Lead_Score_Engagement_Tier__c ORDER BY COUNT(Id) DESC`, ["tier", "n"]);
{
  const parts = [];
  for (const f of ["Lead_Score_Email_Open_Engagement__c", "Lead_Score_Email_Click_Engagement__c", "Lead_Score_Website_Engagement__c", "Lead_Score_Form_Submission__c", "Lead_Score_Event_Engagement__c"]) {
    const r = await tryQuery(`SELECT COUNT(Id) n, AVG(${f}) a, MAX(${f}) m FROM Lead WHERE ${batch} AND ${f} > 0`);
    const x = r.records?.[0] ?? {};
    parts.push(`| \`${f.replace("Lead_Score_", "").replace("__c", "")}\` | ${x.n ?? "?"} | ${x.a == null ? "" : Number(x.a).toFixed(1)} | ${x.m ?? ""} |`);
  }
  table("Imported leads: score parts (leads with points)", ["Part", "Leads", "Avg", "Max"], parts);
}

console.log(out.join("\n"));
