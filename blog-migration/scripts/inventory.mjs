// Step 1 of the blog migration: lists what the blog is made of today, so the merge into one field can
// be planned. Only reads from Framer: it never edits, deletes or publishes anything.
//
// Writes to out/:
//   summary.md            the headline numbers
//   fields.csv            every Blog collection field, its type and how many posts fill it in
//   posts.csv             every post: which numbered fields it uses, its highest section, translations
//   embeds.csv            every Embed layer in the blog template: breakpoint, section, HTML or URL,
//                         and an empty "post" column for a person to fill in
//   embeds/<hash>.html    each distinct embed's HTML (or URL), one file each
//   template-outline.txt  the blog template's layer tree
//   blog-items.json       every post's raw field data, for writing the migration against real content
//   embed-nodes.json      every embed layer's raw attributes
//
// Usage: npm run inventory
import { mkdir, rm, writeFile } from "node:fs/promises"
import { isComponentInstanceNode, isFrameNode, isSVGNode, isTextNode } from "framer-api"
import { COLLECTION, csv, embedInfo, guessPosts, isEmbed, isFilled, isSectionName, numbered, preview, translatedLocales, withProject } from "./lib.mjs"

const OUT = new URL("../out/", import.meta.url)
await rm(OUT, { recursive: true, force: true })
await mkdir(new URL("embeds/", OUT), { recursive: true })
const write = (name, text) => writeFile(new URL(name, OUT), text)

// 1. The collection: fields, posts and translations.
const { collectionId, fields, posts, items, locales } = await withProject(async framer => {
    const collection = (await framer.getCollections()).find(c => c.name === COLLECTION)
    if (!collection) throw new Error(`No "${COLLECTION}" collection in Framer. Set BLOG_COLLECTION to its name.`)
    const fields = await collection.getFields()
    const items = await collection.getItems()
    const locales = await framer.getLocales()
    const localeCodes = new Map(locales.map(l => [l.id, l.code]))
    const titleField = fields.find(f => /^(title|name|heading)$/i.test(f.name)) ?? fields.find(f => f.type === "string")

    const posts = items.map(item => {
        const filled = fields.filter(f => isFilled(item.fieldData[f.id]))
        const sections = filled.map(f => numbered(f.name)?.n).filter(Boolean)
        const translated = new Set(filled.flatMap(f => translatedLocales(item.fieldData[f.id], localeCodes)))
        return {
            slug: item.slug,
            title: String(item.fieldData[titleField?.id]?.value ?? "").trim(),
            draft: item.draft ? "yes" : "",
            highest_section: sections.length ? Math.max(...sections) : 0,
            numbered_fields_filled: filled.filter(f => numbered(f.name)).length,
            other_fields_filled: filled.filter(f => !numbered(f.name)).map(f => f.name),
            translated_into: [...translated].sort(),
            filled: new Set(filled.map(f => f.id)),
        }
    })
    return { collectionId: collection.id, fields, posts, items, locales }
})

// 2. The template page: its layer tree and every embed in it.
const { outline, embeds, templatePaths } = await withProject(async framer => {
    const pages = (await framer.getNodesWithType("WebPageNode")).filter(p => p.collectionId === collectionId)
    if (!pages.length) throw new Error(`No CMS page uses the "${COLLECTION}" collection.`)
    const outline = []
    const embeds = []

    // Walks the tree in canvas order. Each top-level frame of a page is a breakpoint (Desktop, Tablet,
    // Phone), and Framer keeps a full copy of the layers for each one.
    async function walk(node, depth, ctx) {
        let lastSection = null
        for (const child of await node.getChildren()) {
            const name = child.name ?? ""
            const breakpoint = depth === 0 ? name || child.id : ctx.breakpoint
            const section = isSectionName(name) ? name : ctx.section
            const location = section ?? (lastSection ? `after ${lastSection}` : "")
            const hidden = child.visible === false ? " (hidden)" : ""
            const pad = "  ".repeat(depth + 1)

            if (isComponentInstanceNode(child)) {
                const embed = isEmbed(child)
                outline.push(`${pad}${embed ? "EMBED" : "Component"} "${name}" [${child.componentName ?? "?"}]${hidden}`)
                if (embed) {
                    embeds.push({ node: child, page: ctx.page, breakpoint, location, path: [...ctx.path, name].join(" / ") })
                    continue
                }
            } else if (isTextNode(child)) {
                const text = await child.getText().catch(() => null)
                outline.push(`${pad}Text "${name}"${hidden}${text ? `: ${preview(text, 60)}` : ""}`)
            } else {
                const type = isFrameNode(child) ? "Frame" : isSVGNode(child) ? "SVG" : "Layer"
                outline.push(`${pad}${type} "${name}"${hidden}`)
            }
            if (isSectionName(name)) lastSection = name
            await walk(child, depth + 1, { ...ctx, breakpoint, section, path: [...ctx.path, name] })
        }
    }

    for (const page of pages) {
        outline.push(`Page ${page.path}`)
        await walk(page, 0, { page: page.path, breakpoint: "", section: null, path: [] })
    }
    return { outline, embeds, templatePaths: pages.map(p => p.path) }
})

