// Replaces embeds with native text in blog posts (see scripts/replace.mjs): each post's ⟦embed:ID⟧
// line becomes the HTML in replacements/<slug>/<ID>.html, new embeds from replacements/<slug>/embeds/
// are added, and the old embed's code is removed from the Embeds field, unless a translation still
// shows it. A line that's already gone is skipped, so running it again changes nothing. A post written
// from posts/<slug>.html is skipped: change its file. Translations of Content are marked "needs
// review". A dry run unless --apply; never publishes.
//
// Usage: npm run replace-embeds -- --all [--apply]
//        npm run replace-embeds -- --posts slug-a,slug-b [--apply]
import { readFile, readdir } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES } from "./lib.mjs"
import { embedsField, parseEmbedsField } from "./merge.mjs"
import { checkPost } from "./posts.mjs"
import { replaceMarker, usedByTranslation } from "./replace.mjs"
import { SITE } from "./live.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

const dir = new URL("../replacements/", import.meta.url)
const slugs = all ? (await readdir(dir, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name) : chosen
const plans = new Map()
for (const slug of slugs) {
    const base = new URL(`${slug}/`, dir)
    const files = await readdir(base).catch(() => { throw new Error(`No replacements/${slug}/.`) })
    const lines = await Promise.all(files.filter(f => /^[A-Za-z0-9_-]+\.html$/.test(f)).map(async f => [f.replace(/\.html$/, ""), await readFile(new URL(f, base), "utf8")]))
    const extra = (await readdir(new URL("embeds/", base)).catch(() => [])).filter(f => /^[A-Za-z0-9_-]+\.html$/.test(f))
    const embeds = await Promise.all(extra.map(async f => [f.replace(/\.html$/, ""), (await readFile(new URL(`embeds/${f}`, base), "utf8")).trim()]))
    plans.set(slug, { lines, embeds: new Map(embeds) })
}
const written = new Set((await readdir(new URL("../posts/", import.meta.url)).catch(() => [])).filter(f => f.endsWith(".html")).map(f => f.replace(/\.html$/, "")))
const sitemap = await (await fetch(`${SITE}/sitemap_en.xml`, { headers: { "user-agent": "Mozilla/5.0 momos-blog-migration" } })).text()
const paths = new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*?)\/?<\/loc>/gi)].map(m => m[1]))

const session = await openBlogSession()
try {
    const { fields, items, locales } = await session.read()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsDef = field(FIELD_NAMES.embeds)
    for (const item of items) if (!item.draft) paths.add(`/blog/${item.slug}`)
    const updates = []
    const problems = []
    for (const [slug, plan] of plans) {
        const item = items.find(i => i.slug === slug)
        if (!item) { problems.push(`${slug}: no post with this slug`); continue }
        if (written.has(slug)) { say(`Skipped ${slug}: it's written from posts/${slug}.html, so change that file.`); continue }
        const entry = item.fieldData[content.id] ?? {}
        let html = String(entry.value ?? "")
        const embeds = parseEmbedsField(item.fieldData[embedsDef.id]?.value)
        const replaced = []
        const kept = []
        for (const [id, replacement] of plan.lines) {
            const result = replaceMarker(html, id, replacement)
            if (!result.found) { say(`${slug}: ⟦embed:${id}⟧ is already replaced.`); continue }
            html = result.html
            replaced.push(id)
        }
        if (!replaced.length) continue
        for (const [id, code] of plan.embeds) embeds.set(id, code)
        // Check only what's new: the rest of the post is Framer's own HTML.
        const found = plan.lines.filter(([id]) => replaced.includes(id)).flatMap(([id, replacement]) => checkPost(replacement, { embeds, paths }).map(p => `${id}.html: ${p}`))
        if (found.length) { problems.push(...found.map(p => `${slug}: ${p}`)); continue }
        for (const id of replaced) {
            if (usedByTranslation(entry.valueByLocale, id)) kept.push(id)
            else embeds.delete(id)
        }
        const translated = Object.entries(entry.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
        updates.push({
            id: item.id, slug, replaced, added: [...plan.embeds.keys()],
            fieldData: {
                [content.id]: { type: "formattedText", value: html, contentType: "html", valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])) },
                [embedsDef.id]: { type: "string", value: embedsField([...embeds].map(([id, code]) => ({ id, html: code }))) },
            },
        })
        say(`${apply ? "Replacing" : "Would replace"} in ${slug}: ${replaced.join(", ")} with native text` +
            `${plan.embeds.size ? `; adds ${[...plan.embeds.keys()].join(", ")}` : ""}` +
            `${kept.length ? `; keeps the code of ${kept.join(", ")} for its translations (${translated.map(id => locales.find(l => l.id === id)?.code ?? id).join(", ")})` : "; removes the old code from Embeds"}.`)
    }
    if (problems.length) throw new Error(`Fix these first, nothing was written:\n- ${problems.join("\n- ")}`)
    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const wrong = updates.filter(u => {
            const saved = after.get(u.id)?.fieldData ?? {}
            const text = String(saved[content.id]?.value ?? "")
            const codes = parseEmbedsField(saved[embedsDef.id]?.value)
            return u.replaced.some(id => text.includes(`⟦embed:${id}⟧`)) || u.added.some(id => !codes.has(id))
        })
        if (wrong.length) throw new Error(`Saved, but ${wrong.map(u => u.slug).join(", ")} didn't keep the change. Check those posts.`)
        console.log("Checked: every replaced embed is gone from the text and every new embed is saved.")
    }
    say(`${updates.length} posts ${apply ? "changed" : "would change"}.`)
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Tick \"apply\" in the workflow to replace these embeds.")
