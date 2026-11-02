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

// The labels a review uses, in order ("What you can do with X:" counts as "What you can do with").
export function labels(html) {
    return [...String(html).matchAll(/<strong>([^<:]{2,60}):?<\/strong>:?/g)].map(m => m[1].trim())
        .map(l => l.replace(/^(What you can do with|Why) .*?( stands out)?$/, (_, a, b) => a + (b ? " … stands out" : "")))
        .filter(l => /^(Notable customers|What's new|What you can do with|Why … stands out|It's best for|Pricing|Website|Category|Key features)$/.test(l))
}

// Runs of 8 words shared with any of `others` (other reviews' text).
export function sharedRuns(html, others, n = 8) {
    const grams = t => { const w = words(t); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" ")); return out }
    const mine = grams(text(html))
    const theirs = new Set(others.flatMap(o => [...grams(o)]))
    return [...mine].filter(g => theirs.has(g))
}

// Everything that breaks the rules for a rewritten review. `original` is the section it replaces,
// `facts` the tool's fact sheet (a number must appear in it), `others` other reviews' text.
export function checkReview(html, { original, facts = "", others = [] }) {
    const problems = []
    const [orig] = sections(original), [mine] = sections(html)
    if (!orig || mine.heading !== orig.heading) problems.push(`the heading should stay "${orig?.heading}", it's "${mine?.heading}"`)
    for (const src of String(original).match(/<img\b[^>]*\bsrc="([^"?]+)/g)?.map(s => s.match(/src="([^"?]+)/)[1]) ?? []) {
        if (!html.includes(src)) problems.push(`the image ${src} is missing`)
    }
    for (const m of String(original).matchAll(/⟦embed:([\w-]+)⟧/g)) if (!html.includes(m[0])) problems.push(`the embed ${m[1]} is missing`)
    // Framer stores links to the site as relative paths ("../blog/x"), so compare them as paths.
    const norm = href => href.replace(/^https?:\/\/(www\.)?momos\.com/, "").replace(/^\.\.\//, "/").replace(/^\.\//, "/blog/").replace(/\/$/, "")
    const mineLinks = new Set([...String(html).matchAll(/href="([^"]+)"/g)].map(m => norm(m[1])))
    for (const m of String(original).matchAll(/href="([^"]+)"/g)) if (!mineLinks.has(norm(m[1]))) problems.push(`the link ${m[1]} is missing`)

    const want = labels(original).filter(l => !["Notable customers", "What's new"].includes(l))
    const at = want.indexOf("What you can do with") >= 0 ? want.indexOf("What you can do with") : want.indexOf("Key features")
    if (at >= 0) want.splice(at, 0, "Notable customers", "What's new")
    if (want.length && labels(html).join("|") !== want.join("|")) problems.push(`the labels should be ${want.join(" → ")}, they are ${labels(html).join(" → ") || "none"}`)

    const list = html.match(/<strong>(?:What you can do with[^<]*|Key features):?<\/strong>:?\s*<\/p>\s*<ul>([\s\S]*?)<\/ul>/)
    if (want.length && !list) problems.push("the features should be a <ul> right after the \"What you can do with …:\" line")
    if (list) {
        const items = [...list[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1])
        if (items.length < 4 || items.length > 6) problems.push(`${items.length} features (4 to 6)`)
        for (const item of items) {
            if (!/^\s*<strong>[^<]+<\/strong>/.test(item)) problems.push(`the feature "${text(item).slice(0, 40)}…" should start with a bold lead-in`)
            if (words(text(item)).length > 40) problems.push(`the feature "${text(item).slice(0, 40)}…" is longer than 40 words`)
        }
    }
    const plain = text(html)
    if (/,\s*not\s+\w|\s[—–-]\s*not\s|\bnot (just |only )?[^.,;]{1,60},? but\b|\bisn't [^.;]{1,40}; it's\b/i.test(plain)) problems.push(`it uses an "X, not Y" construction`)
    const hype = plain.match(/\b(game[- ]changer|unlock|leverag\w*|supercharg\w*|seamless\w*|robust|in today's fast-paced)\b/i)
    if (hype) problems.push(`"${hype[0]}"`)
    for (const n of new Set(plain.match(/\$?\d[\d,.]*\+?%?/g) ?? [])) {
        const bare = n.replace(/[.,]$/, "")
        if (/^\d{1,2}$/.test(bare) && Number(bare) <= 20) continue
        if (!facts.includes(bare.replace(/^\$/, "")) && !facts.includes(bare)) problems.push(`"${bare}" isn't in the fact sheet`)
    }
    const shared = sharedRuns(html, others)
    if (shared.length) problems.push(`${shared.length} runs of 8 words appear in other reviews, e.g. "${shared[0]}"`)
    problems.push(...checkPost(html.replace(/<p>\s*<br>\s*<\/p>/g, ""), { embeds: new Map([...html.matchAll(/⟦embed:([\w-]+)⟧/g)].map(m => [m[1], ""])), paths: { has: () => true } }))
    return [...new Set(problems)]
}
