// Checks for a post body written in this repo (posts/<slug>.html) before write.mjs saves it to
// Framer. Pure functions, used by write.mjs and the tests.

const BLOCKS = ["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "a", "blockquote"]

// Everything that would break the post or the page: unbalanced tags, embed lines the post has no
// code for, and links to pages that don't exist. `embeds` is the post's Embeds field (id → code),
// `paths` every page on the site ("/blog/slug", "/glossary/slug", "/rockie").
export function checkPost(html, { embeds, paths }) {
    const problems = []
    const open = []
    for (const m of html.matchAll(/<(\/?)([a-z0-9]+)\b[^>]*?(\/?)>/gi)) {
        const [, closing, name, selfClosing] = m
        const tag = name.toLowerCase()
        if (selfClosing || ["br", "img", "hr"].includes(tag)) continue
        if (!BLOCKS.includes(tag)) problems.push(`<${tag}> isn't used in blog posts`)
        else if (!closing) open.push(tag)
        else if (open.at(-1) === tag) open.pop()
        else problems.push(`</${tag}> doesn't close <${open.at(-1) ?? "nothing"}>`)
    }
    if (open.length) problems.push(`<${open.join(">, <")}> never closed`)
    if (/<h1\b/i.test(html)) problems.push("the post's title is its H1, so the body starts at H2")

    for (const m of html.matchAll(/⟦embed:([A-Za-z0-9_-]+)⟧/g)) {
        if (!embeds.has(m[1])) problems.push(`embed ${m[1]} isn't in the post's Embeds field`)
    }
    const seen = new Set()
    for (const m of html.matchAll(/<a\b[^>]*href="([^"]*)"/gi)) {
        const href = m[1]
        if (/^https?:\/\//.test(href)) continue
        const path = href.replace(/[?#].*$/, "").replace(/\/$/, "")
        if (!path.startsWith("/")) problems.push(`link "${href}" should start with / (e.g. /blog/slug)`)
        else if (!paths.has(path)) problems.push(`link "${href}" goes to a page that doesn't exist`)
        if (seen.has(path)) problems.push(`"${href}" is linked twice`)
        seen.add(path)
    }
    return [...new Set(problems)]
}

// The embed lines in a post's HTML, in order.
export function embedLines(html) {
    return [...String(html ?? "").matchAll(/⟦embed:([A-Za-z0-9_-]+)⟧/g)].map(m => m[1])
}
