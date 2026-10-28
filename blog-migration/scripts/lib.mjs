import { createHash } from "node:crypto"

export const COLLECTION = process.env.BLOG_COLLECTION || "Blog"
// The fields the setup adds and the migration fills in.
export const FIELD_NAMES = {
    content: process.env.BLOG_CONTENT_FIELD || "Content",
    embeds: process.env.BLOG_EMBEDS_FIELD || "Embeds",
    migrated: process.env.BLOG_MIGRATED_FIELD || "Migrated",
}
// The blog post template's path in Framer, if it can't be found on its own (e.g. "/blog/:slug").
export const TEMPLATE_PATH = process.env.BLOG_TEMPLATE_PATH || ""

export async function openProject() {
    const projectUrl = process.env.FRAMER_PROJECT_URL
    if (!projectUrl) {
        throw new Error("Set FRAMER_PROJECT_URL to the project's URL (https://framer.com/projects/...).")
    }
    if (!process.env.FRAMER_API_KEY) {
        throw new Error("Set FRAMER_API_KEY (Framer → Site Settings → General → API keys).")
    }
    const { connect } = await import("framer-api")
    return connect(projectUrl)
}

// Opens a connection, runs fn with it and always disconnects. Reading the page tree and the
// collection over one connection can crash it, so each part gets its own.
export async function withProject(fn) {
    const framer = await openProject()
    try {
        return await fn(framer)
    } finally {
        await framer.disconnect()
    }
}

// "Section Title 12" → { group: "Section Title", n: 12 }. Fields without a trailing number → null.
export function numbered(name) {
    const m = String(name ?? "").trim().match(/^(.*?)[\s_-]*(\d+)$/)
    return m ? { group: m[1].trim() || "#", n: Number(m[2]) } : null
}

// The layer names the template uses for its blocks: "Section 8".
export function isSectionName(name) {
    return /^section\s*\d+$/i.test(String(name ?? "").trim())
}

// Framer's built-in Embed, or any component that takes HTML or a URL to embed.
export function isEmbed({ name, componentName, controls }) {
    if (/embed/i.test(componentName ?? "") || /embed/i.test(name ?? "")) return true
    return typeof controls?.html === "string"
}

// An embed's code. Framer can keep a property in `controls` or, with its type, in `typedControls`,
// and its value can be typed in or linked to a variable. A link is reported in `bound`.
export function embedInfo(controls = {}, typedControls = {}) {
    const read = key => {
        const typed = typedControls?.[key]?.value
        for (const value of [controls?.[key], typed]) {
            if (typeof value === "string") return { value }
        }
        for (const value of [controls?.[key], typed]) {
            if (value && typeof value === "object") return { value: "", bound: describeBinding(key, value) }
        }
        return { value: "" }
    }
    let html = read("html")
    let url = read("url")
    // Unknown property names: take the first text property that looks like HTML or a link.
    if (!html.value && !url.value && !html.bound && !url.bound) {
        for (const [key, value] of Object.entries({ ...controls, ...Object.fromEntries(Object.entries(typedControls ?? {}).map(([k, c]) => [k, c?.value])) })) {
            if (typeof value !== "string") continue
            if (/<[a-z!][^>]*>/i.test(value)) { html = { value, key }; break }
            if (/^https?:\/\//.test(value.trim())) { url = { value, key }; break }
        }
    }
    const type = typedControls?.type?.value ?? controls?.type
    const mode = typeof type === "string" && ["html", "url"].includes(type) ? type : html.value ? "html" : url.value ? "url" : "unknown"
    const content = mode === "url" ? url.value : html.value
    return {
        mode,
        url: url.value,
        html: html.value,
        bound: [html.bound, url.bound].filter(Boolean).join("; "),
        hash: content ? hash(content) : "",
    }
}

function describeBinding(key, value) {
    const kind = value.type ?? value.__class ?? "value"
    const name = value.name ?? value.id ?? ""
    return `${key} → ${kind}${name ? ` "${name}"` : ""}`
}

// The property names and value types of a component, for working out where Framer keeps its data.
export function controlShape(controls = {}, typedControls = {}) {
    const typeOf = v => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v === "object" ? `object(${Object.keys(v).slice(0, 6).join(",")})` : typeof v)
    return {
        controls: Object.fromEntries(Object.entries(controls ?? {}).map(([k, v]) => [k, typeOf(v)])),
        typedControls: Object.fromEntries(Object.entries(typedControls ?? {}).map(([k, c]) => [k, `${c?.type ?? "?"}: ${typeOf(c?.value)}`])),
    }
}

export function hash(text) {
    return createHash("sha256").update(text).digest("hex").slice(0, 10)
}

// A one-line, human-readable hint of what an embed or a field holds.
export function preview(html, length = 90) {
    const text = String(html ?? "")
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

// Whether a CMS field value counts as filled in.
export function isFilled(entry) {
    const value = entry?.value
    if (value == null || value === false) return false
    if (typeof value === "string") return preview(value, 1e9) !== "" || /<(img|iframe|video|figure)\b/i.test(value)
    if (Array.isArray(value)) return value.length > 0
    return true
}

// Locales with a translation in this field entry.
export function translatedLocales(entry, localeCodes) {
    return Object.entries(entry?.valueByLocale ?? {})
        .filter(([, v]) => v && v.status !== "new")
        .map(([id]) => localeCodes.get(id) ?? id)
}

export function csv(rows, columns) {
    const cell = v => {
        const s = Array.isArray(v) ? v.join(", ") : String(v ?? "")
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    return `${[columns, ...rows.map(r => columns.map(c => r[c]))].map(r => r.map(cell).join(",")).join("\n")}\n`
}

// Posts whose slug or title appears in an embed's HTML or URL: a hint for who it belongs to.
export function guessPosts(content, posts) {
    const text = String(content ?? "").toLowerCase()
    if (!text) return []
    return posts
        .filter(p => (p.slug.length > 6 && text.includes(p.slug.toLowerCase())) || (p.title.length > 12 && text.includes(p.title.toLowerCase())))
        .map(p => p.slug)
}

// The CMS page(s) that show the blog's posts: the path given, else pages linked to the collection,
// else the CMS page under the blog's own route ("/blog/:slug").
export function findTemplatePages(pages, { collectionId, path = "", route = "/blog" }) {
    if (path) return pages.filter(p => p.path === path)
    const linked = pages.filter(p => collectionId && p.collectionId === collectionId)
    if (linked.length) return linked
    return pages.filter(p => new RegExp(`^${route}/:[^/]+$`).test(p.path ?? ""))
}

// Splits items into batches of at most `maxBytes` of JSON and `maxItems` items, keeping their order.
// An item bigger than maxBytes goes in a batch of its own.
export function batchesBySize(items, maxBytes, maxItems = Infinity) {
    const batches = []
    let batch = []
    let size = 0
    for (const item of items) {
        const bytes = Buffer.byteLength(JSON.stringify(item))
        if (batch.length && (size + bytes > maxBytes || batch.length >= maxItems)) {
            batches.push(batch)
            batch = []
            size = 0
        }
        batch.push(item)
        size += bytes
    }
    if (batch.length) batches.push(batch)
    return batches
}
