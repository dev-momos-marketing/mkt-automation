// Saves a post's body, written in this repo, to its Content field in Framer: posts/<slug>.html holds
// the English body (from the first H2 on, with an ⟦embed:ID⟧ line where each embed goes). Checks
// the HTML, the embed lines and the links first, and reads the post back afterwards. Its translations
// are kept and marked "needs review" in Framer's localization, since the English text has changed.
// New or changed embeds go in posts/<slug>.embeds/<id>.html: each is added to the post's Embeds field
// (or replaces the embed with that id there); the other embeds stay as they are.
// A dry run unless --apply is given; never publishes.
//
// Usage: npm run write -- --posts restaurant-intelligence [--apply]
import { readFile, readdir } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES } from "./lib.mjs"
import { embedsField as serializeEmbeds, parseEmbedsField } from "./merge.mjs"
import { SITE } from "./live.mjs"
import { checkPost, embedLines } from "./posts.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (each needs a posts/<slug>.html file).")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

const bodies = new Map()
const newEmbeds = new Map()
for (const slug of chosen) {
    const html = await readFile(new URL(`../posts/${slug}.html`, import.meta.url), "utf8").catch(() => {
        throw new Error(`No posts/${slug}.html in blog-migration.`)
    })
    // Framer stores the body without the line breaks between blocks.
    bodies.set(slug, html.trim().replace(/>\s*\n\s*</g, "><"))
    const dir = new URL(`../posts/${slug}.embeds/`, import.meta.url)
    const files = (await readdir(dir).catch(() => [])).filter(f => /^[A-Za-z0-9_-]+\.html$/.test(f))
    newEmbeds.set(slug, new Map(await Promise.all(files.map(async f => [f.replace(/\.html$/, ""), (await readFile(new URL(f, dir), "utf8")).trim()]))))
}

// Every page on the site, from the sitemap (read before connecting to Framer).
const sitemap = await (await fetch(`${SITE}/sitemap_en.xml`, { headers: { "user-agent": "Mozilla/5.0 momos-blog-migration" } })).text()
const paths = new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*?)\/?<\/loc>/gi)].map(m => m[1]))

const session = await openBlogSession()
try {
    const { fields, items, locales } = await session.read()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsField = field(FIELD_NAMES.embeds)
    for (const item of items) if (!item.draft) paths.add(`/blog/${item.slug}`)

    const updates = []
    const problems = []
    for (const slug of chosen) {
        const item = items.find(i => i.slug === slug)
        if (!item) { problems.push(`${slug}: no post with this slug`); continue }
        const html = bodies.get(slug)
        const existing = parseEmbedsField(item.fieldData[embedsField.id]?.value)
        const added = newEmbeds.get(slug)
        const embeds = new Map([...existing, ...added])
        const found = checkPost(html, { embeds, paths })
        if (found.length) { problems.push(...found.map(p => `${slug}: ${p}`)); continue }
        const before = String(item.fieldData[content.id]?.value ?? "")
        const unused = [...embeds.keys()].filter(id => !embedLines(html).includes(id))
        // Translations that exist stay as they are, marked for review.
        const translated = Object.entries(item.fieldData[content.id]?.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
        const words = text => text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length
        say(`${apply ? "Writing" : "Would write"} ${slug}: ${words(before)} → ${words(html)} words, ${(html.match(/<h2\b/g) ?? []).length} sections, ${(html.match(/<a\b/g) ?? []).length} links, embeds ${embedLines(html).join(", ") || "none"}` +
            `${unused.length ? ` (not placed: ${unused.join(", ")})` : ""}` +
            `${added.size ? `; Embeds field: ${[...added.keys()].map(id => `${id} ${existing.has(id) ? "replaced" : "added"}`).join(", ")}` : ""}` +
            `; translations marked for review: ${translated.map(id => locales.find(l => l.id === id)?.code ?? id).join(", ") || "none"}.`)
        const fieldData = {
            [content.id]: {
                type: "formattedText", value: html, contentType: "html",
                valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])),
            },
        }
        // Translated Embeds values are left alone: the translated text has the old embed lines.
        if (added.size) fieldData[embedsField.id] = { type: "string", value: serializeEmbeds([...embeds].map(([id, code]) => ({ id, html: code }))) }
        updates.push({ id: item.id, slug, embeds: embedLines(html).length, added: [...added.keys()], fieldData })
    }
    if (problems.length) throw new Error(`Fix these first, nothing was written:\n- ${problems.join("\n- ")}`)

    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const wrong = updates.filter(u => embedLines(after.get(u.id)?.fieldData[content.id]?.value).length !== u.embeds ||
            u.added.some(id => !parseEmbedsField(after.get(u.id)?.fieldData[embedsField.id]?.value).has(id)))
        if (wrong.length) throw new Error(`Saved, but some embed lines or embeds are missing in ${wrong.map(u => u.slug).join(", ")}. Check those posts.`)
        console.log("Checked: the saved posts have all their embed lines and embeds.")
    }
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Tick \"apply\" in the workflow to save these posts.")
