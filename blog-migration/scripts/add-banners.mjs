// Adds Alfie and Rockie banners to blog posts: banners.json names one or two banners per post
// (designs in scripts/banners.mjs), and this puts each one's line in the post's English Content,
// where placeBanners() finds room, and its code in the post's Embeds field. Running it again updates
// the banners' code and never adds a second line; a banner whose line was removed by hand is added
// again. A post written from posts/<slug>.html is skipped: run with --files to put its banners in that
// file. Translations of Content are kept and marked "needs review" when a line is added. A dry run
// unless --apply; never publishes and never removes anything.
//
// Usage: npm run banners -- --all [--apply]
//        npm run banners -- --posts slug-a,slug-b [--apply]
//        npm run banners -- --files            (posts/ files only, no Framer)
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES } from "./lib.mjs"
import { embedsField, parseEmbedsField } from "./merge.mjs"
import { bannerEmbed, checkPlan, embedId, insertBanners, placeBanners } from "./banners.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const filesOnly = args.includes("--files")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!filesOnly && !all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const say = text => console.log(`${apply || filesOnly ? "" : "[dry run] "}${text}`)

const plan = JSON.parse(await readFile(new URL("../banners.json", import.meta.url), "utf8"))
const planProblems = checkPlan(plan)
if (planProblems.length) throw new Error(`Fix banners.json first:\n- ${planProblems.join("\n- ")}`)
const planned = Object.keys(plan).filter(s => !s.startsWith("_"))
const postsDir = new URL("../posts/", import.meta.url)
const written = new Set((await readdir(postsDir).catch(() => [])).filter(f => f.endsWith(".html")).map(f => f.replace(/\.html$/, "")))
const hasLine = (html, kind) => String(html).includes(`⟦embed:${embedId(kind)}⟧`)
const where = p => p.map(x => `${x.kind} before "${x.heading}"`).join("; ")

// Banners for one post: the lines to add and the embeds to set. `embeds` is id → code.
function plan1(slug, html, embeds) {
    const kinds = plan[slug]
    const missing = kinds.filter(k => !hasLine(html, k))
    const placements = missing.length ? placeBanners(html, missing, embeds) : []
    const shown = kinds.filter(k => hasLine(html, k) || placements.some(p => p.kind === k))
    return { kinds, placements, shown, html: placements.length ? insertBanners(html, placements) : html }
}

if (filesOnly) {
    for (const slug of planned.filter(s => written.has(s))) {
        const file = new URL(`${slug}.html`, postsDir)
        const html = await readFile(file, "utf8")
        const embedsDir = new URL(`${slug}.embeds/`, postsDir)
        const codes = new Map()
        for (const f of (await readdir(embedsDir).catch(() => [])).filter(f => f.endsWith(".html"))) codes.set(f.replace(/\.html$/, ""), await readFile(new URL(f, embedsDir), "utf8"))
        const result = plan1(slug, html, codes)
        await mkdir(embedsDir, { recursive: true })
        for (const kind of result.shown) await writeFile(new URL(`${embedId(kind)}.html`, embedsDir), bannerEmbed(kind) + "\n")
        if (result.placements.length) await writeFile(file, result.html)
        say(`${slug}: ${result.placements.length ? `added ${where(result.placements)}` : "lines already there"}; ${result.shown.length} banner${result.shown.length === 1 ? "" : "s"} written to posts/${slug}.embeds/.`)
    }
    process.exit(0)
}

const slugs = all ? planned : chosen
const unplanned = slugs.filter(s => !plan[s])
if (unplanned.length) throw new Error(`banners.json has nothing for ${unplanned.join(", ")}.`)

const { openBlogSession } = await import("./session.mjs")
const session = await openBlogSession()
try {
    const { fields, items, locales } = await session.read()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsFieldDef = field(FIELD_NAMES.embeds)
    const updates = []
    const problems = []
    let skipped = 0, banners = 0
    for (const slug of slugs) {
        const item = items.find(i => i.slug === slug)
        if (!item) { problems.push(`${slug}: no post with this slug`); continue }
        if (written.has(slug)) { say(`Skipped ${slug}: it's written from posts/${slug}.html, so its banners go in that file (npm run banners -- --files).`); skipped++; continue }
        const html = String(item.fieldData[content.id]?.value ?? "")
        if (!html.trim()) { problems.push(`${slug}: its Content is empty`); continue }
        const embeds = parseEmbedsField(item.fieldData[embedsFieldDef.id]?.value)
        const result = plan1(slug, html, embeds)
        if (!result.shown.length) { say(`Skipped ${slug}: no room for a banner away from its Momos promotions.`); skipped++; continue }
        let changed = result.placements.length > 0
        for (const kind of result.shown) {
            const code = bannerEmbed(kind)
            if (embeds.get(embedId(kind)) !== code) { embeds.set(embedId(kind), code); changed = true }
        }
        if (!changed) { say(`Skipped ${slug}: its banners are up to date.`); skipped++; continue }
        const fieldData = { [embedsFieldDef.id]: { type: "string", value: embedsField([...embeds].map(([id, code]) => ({ id, html: code }))) } }
        const translated = Object.entries(item.fieldData[content.id]?.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
        if (result.placements.length) {
            fieldData[content.id] = {
                type: "formattedText", value: result.html, contentType: "html",
                valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])),
            }
        }
        updates.push({ id: item.id, slug, fieldData, kinds: result.shown })
        banners += result.placements.length
        const left = result.kinds.filter(k => !result.shown.includes(k))
        say(`${slug}: ${result.placements.length ? `${apply ? "adding" : "would add"} ${where(result.placements)}` : `${apply ? "updating" : "would update"} the banners' code`}` +
            `${left.length ? ` (no room for ${left.join(", ")})` : ""}` +
            `${result.placements.length && translated.length ? ` (translations marked for review: ${translated.map(id => locales.find(l => l.id === id)?.code ?? id).join(", ")})` : ""}`)
    }
    if (problems.length) throw new Error(`Fix these first, nothing was written:\n- ${problems.join("\n- ")}`)
    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const wrong = updates.filter(u => {
            const saved = after.get(u.id)?.fieldData ?? {}
            const savedEmbeds = parseEmbedsField(saved[embedsFieldDef.id]?.value)
            return u.kinds.some(k => !hasLine(saved[content.id]?.value, k) || !savedEmbeds.has(embedId(k)))
        })
        if (wrong.length) throw new Error(`Saved, but a banner or its line is missing in ${wrong.map(u => u.slug).join(", ")}. Check those posts.`)
        console.log("Checked: every banner has its line and its code.")
    }
    say(`${updates.length} posts ${apply ? "got" : "would get"} banners (${banners} new); ${skipped} skipped.`)
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Tick \"apply\" in the workflow to add the banners.")