// 3. Reports.
const embedRows = []
const distinct = new Map()
for (const e of embeds) {
    const { mode, url, html, hash } = embedInfo(e.node.controls)
    const content = mode === "url" ? url : html
    if (hash && !distinct.has(hash)) {
        distinct.set(hash, content)
        await write(`embeds/${hash}.html`, mode === "url" ? `<!-- URL embed -->\n${url}\n` : html)
    }
    embedRows.push({
        page: e.page,
        breakpoint: e.breakpoint,
        location: e.location,
        layer: e.path,
        hidden_on_canvas: e.node.visible === false ? "yes" : "",
        component: e.node.componentName ?? "",
        mode,
        url,
        html_chars: html.length,
        has_script: /<script\b/i.test(html) ? "yes" : "",
        preview: preview(content),
        file: hash ? `embeds/${hash}.html` : "",
        guessed_post: guessPosts(content, posts),
        node_id: e.node.id,
        post: "",
    })
}

const fieldRows = fields.map(f => ({
    name: f.name,
    type: f.type,
    id: f.id,
    numbered_group: numbered(f.name)?.group ?? "",
    posts_filled: posts.filter(p => p.filled.has(f.id)).length,
}))
const groups = new Map()
for (const f of fieldRows.filter(f => f.numbered_group)) groups.set(f.numbered_group, (groups.get(f.numbered_group) ?? 0) + 1)

await write("fields.csv", csv(fieldRows, ["name", "type", "numbered_group", "posts_filled", "id"]))
await write("posts.csv", csv(posts, ["slug", "title", "draft", "highest_section", "numbered_fields_filled", "other_fields_filled", "translated_into"]))
await write("embeds.csv", csv(embedRows, ["post", "guessed_post", "page", "breakpoint", "location", "layer", "hidden_on_canvas", "component", "mode", "url", "html_chars", "has_script", "preview", "file", "node_id"]))
await write("template-outline.txt", `${outline.join("\n")}\n`)
await write("blog-items.json", `${JSON.stringify({ fields, locales, items: items.map(i => ({ id: i.id, slug: i.slug, slugByLocale: i.slugByLocale, draft: i.draft, fieldData: i.fieldData })) }, null, 2)}\n`)
await write("embed-nodes.json", `${JSON.stringify(embeds.map(e => ({ ...plain(e.node), page: e.page, breakpoint: e.breakpoint, location: e.location })), null, 2)}\n`)

const breakpoints = new Map()
for (const r of embedRows) breakpoints.set(r.breakpoint, (breakpoints.get(r.breakpoint) ?? 0) + 1)
const sectionHistogram = new Map()
for (const p of posts) sectionHistogram.set(p.highest_section, (sectionHistogram.get(p.highest_section) ?? 0) + 1)

const summary = `# Blog inventory

Collection **${COLLECTION}**, template ${templatePaths.map(p => `\`${p}\``).join(", ")}. Read on ${new Date().toISOString().slice(0, 10)}.

## Posts
- ${posts.length} posts (${posts.filter(p => p.draft).length} drafts)
- Languages in the project: ${locales.map(l => l.code).join(", ") || "none"}; ${posts.filter(p => p.translated_into.length).length} posts have at least one translation
- Highest section used, and how many posts stop there:
${[...sectionHistogram].sort((a, b) => a[0] - b[0]).map(([n, count]) => `  - ${n}: ${count}`).join("\n")}

## Fields
- ${fields.length} fields. Numbered groups: ${[...groups].map(([g, n]) => `"${g}" ×${n}`).join(", ") || "none"}
- Never filled in: ${fieldRows.filter(f => !f.posts_filled).map(f => f.name).join(", ") || "none"}

## Embeds in the template
- ${embedRows.length} embed layers, ${distinct.size} distinct (the rest are copies, mostly one per breakpoint)
- Per breakpoint: ${[...breakpoints].map(([b, n]) => `${b || "?"} ${n}`).join(", ")}
- ${embedRows.filter(r => r.has_script).length} contain a <script>; ${embedRows.filter(r => r.mode === "url").length} load a URL
- ${embedRows.filter(r => r.guessed_post.length).length} have a guessed post (its slug or title appears in the embed)

## Next
Fill in the \`post\` column of embeds.csv: in Framer, select the layer (its id is in \`node_id\`) and note which post its visibility is set for. Framer's API doesn't expose that rule. One row per distinct \`file\` is enough; the breakpoint copies share it.
`
await write("summary.md", summary)
console.log(summary)
console.log(`Wrote the inventory to ${new URL(OUT).pathname}`)

// A node's readable attributes, without its methods.
function plain(node) {
    const out = {}
    for (const key of Object.keys(node)) {
        if (typeof node[key] !== "function") out[key] = node[key]
    }
    for (const key of ["id", "name", "visible", "componentName", "componentIdentifier", "insertURL", "controls", "width", "height"]) {
        if (!(key in out) && node[key] !== undefined) out[key] = node[key]
    }
    return out
}
