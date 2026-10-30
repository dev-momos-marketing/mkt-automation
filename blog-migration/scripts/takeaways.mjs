// Key takeaways for blog posts: takeaways/<slug>.json holds a post's 3 to 5 takeaways, shown in a box
// at the top of the post. The box is an embed (keyTakeaways) without scripts, so it's in the page's
// HTML from the server and BlogEmbeds puts it at its ⟦embed:keyTakeaways⟧ line. Pure functions, used
// by takeaways-apply.mjs and the tests.
//
//   { "items": ["One sentence the reader should remember.", "…"] }

export const EMBED_ID = "keyTakeaways"
export const MARKER_LINE = `<p>⟦embed:${EMBED_ID}⟧</p>`

const escape = text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function takeawaysEmbed(items) {
    return `<div id="key-takeaways">
<style>
#key-takeaways,#key-takeaways *{box-sizing:border-box;margin:0;padding:0}
#key-takeaways{font-family:'Poppins',sans-serif;background:#FDF7F6;border:1px solid #F4DEDB;border-left:4px solid #D73E33;border-radius:12px;padding:24px 28px;max-width:860px}
#key-takeaways .t{font-size:13px;font-weight:600;color:#D73E33;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:14px}
#key-takeaways ul{list-style:none;display:grid;gap:12px}
#key-takeaways li{position:relative;padding-left:30px;font-size:17px;line-height:1.6;color:#15181E}
#key-takeaways li::before{content:"";position:absolute;left:0;top:5px;width:18px;height:18px;border-radius:50%;background:#D73E33}
#key-takeaways li::after{content:"";position:absolute;left:6px;top:9px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
@media (max-width:600px){#key-takeaways{padding:20px}#key-takeaways li{font-size:16px}}
</style>
<div class="t">Key takeaways</div>
<ul>
${items.map(item => `<li>${escape(item)}</li>`).join("\n")}
</ul>
</div>`
}

// Everything that breaks the house style (see .claude/skills/blog-writing). A number must appear in
// the post's text, so a takeaway never adds a figure the post doesn't have.
export function checkTakeaways(takeaways, postText = "") {
    const problems = []
    const items = takeaways?.items ?? []
    if (items.length < 3 || items.length > 5) problems.push(`${items.length} takeaways (3 to 5)`)
    for (const item of items) {
        const words = item.split(/\s+/).filter(Boolean).length
        const sentences = item.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).filter(Boolean).length
        if (words > 35 || sentences > 2) problems.push(`"${item.slice(0, 50)}…" has ${words} words and ${sentences} sentences (at most 35 words, 2 sentences)`)
        if (!/[.!?]$/.test(item.trim())) problems.push(`"${item.slice(0, 50)}…" should end with a period`)
        if (/<[a-z]/i.test(item)) problems.push(`"${item.slice(0, 50)}…" contains HTML`)
        if (/,\s*not\s+\w|\s[—–-]\s*not\s|\bnot (just |only )?[^.,;]{1,60},? but\b|\bisn't [^.;]{1,40}; it's\b/i.test(item)) problems.push(`"${item.slice(0, 50)}…" uses an "X, not Y" construction`)
        const hype = item.match(/\b(game[- ]changer|unlock|leverag\w*|supercharg\w*|seamless\w*|robust|in today's fast-paced)\b/i)
        if (hype) problems.push(`"${hype[0]}" in "${item.slice(0, 50)}…"`)
        for (const n of item.match(/\d[\d,.]*%?/g) ?? []) {
            if (!postText.includes(n.replace(/[.,]$/, ""))) problems.push(`"${item.slice(0, 50)}…" has "${n}", which isn't in the post`)
        }
    }
    return problems
}
