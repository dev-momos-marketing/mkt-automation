// Fixing dead links in CMS text: link-fixes.json lists each dead link and what replaces it (a path
// on the site, or null to remove the link and keep its text). Pure functions, used by fix-links.mjs
// and the tests.

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// A link on the site ("/blog/x") matches it written any way: "/blog/x", "/blog/x/",
// "https://momos.com/blog/x", "https://www.momos.com/blog/x?utm=1". A link to another site matches
// with or without its trailing slash. Query strings and #anchors are kept.
function matcher(from) {
    const path = escapeRegExp(from.replace(/\/$/, ""))
    return from.startsWith("/")
        ? new RegExp(`^(https?://(?:www\\.)?momos\\.com)?${path}/?(?=$|[?#])`, "i")
        : new RegExp(`^${path}/?(?=$|[?#])`, "i")
}

export function compileFixes(list) {
    return list.map(({ from, to }) => {
        if (typeof from !== "string" || !from) throw new Error(`A fix without "from": ${JSON.stringify({ from, to })}`)
        if (to !== null && (typeof to !== "string" || !to)) throw new Error(`"${from}": "to" must be a link or null (remove the link).`)
        return { from, to, re: matcher(from) }
    })
}

// The new href for `href`, or undefined if no fix applies; null means "remove the link".
function rewrite(href, fixes) {
    for (const fix of fixes) {
        const m = href.match(fix.re)
        if (!m) continue
        if (fix.to === null) return { fix, href: null }
        const prefix = fix.to.startsWith("/") ? (m[1] ?? "") : ""
        return { fix, href: prefix + fix.to + href.slice(m[0].length) }
    }
}

// The text with every dead link fixed: in <a href> tags (a removed link keeps its text), and a
// value that is only a URL (a Link field). `changes` lists each fix made; `left` the values that
// are a dead URL with no link to remove (a Link field whose fix is null), for a person to check.
export function fixLinks(text, fixes) {
    const changes = []
    const left = []
    if (typeof text !== "string" || !text) return { text, changes, left }
    let out = text.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (whole, attrs, inner) => {
        const attr = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)
        if (!attr) return whole
        const found = rewrite(attr[2].trim(), fixes)
        if (!found) return whole
        changes.push({ from: attr[2].trim(), to: found.href })
        if (found.href === null) return inner
        return `<a${attrs.replace(attr[0], () => `href=${attr[1]}${found.href}${attr[1]}`)}>${inner}</a>`
    })
    if (!out.includes("<")) {
        const found = rewrite(out.trim(), fixes)
        if (found?.href === null) left.push(out.trim())
        else if (found) {
            changes.push({ from: out.trim(), to: found.href })
            out = found.href
        }
    }
    return { text: out, changes, left }
}
