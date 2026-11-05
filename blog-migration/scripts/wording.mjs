// Brand wording for CMS text, from the Momos Marketing Brand Guide (01 · tone of voice): guests,
// not customers; agent, never assistant or copilot; resolves, not replies; sentence case.
// glossary-wording.json holds the edits, each an exact phrase chosen by hand (a "customer" in a
// quoted study, another company's policy, an industry name or a search-style FAQ stays as it is).
// Pure functions, used by glossary-wording.mjs and the tests. Only text between tags changes,
// never a tag, attribute or link.

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const ENTITIES = { "&#x27;": "'", "&#39;": "'", "&apos;": "'", "&quot;": '"', "&amp;": "&", "&nbsp;": " " }
const decode = s => s.replace(/&#x27;|&#39;|&apos;|&quot;|&amp;|&nbsp;/g, m => ENTITIES[m])
const encode = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;")

// The term's name in sentence case, if the article itself writes it that way mid-sentence:
// "Review Velocity" → "Review velocity" because the text says "review velocity"; "Net Promoter
// Score" stays, because it's in `keepNames`. Abbreviations and the first word keep their case;
// "Closed-Loop" → "Closed-loop".
export function sentenceCaseTitle(title, text, keepNames = []) {
    const kept = new Set()
    for (const name of keepNames) {
        const at = title.indexOf(name)
        if (at < 0) continue
        const start = title.slice(0, at).split(" ").length - 1
        name.split(" ").forEach((_, k) => kept.add(start + k))
    }
    const isAbbreviation = w => { const letters = w.replace(/[^A-Za-z]/g, "").replace(/s$/, ""); return letters.length >= 2 && letters === letters.toUpperCase() }
    const words = title.split(" ")
    const lowered = words.map((w, i) => kept.has(i) || isAbbreviation(w) ? w : w.split("-").map((part, k) => i === 0 && k === 0 ? part : part.toLowerCase()).join("-"))
    const proposal = lowered.join(" ")
    if (proposal === title) return title
    // The words that change must appear in that lowercase form in the text, as a phrase.
    const changed = words.map((w, i) => w !== lowered[i] ? i : -1).filter(i => i >= 0)
    const phrase = lowered.slice(Math.min(...changed), Math.max(...changed) + 1).join(" ").replace(/\s*\(.*$/, "")
    if (!phrase) return title
    // The phrase's first letter may be either case ("Closed-loop" is written "closed-loop").
    const pattern = `[${phrase[0].toUpperCase()}${phrase[0].toLowerCase()}]${escapeRegExp(phrase.slice(1))}`
    return new RegExp(`(^|[^A-Za-z])${pattern}([^A-Za-z]|$)`).test(text) ? proposal : title
}

// Rewrites the text of `html` (or plain text): the phrase edits, then the term's name from Title
// Case to sentence case (term = {from, to}) in headings and short labels. Returns the new html and each changed text, before
// and after.
export function applyWording(html, { phrases = [], term } = {}) {
    const changes = []
    if (typeof html !== "string" || !html) return { html, changes }
    const termRe = term && term.from !== term.to ? new RegExp(`(^|[^A-Za-z])${escapeRegExp(term.from)}(?=[^A-Za-z]|$)`, "g") : null
    // Script and style blocks (a calculator's code holds "<" and ">") and comments are kept whole.
    let inHeading = false
    const out = html.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]*>)/i).map((part, index) => {
        if (index % 2 === 1) {
            if (/^<h[1-6]\b/i.test(part)) inHeading = true
            else if (/^<\/h[1-6]/i.test(part)) inHeading = false
            return part
        }
        if (!part.trim()) return part
        const before = decode(part)
        let text = before
        const rules = []
        for (const { find, replace } of phrases) {
            const next = text.split(find).join(replace)
            if (next !== text) { text = next; rules.push("phrase") }
        }
        // The term's name changes only in headings and short labels ("Review Velocity at a glance",
        // a FAQ question, a card title), never in running text, where the same words can be a
        // book title or another company's product ("his 1987 book Moments of Truth").
        if (termRe && (inHeading || (text.trim().length <= 90 && !/[.!]\s*\S/.test(text.trim())))) {
            // At the start of a text it stays capitalized ("Review velocity at a glance"); inside a
            // sentence it's lowercase ("What is review velocity?").
            const startsSentence = (at, lead, all) => /(^|[.!?:]\s*)$/.test(all.slice(0, at) + lead) && /^\s*$|[.!?:]\s*$/.test(all.slice(0, at) + lead)
            // "AI review response" keeps its capitals anywhere; a quoted title ("The Voice of the
            // Customer", a paper) is left as it is.
            const lowerFirst = /^[A-Z]{2}/.test(term.to) ? term.to : term.to[0].toLowerCase() + term.to.slice(1)
            // Followed by a year or more Title Case words, the name is part of a book's title
            // ("Moments of Truth (1987)", "Sentiment Analysis and Opinion Mining"): left as it is.
            const inTitle = (at, m, all) => /["“'‘](The )?$/.test(all.slice(0, at + m.length - term.from.length)) ||
                /^\s*\(\d{4}\)|^\s+((and|of|the|for|&)\s+)?[A-Z][a-z]/.test(all.slice(at + m.length))
            const next = text.replace(termRe, (m, lead, at, all) =>
                inTitle(at, m, all) ? m : lead + (startsSentence(at, lead, all) ? term.to : lowerFirst))
            if (next !== text) { text = next; rules.push("sentence case") }
        }
        if (text === before) return part
        changes.push({ rule: [...new Set(rules)].join(", "), before, after: text })
        return encode(text)
    })
    return { html: out.join(""), changes }
}

// The config file's edits, checked: every phrase has text to find and its replacement.
export function compileRules(config) {
    for (const p of config.phrases ?? []) {
        if (typeof p.find !== "string" || !p.find || typeof p.replace !== "string") throw new Error(`A phrase edit needs "find" and "replace": ${JSON.stringify(p)}`)
    }
    return { phrases: config.phrases ?? [], keepNames: config.keepNames ?? [] }
}
