// Reads new Leads from Salesforce with the client credentials flow (no user password).
import type { Lead } from "./legit.ts";

const API_VERSION = "v62.0";

const FIELDS = [
  "Id", "FirstName", "LastName", "Email", "Phone", "Company", "Title", "Country",
  "LeadSource", "Status", "Description", "CreatedDate", "Owner.Name", "CreatedBy.Name",
].join(", ");

export type Session = { accessToken: string; instanceUrl: string };

// domain: the org's My Domain, e.g. https://momos.my.salesforce.com
export async function login(domain: string, clientId: string, clientSecret: string): Promise<Session> {
  const res = await fetch(`${domain.replace(/\/$/, "")}/services/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`Salesforce login ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; instance_url: string };
  return { accessToken: json.access_token, instanceUrl: json.instance_url };
}

// SOQL wants 2026-10-26T07:43:00Z, no milliseconds.
const soqlTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function newLeadsQuery(from: Date, to: Date): string {
  return `SELECT ${FIELDS} FROM Lead WHERE IsConverted = false AND IsDeleted = false ` +
    `AND CreatedDate >= ${soqlTime(from)} AND CreatedDate < ${soqlTime(to)} ORDER BY CreatedDate`;
}

// Leads created in [from, to).
export async function newLeads(s: Session, from: Date, to: Date): Promise<Lead[]> {
  const leads: Lead[] = [];
  let path: string | null = `/services/data/${API_VERSION}/query?q=${encodeURIComponent(newLeadsQuery(from, to))}`;
  while (path) {
    const res = await fetch(s.instanceUrl + path, { headers: { authorization: `Bearer ${s.accessToken}` } });
    if (!res.ok) throw new Error(`Salesforce query ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as { records: Lead[]; nextRecordsUrl?: string };
    leads.push(...page.records);
    path = page.nextRecordsUrl ?? null;
  }
  return leads;
}
