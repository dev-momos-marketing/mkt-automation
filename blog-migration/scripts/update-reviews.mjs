// Rewrites tool reviews in "best software" posts (see scripts/reviews.mjs). For each post folder in
// reviews/:
//   <NN>-<tool>.html  replaces the section from the "NN. Tool" heading to the next heading
//   meta.json         {"fields": {"Title": [[from, to]]}, "text": [[from, to]], "swap": {"13": "Ada"}}:
//                     exact text fixes in string fields and in the rest of the post (e.g. "24 Best" →
//                     "18 Best"), and slots where a different tool replaces the reviewed one
//   embeds/<ID>.html  replaces that embed's code in the Embeds field
// Each review is checked first: same heading, images, embeds and links as the section it replaces,
// the label order, a features list, numbers found in tools/<tool>.json, and no 8-word run shared with
// any other review on the blog. A section whose text already matches is skipped. Translations are
// marked "needs review". A dry run unless --apply; never publishes.
//
// Usage: npm run reviews -- --posts slug-a,slug-b [--apply]
import { readFile, readdir } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES } from "./lib.mjs"
import { embedsField, parseEmbedsField } from "./merge.mjs"
import { checkReview, sections } from "./reviews.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b.")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)
const root = new URL("../reviews/", import.meta.url)
const flat = html => String(html).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
const readJson = async url => JSON.parse(await readFile(url, "utf8"))

const plans = new Map()
for (const slug of chosen) {
    const dir = new URL(`${slug}/`, root)
    const files = (await readdir(dir).catch(() => { throw new Error(`No reviews/${slug}/.`) })).filter(f => /^\d{2}-[a-z0-9-]+\.html$/.test(f))
    const reviews = await Promise.all(files.map(async f => ({ file: f, n: Number(f.slice(0, 2)), tool: f.slice(3, -5), html: await readFile(new URL(f, dir), "utf8") })))
    const meta = await readJson(new URL("meta.json", dir)).catch(() => ({}))
    const extra = (await readdir(new URL("embeds/", dir)).catch(() => [])).filter(f => /^[\w-]+\.html$/.test(f))
    const embeds = new Map(await Promise.all(extra.map(async f => [f.slice(0, -5), (await readFile(new URL(`embeds/${f}`, dir), "utf8")).trim()])))
    plans.set(slug, { reviews, meta, embeds })
}

const session = await openBlogSession()
try {
    const { fields, items } = await session.read()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsDef = field(FIELD_NAMES.embeds)
    // Every review section on the blog, for the uniqueness check.
    const allReviews = items.flatMap(i => sections(i.fieldData[content.id]?.value ?? "").filter(s => s.n).map(s => ({ slug: i.slug, n: s.n, text: flat(s.html.replace(/^<h2\b[^>]*>[\s\S]*?<\/h2>/, "")) })))
    const updates = []
    const problems = []
    for (const [slug, plan] of plans) {
        const item = items.find(i => i.slug === slug)
        if (!item) { problems.push(`${slug}: no post with this slug`); continue }
        const entry = item.fieldData[content.id] ?? {}
        const parts = sections(entry.value ?? "")
        const changed = []
        for (const review of plan.reviews) {
            const at = parts.findIndex(p => p.n === review.n)
            if (at < 0) { problems.push(`${slug}: no "${review.n}. …" heading for ${review.file}`); continue }
            if (flat(parts[at].html) === flat(review.html)) continue
            const facts = await readFile(new URL(`../tools/${review.tool}.json`, import.meta.url), "utf8").catch(() => "")
            if (!facts) { problems.push(`${slug}: no tools/${review.tool}.json for ${review.file}`); continue }
            const others = allReviews.filter(r => !(r.slug === slug && r.n === review.n)).map(r => r.text)
                .concat([...plans.values()].flatMap(p => p.reviews).filter(r => r !== review).map(r => flat(r.html.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/, ""))))
            const swap = plan.meta.swap?.[String(review.n)] ? `${review.n}. ${plan.meta.swap[String(review.n)]}` : ""
            const found = checkReview(review.html, { original: parts[at].html, facts, others, swap })
            if (found.length) { problems.push(...found.map(p => `${slug}/${review.file}: ${p}`)); continue }
            parts[at] = { ...parts[at], html: review.html.trim().replace(/>\s*\n\s*</g, "><") }
            changed.push(review.file)
        }
        let html = parts.map(p => p.html).join("")
        for (const [from, to] of plan.meta.text ?? []) {
            if (html.includes(from)) { html = html.replace(from, to); changed.push(`"${to}"`) }
            else if (!html.includes(to)) problems.push(`${slug}: the text "${from}" isn't in the post`)
        }
        const fieldData = {}
        for (const [name, pairs] of Object.entries(plan.meta.fields ?? {})) {
            const f = field(name)
            let value = String(item.fieldData[f.id]?.value ?? "")
            for (const [from, to] of pairs) {
                if (value.includes(from)) { value = value.replace(from, to); changed.push(`${name}: "${value}"`) }
                else if (!value.includes(to)) problems.push(`${slug}: the ${name} field doesn't contain "${from}"`)
            }
            if (value !== String(item.fieldData[f.id]?.value ?? "")) {
                const translated = Object.entries(item.fieldData[f.id]?.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
                fieldData[f.id] = { type: "string", value, valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])) }
            }
        }
        const codes = parseEmbedsField(item.fieldData[embedsDef.id]?.value)
        let embedsChanged = false
        for (const [id, code] of plan.embeds) {
            if (codes.get(id) !== code) { codes.set(id, code); embedsChanged = true; changed.push(`embed ${id}`) }
        }
        if (embedsChanged) fieldData[embedsDef.id] = { type: "string", value: embedsField([...codes].map(([id, code]) => ({ id, html: code }))) }
        if (html !== String(entry.value ?? "")) {
            const translated = Object.entries(entry.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
            fieldData[content.id] = { type: "formattedText", value: html, contentType: "html", valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])) }
        }
        if (!Object.keys(fieldData).length) { say(`${slug}: already up to date.`); continue }
        updates.push({ id: item.id, slug, reviews: plan.reviews.filter(r => changed.includes(r.file)), fieldData })
        say(`${apply ? "Updating" : "Would update"} ${slug}: ${changed.join(", ")}.`)
    }
    if (problems.length) throw new Error(`Fix these first, nothing was written:\n- ${problems.join("\n- ")}`)
    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const wrong = updates.filter(u => {
            const saved = flat(after.get(u.id)?.fieldData[content.id]?.value ?? "")
            return u.reviews.some(r => !saved.includes(flat(r.html).slice(0, 120)))
        })
        if (wrong.length) throw new Error(`Saved, but some reviews aren't in ${wrong.map(u => u.slug).join(", ")}. Check those posts.`)
        console.log("Checked: every rewritten review is in the saved posts.")
    }
    say(`${updates.length} posts ${apply ? "updated" : "would be updated"}.`)
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Tick \"apply\" in the workflow to save these reviews.")
