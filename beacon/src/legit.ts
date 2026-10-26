// Which new Salesforce Leads are worth a Slack post. Pure functions, no network.

export type Lead = {
  Id: string;
  FirstName?: string | null;
  LastName?: string | null;
  Email?: string | null;
  Phone?: string | null;
  Company?: string | null;
  Title?: string | null;
  Country?: string | null;
  LeadSource?: string | null;
  Status?: string | null;
  Description?: string | null;
  CreatedDate: string;
  Owner?: { Name?: string | null } | null;
  CreatedBy?: { Name?: string | null } | null;
};

// Same list as lead-routing/worker/src/route.ts. Keep them in step.
const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com",
]);

// Salesforce fills Company with this when nobody typed one.
const NO_COMPANY = new Set(["", "[not provided]", "n/a", "na", "none", "-", "unknown"]);

// Words that mark a lead someone made to try something out.
const TEST_WORDS = /\b(test|testing|asdf|qwerty|dummy|sample|fake)\b/i;

export type Rules = {
  // Lead Status values that mean "don't bother", e.g. "Unqualified".
  skipStatuses: string[];
  // Email domains of our own people.
  internalDomains: string[];
};

export function rulesFrom(skipStatuses = "", internalDomains = ""): Rules {
  const list = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return { skipStatuses: list(skipStatuses), internalDomains: list(internalDomains) };
}

// Null when the lead is legit, else why it isn't. Logged for every skipped lead.
export function notLegitReason(lead: Lead, rules: Rules): string | null {
  const email = (lead.Email ?? "").trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";
  const phone = (lead.Phone ?? "").replace(/\D/g, "");
  const company = (lead.Company ?? "").trim();
  const name = `${lead.FirstName ?? ""} ${lead.LastName ?? ""}`.trim();

  if (rules.skipStatuses.includes((lead.Status ?? "").trim().toLowerCase())) return `status ${lead.Status}`;
  if (!email && phone.length < 7) return "no email or phone";
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return "invalid email";
  if (DISPOSABLE.has(domain)) return "throwaway email";
  if (rules.internalDomains.includes(domain)) return "internal email";
  if (NO_COMPANY.has(company.toLowerCase())) return "no company";
  if (TEST_WORDS.test(name) || TEST_WORDS.test(company) || /^test[+@]/.test(email)) return "test lead";
  return null;
}
