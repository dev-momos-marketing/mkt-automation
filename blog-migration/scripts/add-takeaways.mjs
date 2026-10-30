// Adds a "Key takeaways" box to the top of blog posts: takeaways/<slug>.json (see scripts/takeaways.mjs)
// becomes the post's keyTakeaways embed, and an ⟦embed:keyTakeaways⟧ line goes first in its Content.
// Running it again updates the box with the file's current takeaways and never adds a second line.
// A post written from posts/<slug>.html is skipped: its box goes in that file. Translations of
// Content are kept and marked "needs review" when the line is added. A dry run unless --apply; never
// publishes.
//
// Usage: npm run takeaways -- --all [--apply]
//        npm run takeaways -- --posts slug-a,slug-b [--apply]
import { readFile, readdir } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES } from "./lib.mjs"
import { embedsField, parseEmbedsField } from "./merge.mjs"
import { EMBED_ID, MARKER_LINE, checkTakeaways, takeawaysEmbed } from "./takeaways.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

const dir = new URL("../takeaways/", import.meta.url)
const files = (await readdir(dir)).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, ""))
const slugs = all ? files : chosen
const missing = slugs.filter(s => !files.includes(s))
if (missing.length) throw new Error(`No takeaways/<slug>.json for ${missing.join(", ")}.`)
const written = new Set((await readdir(new URL("../posts/", import.meta.url)).catch(() => [])).filter(f => f.endsWith(".html")).map(f => f.replace(/\.html$/, "")))
const hasLine = html => html.includes(`⟦embed:${EMBED_ID}⟧`)

const session = await openBlogSession()
try {
    const { fields, items, locales } = await session.read()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsFieldDef = field(FIELD_NAMES.embeds)
    const updates = []
    const problems = []
    let skipped = 0
    for (const slug of slugs) {
        const item = items.find(i => i.slug === slug)
        if (!item) { problems.push(`${slug}: no post with this slug`); continue }
        if (written.has(slug)) { say(`Skipped ${slug}: it's written from posts/${slug}.html, so its box goes in that file.`); skipped++; continue }
        const html = String(item.fieldData[content.id]?.value ?? "")
        if (!html.trim()) { problems.push(`${slug}: its Content is empty`); continue }
        const takeaways = JSON.parse(await readFile(new URL(`${slug}.json`, dir), "utf8"))
        const found = checkTakeaways(takeaways, html.replace(/<[^>]+>/g, " "))
        if (found.length) { problems.push(...found.map(p => `${slug}: ${p}`)); continue }

        const embeds = parseEmbedsField(item.fieldData[embedsFieldDef.id]?.value)
        const box = takeawaysEmbed(takeaways.items)
        const addLine = !hasLine(html)
        if (!addLine && embeds.get(EMBED_ID) === box) { say(`Skipped ${slug}: its box is up to date.`); skipped++; continue }
        embeds.set(EMBED_ID, box)
        const fieldData = { [embedsFieldDef.id]: { type: "string", value: embedsField([...embeds].map(([id, code]) => ({ id, html: code }))) } }
        if (addLine) {
            const translated = Object.entries(item.fieldData[content.id]?.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
            fieldData[content.id] = {
                type: "formattedText", value: MARKER_LINE + html, contentType: "html",
                valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])),
            }
        }
        updates.push({ id: item.id, slug, fieldData })
        say(`${apply ? (addLine ? "Adding" : "Updating") : (addLine ? "Would add" : "Would update")} the box on ${slug}: ${takeaways.items.map(t => `"${t}"`).join(" ")}`)
    }
    if (problems.length) throw new Error(`Fix these first, nothing was written:\n- ${problems.join("\n- ")}`)
    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const wrong = updates.filter(u => {
            const saved = after.get(u.id)?.fieldData ?? {}
            return !hasLine(String(saved[content.id]?.value ?? "")) || !parseEmbedsField(saved[embedsFieldDef.id]?.value).has(EMBED_ID)
        })
        if (wrong.length) throw new Error(`Saved, but the box or its line is missing in ${wrong.map(u => u.slug).join(", ")}. Check those posts.`)
        console.log("Checked: every post has its box and its line.")
    }
    say(`${updates.length} posts ${apply ? "got" : "would get"} a Key takeaways box; ${skipped} skipped.`)
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Tick \"apply\" in the workflow to add the boxes.")
