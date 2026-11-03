// Rewritten tool reviews in "best software" posts: reviews/<slug>/<NN>-<tool>.html replaces the
// post's section from its "N. Tool" heading to the next heading. Pure functions, used by
// update-reviews.mjs, the tests and the writers' checks.
import { checkPost } from "./posts.mjs"

const text = html => String(html).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim()
const words = t => t.toLowerCase().replace(/[^a-z0-9$%' ]+/g, " ").split(/\s+/).filter(Boolean)

// The post split into its sections: [{ heading, n, html }]. Everything before the first heading is
// section 0 with heading "".
export function sections(html) {
    return String(html).split(/(?=<h2\b)/).map(part => {
        const h = part.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>/)
        const heading = h ? text(h[1]) : ""
        const n = heading.match(/^(\d{1,2})\.\s/)
        return { heading, n: n ? Number(n[1]) : null, html: part }
    })
}

// The labels a review uses, in order. A review has four, each on its own line: Key features, Pros,
// Cons and Price and plans. The older labels (Notable customers, What's new, What you can do with,
// Why … stands out, It's best for, Pricing, Website, Category) are read too, so a leftover one is
// reported; their older wordings ("What you can do:", "Best for:", "Why businesses choose X:") count
// as one label.
export const LABELS = ["Key features", "Pros", "Cons", "Price and plans"]
export function labels(html) {
    const canonical = l => l
        .replace(/^What you can do\b.*$/, "What you can do with")
        .replace(/^(It['’]s best for|Best for)$/i, "It's best for")
        .replace(/^Why\b.*$/, "Why … stands out")
    return [...String(html).matchAll(/<strong>\s*([^<]{2,60}?)\s*:?\s*<\/strong>:?/g)].map(m => canonical(m[1].trim().replace(/:$/, "")))
        .filter(l => /^(Key features|Pros|Cons|Price and plans|Notable customers|What's new|What you can do with|Why … stands out|It's best for|Pricing|Website|Category)$/.test(l))
}

// The list right after a label line (<p><strong>Pros</strong></p><ul>…</ul>), as its items' HTML.
function listAfter(html, label) {
    const m = String(html).match(new RegExp(`<p>\\s*<strong>${label}:?<\\/strong>:?\\s*<\\/p>\\s*<ul>([\\s\\S]*?)<\\/ul>`))
    return m ? [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => x[1]) : null
}

// Runs of 8 words shared with any of `others` (other reviews' text).
export function sharedRuns(html, others, n = 8) {
    const grams = t => { const w = words(t); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" ")); return out }
    const mine = grams(text(html))
    const theirs = new Set(others.flatMap(o => [...grams(o)]))
    return [...mine].filter(g => theirs.has(g))
}

// The part of a review that has to be its own words: everything but the heading, labels, lead-ins and
// the price and plans.
export function uniquePart(html) {
    return String(html).split(/<p>\s*<strong>Price and plans<\/strong>/)[0]
        .replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/g, " ")
        .replace(/<strong>[^<]{2,80}:<\/strong>|<strong>[^<]{2,80}<\/strong>:?/g, " ")
}

// Everything that breaks the rules for a rewritten review. `original` is the section it replaces,
// `facts` the tool's fact sheet (a number must appear in it), `others` other reviews' HTML.
// `swap` is the heading of a different tool taking this slot ("13. Ada"): the old tool's image and
// links don't carry over, but the slot keeps its number.
export function checkReview(html, { original, facts = "", others = [], swap = "" }) {
    const problems = []
    const [orig] = sections(original), [mine] = sections(html)
    const heading = swap || orig?.heading
    if (!orig || mine.heading !== heading) problems.push(`the heading should be "${heading}", it's "${mine?.heading}"`)
    for (const src of swap ? [] : String(original).match(/<img\b[^>]*\bsrc="([^"?]+)/g)?.map(s => s.match(/src="([^"?]+)/)[1]) ?? []) {
        if (!html.includes(src)) problems.push(`the image ${src} is missing`)
    }
    for (const m of String(original).matchAll(/⟦embed:([\w-]+)⟧/g)) if (!html.includes(m[0])) problems.push(`the embed ${m[1]} is missing`)
    // Framer stores links to the site as relative paths ("../blog/x"), so compare them as paths.
    // External links may be stored without "https://" or "www." ("reputation.com"), so compare those
    // without them too.
    const norm = href => href.replace(/^https?:\/\/(www\.)?momos\.com/, "").replace(/^\.\.\//, "/").replace(/^\.\//, "/blog/").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")
    const mineLinks = new Set([...String(html).matchAll(/href="([^"]+)"/g)].map(m => norm(m[1])))

    // The review opens with the tool's name linked to its website, then Key features, Pros, Cons
    // and Price and plans, each a label on its own line. Features, pros and cons are lists whose
    // items start with a bold lead-in ending in a colon ("Low CRM admin:").
    let website = ""
    try { website = JSON.parse(facts).website ?? "" } catch {}
    const intro = [...String(html).replace(/^[\s\S]*?<\/h2>/, "").matchAll(/<p>([\s\S]*?)<\/p>/g)].find(m => text(m[1]))
    const linksName = intro && /^\s*<a href="[^"]+">[^<]+<\/a>/.test(intro[1])
    if (!linksName) problems.push("the first paragraph should open with the tool's name linked to its website")
    else if (website && norm(intro[1].match(/href="([^"]+)"/)[1]) !== norm(website)) problems.push(`the tool's name should link to ${website}`)
    // The old website link (a "Website:" line, or a link opening the old intro) is replaced by the
    // name's link, which may point to a newer domain (meetsoci.com → soci.ai); every other link stays.
    const oldIntro = [...String(original).replace(/^[\s\S]*?<\/h2>/, "").matchAll(/<p>([\s\S]*?)<\/p>/g)].find(m => text(m[1]))
    const websiteLine = new Set([...String(original).matchAll(/<strong>\s*Website:?\s*<\/strong>:?[^<]*<a href="([^"]+)"/g)].map(m => norm(m[1]))
        .concat(oldIntro?.[1].match(/^\s*<a href="([^"]+)"/) ? [norm(oldIntro[1].match(/^\s*<a href="([^"]+)"/)[1])] : []))
    if (!swap) for (const m of String(original).matchAll(/href="([^"]+)"/g)) {
        if (mineLinks.has(norm(m[1])) || (linksName && websiteLine.has(norm(m[1])))) continue
        problems.push(`the link ${m[1]} is missing`)
    }
    const found = labels(html)
    if (found.join("|") !== LABELS.join("|")) problems.push(`the labels should be ${LABELS.join(" → ")}, they are ${found.join(" → ") || "none"}`)
    for (const label of LABELS) if (!new RegExp(`<p>\\s*<strong>${label}<\\/strong>\\s*<\\/p>`).test(html)) problems.push(`"${label}" should be a line of its own: <p><strong>${label}</strong></p>`)
    for (const [label, min, max] of [["Key features", 4, 6], ["Pros", 3, 6], ["Cons", 2, 5]]) {
        const items = listAfter(html, label)
        if (!items) { problems.push(`the ${label.toLowerCase()} should be a <ul> right after the "${label}" line`); continue }
        if (items.length < min || items.length > max) problems.push(`${items.length} ${label.toLowerCase()} (${min} to ${max})`)
        for (const item of items) {
            if (!/^\s*<strong>[^<]+:<\/strong>/.test(item)) problems.push(`"${text(item).slice(0, 40)}…" (${label.toLowerCase()}) should start with a bold lead-in ending in a colon`)
            if (words(text(item)).length > 40) problems.push(`"${text(item).slice(0, 40)}…" (${label.toLowerCase()}) is longer than 40 words`)
        }
    }
    const price = String(html).split(/<p>\s*<strong>Price and plans<\/strong>\s*<\/p>/)[1]
    if (price !== undefined && !/<p>|<li>/.test(price)) problems.push("the price and plans need a sentence or a list")
    const plain = text(html)
    if (/,\s*not\s+\w|\s[—–-]\s*not\s|\bnot (just |only )?[^.,;]{1,60},? but\b|\bisn't [^.;]{1,40}; it's\b/i.test(plain)) problems.push(`it uses an "X, not Y" construction`)
    const hype = plain.match(/\b(game[- ]changer|unlock|leverag\w*|supercharg\w*|seamless\w*|robust|in today's fast-paced)\b/i)
    if (hype) problems.push(`"${hype[0]}"`)
    for (const n of new Set(plain.match(/\$?\d[\d,.]*\+?%?/g) ?? [])) {
        const bare = n.replace(/[.,]$/, "")
        if (/^\d{1,2}$/.test(bare) && Number(bare) <= 20) continue
        if (!facts.includes(bare.replace(/^\$/, "")) && !facts.includes(bare)) problems.push(`"${bare}" isn't in the fact sheet`)
    }
    // Headings, labels, lead-ins and the price and plans are the same facts in every review of a
    // tool ("5. HubSpot Service Hub", "No free plan:", "Growth: $29 per user, per month"), so they
    // don't count toward the uniqueness check.
    const shared = sharedRuns(uniquePart(html), others.map(o => text(uniquePart(o))))
    if (shared.length) problems.push(`${shared.length} runs of 8 words appear in other reviews, e.g. "${shared[0]}"`)
    problems.push(...checkPost(html.replace(/<p>\s*<br>\s*<\/p>/g, ""), { embeds: new Map([...html.matchAll(/⟦embed:([\w-]+)⟧/g)].map(m => [m[1], ""])), paths: { has: () => true } }))
    return [...new Set(problems)]
}
