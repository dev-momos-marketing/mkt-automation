// Internal links between blog posts and to glossary terms. Each target gets anchor phrases from its
// slug and title ("best-restaurant-loyalty-software" → "restaurant loyalty software"), and a post gets
// a few links where those phrases appear in its text. Pure functions, used by links.mjs.

// Words that don't describe the topic, dropped from slugs and titles.
const NOISE = new Set(["best", "top", "the", "a", "an", "your", "copy", "guide", "practical", "complete"])

// The phrases a page can be linked from: its slug and its title, cleaned, 2 to 5 words.
export function phrasesFor({ slug, title = "" }) {
    const fromSlug = slug.replace(/\(.*?\)/g, " ").split("-")
    const fromTitle = title.split(/[:?|–—]/)[0].replace(/\(.*?\)/g, " ").split(/\s+/)
    const phrases = new Set()
    for (const words of [fromSlug, fromTitle]) {
        let kept = words.map(w => w.toLowerCase().replace(/[^a-z0-9&'-]/g, "")).filter(w => w && !/^\d+$/.test(w) && !NOISE.has(w))
        // "How Does AI Benefit…", "How To Respond…": a question isn't an anchor.
        if (["how", "what", "why", "does", "is"].includes(kept[0])) continue
        while (kept.length && ["for", "in", "of", "to", "and"].includes(kept.at(-1))) kept = kept.slice(0, -1)
        while (kept.length && ["for", "in", "of", "to", "and"].includes(kept[0])) kept = kept.slice(1)
        if (kept.length >= 2 && kept.length <= 5) phrases.add(kept.join(" "))
    }
    return [...phrases]
}

// Phrase → target. A phrase two targets share is ambiguous, unless one is a glossary term: then the
// glossary (the definition) wins over a blog post.
export function buildTargets(pages) {
    const byPhrase = new Map()
    for (const page of pages) {
        for (const phrase of phrasesFor(page)) byPhrase.set(phrase, [...(byPhrase.get(phrase) ?? []), page])
    }
    const targets = new Map()
    for (const [phrase, list] of byPhrase) {
        const unique = [...new Map(list.map(p => [p.url, p])).values()]
        const glossary = unique.filter(p => p.kind === "glossary")
        if (unique.length === 1) targets.set(phrase, unique[0])
        else if (glossary.length === 1) targets.set(phrase, glossary[0])
    }
    // Longest phrases first, so "restaurant reputation management software" beats "reputation management".
    return new Map([...targets].sort((a, b) => b[0].length - a[0].length))
}

// The pages a piece of HTML already links to, as "/blog/slug" and "/glossary/slug".
export function linkedPaths(html) {
    const out = new Set()
    for (const m of String(html).matchAll(/<a\b[^>]*href="([^"]+)"/gi)) {
        const path = m[1].replace(/^https?:\/\/(www\.)?momos\.com/, "").replace(/^\.\.\//, "/").replace(/^\.\//, "/blog/").replace(/\/$/, "")
        const section = path.match(/^\/(blog|glossary)\/([^/?#]+)/)
        if (section) out.add(`/${section[1]}/${section[2]}`)
    }
    return out
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Adds up to `max` links to a post's HTML: in paragraphs only (never headings, embed lines or existing
// links), at most one per paragraph, each target once, never to the post itself or to a page it
// already links to. Returns the new HTML and the links added, each with the sentence around it.
export function addLinks(html, targets, { self, max = 4 }) {
    const used = linkedPaths(html)
    used.add(self)
    const added = []
    const out = String(html).replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, block => {
        if (added.length >= max || /⟦embed:/.test(block)) return block
        const tokens = block.split(/(<[^>]+>)/)
        let depth = 0
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]
            if (/^<a\b/i.test(token)) depth++
            else if (/^<\/a>/i.test(token)) depth = Math.max(0, depth - 1)
            if (token.startsWith("<") || depth > 0 || !token.trim()) continue
            for (const [phrase, target] of targets) {
                if (used.has(target.url)) continue
                const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${phrase.split(" ").map(escapeRegExp).join("\\s+")})(?![\\p{L}\\p{N}])`, "iu")
                const match = token.match(pattern)
                if (!match) continue
                tokens[i] = `${token.slice(0, match.index)}<a href="${target.url}">${match[1]}</a>${token.slice(match.index + match[1].length)}`
                used.add(target.url)
                const text = tokens.join("").replace(/<[^>]+>/g, "")
                const at = text.indexOf(match[1])
                added.push({ phrase: match[1], url: target.url, context: `…${text.slice(Math.max(0, at - 60), at + match[1].length + 60).trim()}…` })
                return tokens.join("")
            }
        }
        return block
    })
    return { html: out, added }
}
