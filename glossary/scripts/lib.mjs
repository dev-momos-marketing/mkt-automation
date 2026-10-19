import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { parse as parseYaml } from "yaml"

export const TERMS_DIR = new URL("../terms/", import.meta.url)
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

export async function loadConfig() {
    const url = new URL("../glossary.config.json", import.meta.url)
    return JSON.parse(await readFile(url, "utf8"))
}

// One Markdown file per term. The file name (without .md) is the slug: momos.com/glossary/<slug>.
export async function loadTerms(dir = TERMS_DIR) {
    const files = (await readdir(dir)).filter(f => f.endsWith(".md")).sort()
    const terms = []
    for (const file of files) {
        const text = await readFile(new URL(file, dir), "utf8")
        terms.push(parseTerm(file, text))
    }
    return terms
}

export function parseTerm(file, text) {
    const slug = path.basename(file, ".md")
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    if (!match) return { file, slug, frontmatter: {}, body: "", parseError: "should start with a --- frontmatter block" }
    try {
        return { file, slug, frontmatter: parseYaml(match[1]) ?? {}, body: match[2].trim() }
    } catch (error) {
        return { file, slug, frontmatter: {}, body: "", parseError: `frontmatter isn't valid YAML: ${error.message}` }
    }
}

// Returns { errors, warnings }. Errors stop the sync; warnings are printed.
export function validateTerms(terms, config) {
    const errors = []
    const warnings = []
    const slugs = new Set(terms.map(t => t.slug))
    const allowed = new Set(["term", "definition", "category", "related", "faq", "seoTitle", "seoDescription", "updated", "draft"])

    for (const t of terms) {
        const err = message => errors.push(`${t.file}: ${message}`)
        const warn = message => warnings.push(`${t.file}: ${message}`)
        const fm = t.frontmatter

        if (t.parseError) {
            err(t.parseError)
            continue
        }
        if (!SLUG.test(t.slug)) err(`file name must be lowercase words joined by dashes, like customer-effort-score.md`)
        for (const key of Object.keys(fm)) {
            if (!allowed.has(key)) err(`unknown frontmatter key "${key}". Allowed: ${[...allowed].join(", ")}`)
        }

        if (!isText(fm.term)) err(`needs a "term"`)
        if (!isText(fm.definition)) err(`needs a "definition" (one or two sentences)`)
        else if (fm.definition.length > 300) err(`"definition" is ${fm.definition.length} characters; keep it under 300`)
        else if (!fm.seoDescription && fm.definition.length > 160) warn(`"definition" is over 160 characters, so Google may cut it off. Add a shorter "seoDescription".`)
        if (!t.body) err(`needs body text under the frontmatter`)
        for (const [, slug] of t.body.matchAll(/\]\(\/glossary\/([^)#?\s]+)\)/g)) {
            if (!slugs.has(slug)) err(`links to /glossary/${slug}, but there's no terms/${slug}.md`)
        }

        if (!config.categories.includes(fm.category)) err(`"category" must be one of: ${config.categories.join(", ")}`)

        if (fm.related !== undefined) {
            if (!Array.isArray(fm.related)) err(`"related" must be a list of slugs`)
            else for (const slug of fm.related) {
                if (slug === t.slug) err(`"related" lists the term itself`)
                else if (!slugs.has(slug)) err(`"related" names "${slug}", but there's no terms/${slug}.md`)
            }
        }

        if (fm.faq !== undefined) {
            if (!Array.isArray(fm.faq) || fm.faq.some(f => !isText(f?.q) || !isText(f?.a))) {
                err(`"faq" must be a list of { q, a } entries`)
            }
        }

        if (fm.seoTitle !== undefined && !isText(fm.seoTitle)) err(`"seoTitle" must be text`)
        else if (isText(fm.term) && seoTitle(t).length > 60) warn(`SEO title "${seoTitle(t)}" is over 60 characters. Add a shorter "seoTitle".`)
        if (fm.updated !== undefined && Number.isNaN(new Date(fm.updated).getTime())) err(`"updated" must be a date like 2026-10-19`)
        if (fm.draft !== undefined && typeof fm.draft !== "boolean") err(`"draft" must be true or false`)
    }

    return { errors, warnings }
}

export function seoTitle(t) {
    return t.frontmatter.seoTitle ?? `What is ${t.frontmatter.term}? | Momos`
}

// Every field except "related", which needs the Framer IDs of other items (see sync.mjs).
export function termValues(t) {
    const fm = t.frontmatter
    return {
        term: fm.term,
        definition: fm.definition,
        body: t.body,
        faq: fm.faq?.length ? fm.faq.map(f => `### ${f.q.trim()}\n\n${f.a.trim()}`).join("\n\n") : "",
        category: fm.category,
        seoTitle: seoTitle(t),
        seoDescription: fm.seoDescription ?? fm.definition,
        updated: fm.updated,
    }
}

export function toFieldEntry(field, value) {
    switch (field.type) {
        case "string":
            return { type: "string", value: String(value ?? "") }
        case "formattedText":
            return { type: "formattedText", value: String(value ?? ""), contentType: "markdown" }
        case "date":
            return { type: "date", value: value ? new Date(value).toISOString() : null }
        case "enum": {
            const match = field.cases.find(c => c.name === value)
            if (!match) throw new Error(`"${value}" isn't an option for ${field.name} in Framer. Run npm run setup to add it.`)
            return { type: "enum", value: match.id }
        }
        case "multiCollectionReference":
            return { type: "multiCollectionReference", value }
        default:
            throw new Error(`${field.name} is a "${field.type}" field, which the glossary scripts don't fill in.`)
    }
}

// Opens the Framer project named by FRAMER_PROJECT_URL, authenticated with FRAMER_API_KEY.
export async function openProject() {
    const projectUrl = process.env.FRAMER_PROJECT_URL
    if (!projectUrl) {
        throw new Error("Set FRAMER_PROJECT_URL to the project's URL (https://framer.com/projects/...).")
    }
    if (!process.env.FRAMER_API_KEY) {
        throw new Error("Set FRAMER_API_KEY (Framer → Site Settings → API Keys).")
    }
    const { connect } = await import("framer-api")
    return connect(projectUrl)
}

export async function findCollection(framer, name) {
    const collections = await framer.getCollections()
    return collections.find(c => c.name === name)
}

function isText(value) {
    return typeof value === "string" && value.trim() !== ""
}
