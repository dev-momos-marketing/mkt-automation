// How one post becomes one field: its Section Title N / Section N pairs in order, with the post's own
// embeds where the template showed them. Pure functions, used by the dry run and, later, the migration.
import { numbered } from "./lib.mjs"

// Each embed is a line in the text that the BlogEmbeds component on the template replaces with the
// embed (Framer's API can't put a component inside rich text).
export const marker = id => `<p>⟦embed:${id}⟧</p>`
export const MARKER = /<p>⟦embed:([A-Za-z0-9_-]+)⟧<\/p>/g

// Section number → its title and body fields.
export function sectionFields(fields) {
    const sections = new Map()
    for (const field of fields) {
        const n = numbered(field.name)
        if (!n || !["section title", "section"].includes(n.group.toLowerCase())) continue
        const entry = sections.get(n.n) ?? {}
        entry[n.group.toLowerCase() === "section" ? "body" : "title"] = field
        sections.set(n.n, entry)
    }
    return new Map([...sections].sort((a, b) => a[0] - b[0]))
}

// A field's value in a language, and whether it's really translated. Framer shows the English value
// wherever a translation is missing (null), so the merge does the same.
export function localized(entry, localeId) {
    const english = typeof entry?.value === "string" ? entry.value : ""
    if (!localeId) return { value: english, translated: true }
    const value = entry?.valueByLocale?.[localeId]?.value
    return typeof value === "string" ? { value, translated: true } : { value: english, translated: false }
}

const escapeHtml = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// A section title as an <h2>. Plain-text fields are escaped; rich-text fields lose their own tags.
export function titleHtml(value, type) {
    const text = type === "string" ? escapeHtml(value.trim()) : value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    return text ? `<h2>${text}</h2>` : ""
}

export function isEmptyHtml(html) {
    return !html || !html.replace(/<(br|p|div|span)\b[^>]*>|<\/(p|div|span)>|&nbsp;|\s/gi, "")
}

// The section an embed belongs to: "Section 8" (inside it) and "after Section 7" (between sections)
// → 8 and 7.
export function sectionOf(place) {
    const m = String(place ?? "").match(/section\s*(\d+)/i)
    return m ? Number(m[1]) : null
}

// Builds one post's body in one language. `embeds` are the post's own, in template order. An embed
// inside a section the post leaves empty is left out: Framer hides the empty section, embed and all,
// so it isn't on the live page either.
export function mergePost({ fieldData, sections, embeds = [], localeId = null }) {
    const byPlace = new Map()
    const unplaced = []
    for (const e of embeds) {
        const n = sectionOf(e.place)
        if (n == null) unplaced.push(e)
        else byPlace.set(n, [...(byPlace.get(n) ?? []), e])
    }

    const parts = []
    const warnings = []
    const used = []
    const skipped = []
    let filled = 0
    let translated = 0
    const last = Math.max(0, ...sections.keys(), ...byPlace.keys())
    for (let n = 1; n <= last; n++) {
        const { title: titleField, body: bodyField } = sections.get(n) ?? {}
        const title = titleField ? localized(fieldData[titleField.id], localeId) : null
        const body = bodyField ? localized(fieldData[bodyField.id], localeId) : null
        const titleBlock = title ? titleHtml(title.value, titleField.type) : ""
        const bodyBlock = body && !isEmptyHtml(body.value) ? body.value.trim() : ""
        if (titleBlock || bodyBlock) {
            filled++
            if ((!title || title.translated || !titleBlock) && (!body || body.translated || !bodyBlock)) translated++
            parts.push(titleBlock, bodyBlock)
        }
        for (const e of byPlace.get(n) ?? []) {
            const inside = !/^after\b/i.test(e.place)
            if (inside && !titleBlock && !bodyBlock) {
                warnings.push(`embed ${e.id} left out: it sits in Section ${n}, which this post leaves empty, so the live page doesn't show it either`)
                skipped.push(e.id)
                continue
            }
            parts.push(marker(e.id))
            used.push(e.id)
        }
    }
    for (const e of unplaced) {
        warnings.push(`embed ${e.id} has no section ("${e.place}"); put at the end`)
        parts.push(marker(e.id))
        used.push(e.id)
    }
    return { html: parts.filter(Boolean).join("\n"), sections: filled, translatedSections: translated, embeds: used, skipped, warnings }
}

export function wordCount(html) {
    const text = html.replace(MARKER, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").trim()
    if (!text) return 0
    // Japanese has no spaces: count its characters instead of words.
    const cjk = (text.match(/[぀-ヿ一-龯]/g) ?? []).length
    return cjk > text.length / 4 ? cjk : text.split(/\s+/).length
}

// The Embeds field: each embed's code, in the post's language, as a block the BlogEmbeds component
// on the template reads. A <template> keeps the code inert until the component places it.
export function embedsField(entries) {
    return entries.map(({ id, html }) => {
        if (/<\/template\b/i.test(html)) throw new Error(`Embed ${id} contains </template>, which would end its block early.`)
        return `<template data-embed="${id}">\n${html.trim()}\n</template>`
    }).join("\n")
}

// The reverse, as the BlogEmbeds component does it.
export function parseEmbedsField(text) {
    const out = new Map()
    for (const m of String(text ?? "").matchAll(/<template data-embed="([A-Za-z0-9_-]+)">\n?([\s\S]*?)\n?<\/template>/g)) out.set(m[1], m[2])
    return out
}

// Everything the migration writes to one post: Content and Embeds in English, with each translation
// where every section of the post is translated (otherwise that language keeps showing English, as
// Framer does for a missing translation), and Migrated switched on.
// `embeds` are the post's own, each with its code by language: { id, place, code: { en, "fr-CA" } }.
export function buildPost({ fieldData, sections, embeds, locales }) {
    const codeIn = (e, lang) => e.code[lang] ?? e.code[lang.split("-")[0]] ?? e.code.en
    const english = mergePost({ fieldData, sections, embeds })
    const placed = embeds.filter(e => english.embeds.includes(e.id))
    const content = { value: english.html, valueByLocale: {} }
    const embedCode = { value: embedsField(placed.map(e => ({ id: e.id, html: e.code.en }))), valueByLocale: {} }
    const languages = []
    const untranslated = []
    for (const { id, code } of locales) {
        const merged = mergePost({ fieldData, sections, embeds, localeId: id })
        if (merged.sections && merged.translatedSections < merged.sections) {
            untranslated.push(`${code} (${merged.translatedSections}/${merged.sections} sections)`)
            continue
        }
        content.valueByLocale[id] = { action: "set", value: merged.html }
        embedCode.valueByLocale[id] = { action: "set", value: embedsField(placed.map(e => ({ id: e.id, html: codeIn(e, code) }))) }
        languages.push(code)
    }
    return { content, embeds: embedCode, english, languages, untranslated }
}
