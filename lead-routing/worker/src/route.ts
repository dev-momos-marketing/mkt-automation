// The instant part. Pure functions, no network, runs in microseconds.

export type Region = "us_west" | "us_east" | "emea" | "apac" | "unknown";
export type AEKey = "james" | "jill";

export type FormData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  country?: string;
  locations?: string;
  website?: string; // honeypot, real people never fill it
  region_tab?: string;
  elapsedMs?: number;
  timezone?: string;
  pageUrl?: string;
  referrer?: string;
  [utm: string]: unknown;
};

export type Instant = {
  // routed: books a demo now. follow_up: thank-you popup, and the region's AE follows up
  // (still sent to Zapier with `ae` set). not_fit / spam: thank-you popup, no follow-up.
  status: "routed" | "follow_up" | "not_fit" | "spam";
  reason: string;
  region: Region;
  ae: AEKey | null;
};

// Region -> AE
export const ROUTES: Record<Region, AEKey> = {
  us_west: "james",
  apac: "james",
  us_east: "jill",
  emea: "jill",
  unknown: "jill",
};

// Location answers that never book a demo straight away. They get the thank-you popup and
// the region's AE follows up later. Claude isn't asked, which also makes them faster.
export const FOLLOW_UP_BUCKETS: string[] = ["1-5"];

// Matches every country in the form. Latin America and the Caribbean aren't listed here,
// so the visitor's time zone decides (Eastern-ish goes to Jill, Pacific/Mountain to James).
const EMEA = new Set((
  "GB IE FR DE ES PT IT NL BE LU CH AT DK SE NO FI IS PL CZ SK HU RO BG GR CY MT SI HR RS BA ME MK AL XK EE LV LT UA MD BY RU AD MC SM LI VA GI JE GG IM " +
  "AE SA QA KW BH OM IL JO LB IQ IR TR YE PS SY AM AZ GE KZ KG TJ TM UZ " +
  "EG MA DZ TN LY SD SS ET ER DJ SO KE UG TZ RW BI CD CG CM GA GQ CF TD NG GH CI SN ML BF NE GM GN GW SL LR TG BJ MR CV ST AO ZM ZW MW MZ BW NA ZA LS SZ MG MU SC KM RE"
).split(" "));
const APAC = new Set((
  "AU NZ SG MY TH VN PH ID JP KR HK MO TW CN IN PK BD LK NP BT MV AF MN KH LA MM BN TL PG FJ SB VU WS TO KI TV NR PW FM MH NC PF GU"
).split(" "));
const NORTH_AMERICA = new Set(["US", "CA", "MX"]);

// Pacific and Mountain time in the US, Canada and Mexico count as West Coast.
const WEST_ZONES = new Set([
  "America/Los_Angeles", "America/Denver", "America/Phoenix", "America/Boise", "America/Anchorage",
  "America/Juneau", "America/Sitka", "America/Nome", "America/Yakutat", "America/Metlakatla",
  "Pacific/Honolulu", "America/Vancouver", "America/Edmonton", "America/Whitehorse", "America/Dawson_Creek",
  "America/Tijuana", "America/Hermosillo", "America/Mazatlan", "America/Chihuahua", "America/Ciudad_Juarez",
]);
const MIDDLE_EAST_ZONES = new Set([
  "Asia/Dubai", "Asia/Riyadh", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain", "Asia/Muscat",
  "Asia/Jerusalem", "Asia/Tel_Aviv", "Asia/Beirut", "Asia/Amman", "Asia/Baghdad", "Asia/Tehran", "Asia/Nicosia",
]);

const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com",
]);

// Backup when the browser time zone is missing or not a North American one:
// Cloudflare's IP lookup gives the state or province. Pacific and Mountain only.
const WEST_STATES: Record<string, Set<string>> = {
  US: new Set(["WA", "OR", "CA", "NV", "ID", "MT", "WY", "UT", "CO", "AZ", "NM", "AK", "HI"]),
  CA: new Set(["BC", "AB", "YT"]),
  MX: new Set(["BCN", "BCS", "SON", "CHH", "SIN", "NAY"]),
};

// Where Cloudflare thinks the visitor is, from their IP address.
export type IpLocation = { country?: string; regionCode?: string };

function isNorthAmericanZone(timezone: string): boolean {
  return timezone.startsWith("America/") || timezone === "Pacific/Honolulu";
}

function westFromIp(ip: IpLocation): Region | null {
  const states = WEST_STATES[(ip.country ?? "").toUpperCase()];
  if (!states || !ip.regionCode) return null;
  return states.has(ip.regionCode.toUpperCase()) ? "us_west" : "us_east";
}

export function regionFor(country = "", timezone = "", ip: IpLocation = {}): Region {
  const c = country.toUpperCase();
  if (NORTH_AMERICA.has(c)) {
    if (isNorthAmericanZone(timezone)) return WEST_ZONES.has(timezone) ? "us_west" : "us_east";
    return westFromIp(ip) ?? "us_east";
  }
  if (EMEA.has(c)) return "emea";
  if (APAC.has(c)) return "apac";
  // "OTHER" or blank: the visitor's time zone is the best clue we have.
  if (WEST_ZONES.has(timezone)) return "us_west";
  if (timezone.startsWith("America/")) return "us_east";
  if (MIDDLE_EAST_ZONES.has(timezone) || timezone.startsWith("Europe/") || timezone.startsWith("Africa/")) return "emea";
  if (timezone.startsWith("Asia/") || timezone.startsWith("Australia/") || timezone.startsWith("Pacific/")) return "apac";
  return westFromIp(ip) ?? "unknown";
}

// The checks that need no AI, in priority order: spam first, then the location-count part of
// the ICP check. Claude's ICP check (index.ts) runs next, and the region decides the AE last.
export function instantRoute(d: FormData, ip: IpLocation = {}): Instant {
  const spam = spamReason(d);
  if (spam) return { status: "spam", reason: spam, region: "unknown", ae: null };

  // The region is only used to name the AE: the one who gets the booking or does the follow-up.
  const region = regionFor(String(d.country ?? ""), String(d.timezone ?? ""), ip);
  if (FOLLOW_UP_BUCKETS.includes(String(d.locations ?? ""))) return { status: "follow_up", reason: `${d.locations} locations`, region, ae: ROUTES[region] };
  return { status: "routed", reason: "ok", region, ae: ROUTES[region] };
}

// 1. Spam. No AI, no cost.
function spamReason(d: FormData): string | null {
  const email = String(d.email ?? "").trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";
  if (d.website) return "honeypot filled";
  if (typeof d.elapsedMs === "number" && d.elapsedMs < 2000) return "form filled in under 2s";
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return "invalid email";
  if (DISPOSABLE.has(domain)) return "throwaway email";
  return null;
}
