// Turns Leads into Slack messages and posts them as Beacon.
import type { Lead } from "./legit.ts";

export type Message = { text: string; blocks: unknown[] };

// Slack treats &, < and > as markup.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const name = (l: Lead) => [l.FirstName, l.LastName].filter(Boolean).join(" ") || "(no name)";
const link = (l: Lead, instanceUrl: string) => `${instanceUrl}/lightning/r/Lead/${l.Id}/view`;

export function leadCard(l: Lead, instanceUrl: string): Message {
  const source = l.LeadSource || "No lead source";
  const who = [l.Title, l.Company].filter(Boolean).map((s) => esc(s!)).join(" at ");
  const contact = [l.Email, l.Phone, l.Country].filter(Boolean).map((s) => esc(s!)).join(" · ");
  const owner = l.Owner?.Name ? `Owner: ${esc(l.Owner.Name)}` : "No owner";
  const by = l.CreatedBy?.Name ? ` · Added by ${esc(l.CreatedBy.Name)}` : "";
  // Book-a-demo leads carry Claude's research summary here. Keep the card short.
  const notes = (l.Description ?? "").trim();
  const blocks: unknown[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔥 New lead · ${esc(source)}*\n*<${link(l, instanceUrl)}|${esc(name(l))}>*${who ? `, ${who}` : ""}\n${contact}`,
      },
    },
  ];
  if (notes) blocks.push({ type: "section", text: { type: "mrkdwn", text: esc(notes.length > 600 ? notes.slice(0, 600) + "…" : notes) } });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `${owner}${by}` }] });
  return { text: `New lead (${source}): ${name(l)}${l.Company ? ` at ${l.Company}` : ""}`, blocks };
}

// For a batch, e.g. someone importing a conference list: one message instead of a flood.
export function batchSummary(leads: Lead[], instanceUrl: string): Message {
  const sources = [...new Set(leads.map((l) => l.LeadSource || "No lead source"))].join(", ");
  const SHOWN = 40;
  const lines = leads.slice(0, SHOWN).map((l) => `• <${link(l, instanceUrl)}|${esc(name(l))}>${l.Company ? `, ${esc(l.Company)}` : ""}`);
  if (leads.length > SHOWN) lines.push(`…and ${leads.length - SHOWN} more`);
  return {
    text: `${leads.length} new leads (${sources})`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*📋 ${leads.length} new leads · ${esc(sources)}*` } },
      { type: "section", text: { type: "mrkdwn", text: lines.join("\n").slice(0, 2900) } },
    ],
  };
}

export async function post(token: string, channel: string, m: Message): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text: m.text, blocks: m.blocks, unfurl_links: false }),
  });
  // Slack answers 200 even on errors, with ok: false.
  const json = (await res.json()) as { ok: boolean; error?: string };
  if (!json.ok) throw new Error(`Slack: ${json.error}`);
}
