// FAQ sections for blog posts: faqs/<slug>.json holds a post's FAQ, which faqs.mjs adds to the end of
// its Content in Framer. Pure functions, used by faqs.mjs and the tests.
//
//   { "heading": "Restaurant Guest Experience: FAQ",
//     "questions": [{ "q": "What is restaurant guest experience?", "a": "Two to four sentences." }] }

const escape = text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// A heading that marks a post's FAQ section ("…: FAQ", "Frequently asked questions").
export const FAQ_HEADING = /<h[2-4]\b[^>]*>[^<]*(\bFAQs?\b|frequently asked|common questions)/i

export function faqHtml({ heading, questions }) {
    return [`<h2>${escape(heading)}</h2>`, ...questions.flatMap(({ q, a }) => [`<h3>${escape(q)}</h3>`, `<p>${escape(a)}</p>`])].join("")
}

// Everything that breaks the house style (see .claude/skills/blog-writing). `postText` is the post's
// text: a number in an answer must appear in it, so the FAQ never adds a figure the post doesn't have.
export function checkFaq(faq, postText = "") {
    const problems = []
    const questions = faq?.questions ?? []
    if (!/\bFAQ\b/.test(faq?.heading ?? "")) problems.push(`the heading "${faq?.heading}" should end in ": FAQ"`)
    if (questions.length < 4 || questions.length > 6) problems.push(`${questions.length} questions (4 to 6)`)
    const seen = new Set()
    for (const { q = "", a = "" } of questions) {
        if (!q.trim().endsWith("?")) problems.push(`"${q}" isn't a question`)
        if (seen.has(q.toLowerCase())) problems.push(`"${q}" is asked twice`)
        seen.add(q.toLowerCase())
        const sentences = a.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).filter(Boolean).length
        const words = a.split(/\s+/).filter(Boolean).length
        if (sentences < 2 || sentences > 4 || words > 90) problems.push(`the answer to "${q}" has ${sentences} sentences and ${words} words (2–4 sentences, at most 90 words)`)
        if (/<[a-z]/i.test(q + a)) problems.push(`"${q}" contains HTML`)
        for (const text of [q, a]) {
            if (/,\s*not\s+\w|\s[—–-]\s*not\s|\bnot (just |only )?[^.,;]{1,60},? but\b|\bisn't [^.;]{1,40}; it's\b/i.test(text)) problems.push(`"${text.slice(0, 60)}…" uses an "X, not Y" construction`)
            const hype = text.match(/\b(game[- ]changer|unlock|leverag\w*|supercharg\w*|seamless\w*|robust|in today's fast-paced)\b/i)
            if (hype) problems.push(`"${hype[0]}" in "${text.slice(0, 60)}…"`)
        }
        for (const n of a.match(/\d[\d,.]*%?/g) ?? []) {
            if (!postText.includes(n.replace(/[.,]$/, ""))) problems.push(`the answer to "${q}" has "${n}", which isn't in the post`)
        }
    }
    return problems
}
