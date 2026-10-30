// Replacing an embed in a post with native text: replacements/<slug>/<ID>.html holds the HTML that
// takes the place of the post's ⟦embed:ID⟧ line, and replacements/<slug>/embeds/<NEW>.html any
// smaller embeds it refers to (e.g. the table that followed a list). Pure functions, used by
// replace-embeds.mjs and the tests.

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The post's HTML with the embed line for `id` replaced, and whether the line was there.
export function replaceMarker(html, id, replacement) {
    const line = new RegExp(`<p\\b[^>]*>\\s*⟦embed:${escapeRegExp(id)}⟧\\s*</p>`)
    const found = line.test(html)
    return { html: found ? html.replace(line, () => replacement.trim().replace(/>\s*\n\s*</g, "><")) : html, found }
}

// Whether any translation of the post's Content still shows the embed: its code has to stay in the
// Embeds field until that translation is updated.
export function usedByTranslation(valueByLocale, id) {
    return Object.values(valueByLocale ?? {}).some(v => String(v?.value ?? "").includes(`⟦embed:${id}⟧`))
}
