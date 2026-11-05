// Fixes dead links in the Blog and Glossary collections, as listed in link-fixes.json (see
// fixlinks.mjs): in every text field of every item, in English and in each translation. A
// translation keeps its status; the English text change doesn't mark it "needs review". Each new
// link is checked on the live site first. A dry run unless --apply; never publishes, never deletes.
//
// Writes out/fix-links/report.csv: every link changed, with its item, field and language.
//
// Usage: npm run fix-links [-- --apply]
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { COLLECTION, csv, openProject } from "./lib.mjs"
import { compileFixes, fixLinks } from "./fixlinks.mjs"
import { SITE } from "./live.mjs"

const apply = process.argv.includes("--apply")
const OUT = new URL("../out/fix-links/", import.meta.url)
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const fixes = compileFixes(JSON.parse(await readFile(new URL("../link-fixes.json", import.meta.url), "utf8")))

// Every new link has to work before anything is written.
const dead = []
for (const to of new Set(fixes.map(f => f.to).filter(Boolean))) {
    const res = await fetch(`${SITE}${to}`, { headers: { "user-agent": "Mozilla/5.0 momos-blog-migration" } })
    if (res.status !== 200) dead.push(`${to} (${res.status})`)
}
if (dead.length) throw new Error(`These replacement links don't work, nothing was written: ${dead.join(", ")}`)
console.log(`Checked: all ${new Set(fixes.map(f => f.to).filter(Boolean)).size} replacement links load on ${SITE}.`)

const TEXT_TYPES = new Set(["string", "formattedText", "link"])
const isSet = v => v && v.status !== "new" && typeof v.value === "string"

let framer = await openProject()
try {
    const collections = await framer.getCollections()
    console.log(`Collections: ${collections.map(c => c.name).join(", ")}.`)
    const glossaryName = process.env.GLOSSARY_COLLECTION
    const targets = [
        collections.find(c => c.name === COLLECTION) ?? (() => { throw new Error(`No "${COLLECTION}" collection. Set BLOG_COLLECTION.`) })(),
        ...collections.filter(c => glossaryName ? c.name === glossaryName : /glossary/i.test(c.name)),
    ]
    if (targets.length < 2) console.log(`::warning::No glossary collection found${glossaryName ? ` called "${glossaryName}"` : ""}; only "${COLLECTION}" is checked. Set GLOSSARY_COLLECTION to its name.`)
    const locales = new Map((await framer.getLocales()).map(l => [l.id, l.code]))

    const rows = []
    const left = []
    const found = new Set()
    const plans = []
    for (const collection of targets) {
        const fields = (await collection.getFields()).filter(f => TEXT_TYPES.has(f.type))
        const items = await collection.getItems()
        say(`${collection.name}: ${items.length} items, ${fields.length} text fields.`)
        for (const item of items) {
            const fieldData = {}
            for (const field of fields) {
                const entry = item.fieldData[field.id]
                if (!entry) continue
                const record = (locale, result) => {
                    for (const c of result.changes) {
                        rows.push({ collection: collection.name, item: item.slug, field: field.name, language: locale, from: c.from, to: c.to ?? "(link removed, text kept)" })
                        found.add(fixes.find(f => f.re.test(c.from)).from)
                    }
                    for (const l of result.left) left.push(`${collection.name}/${item.slug} → ${field.name} (${locale}): ${l}`)
                }
                const base = fixLinks(entry.value, fixes)
                record("en", base)
                const byLocale = {}
                let localeChanged = false
                for (const [id, v] of Object.entries(entry.valueByLocale ?? {})) {
                    if (!isSet(v)) continue
                    const result = fixLinks(v.value, fixes)
                    record(locales.get(id) ?? id, result)
                    const needsReview = v.status === "needsReview"
                    if (result.changes.length) { byLocale[id] = { action: "set", value: result.text, needsReview }; localeChanged = true }
                    else byLocale[id] = { action: "ignore", needsReview }
                }
                if (!base.changes.length && !localeChanged) continue
                fieldData[field.id] = {
                    type: field.type, value: base.text,
                    ...(field.type === "formattedText" ? { contentType: "html" } : {}),
                    ...(Object.keys(byLocale).length ? { valueByLocale: byLocale } : {}),
                }
            }
            if (Object.keys(fieldData).length) plans.push({ collection, item, fieldData })
        }
    }

    for (const plan of plans) {
        const mine = rows.filter(r => r.collection === plan.collection.name && r.item === plan.item.slug)
        say(`${plan.collection.name}/${plan.item.slug}: ${mine.map(r => `${r.from} → ${r.to} (${r.field}, ${r.language})`).join("; ")}`)
    }
    await writeFile(new URL("report.csv", OUT), csv(rows, ["collection", "item", "field", "language", "from", "to"]))
    const missing = fixes.filter(f => !found.has(f.from)).map(f => f.from)
    if (missing.length) console.log(`::warning::Not found in the CMS (may be in an Embed layer on the blog template, which a person fixes in Framer): ${missing.join(", ")}`)
    if (left.length) console.log(`::warning::Dead links in Link fields with nothing to remove, left for a person:\n- ${left.join("\n- ")}`)

    if (apply && plans.length) {
        for (const plan of plans) {
            for (let attempt = 1; ; attempt++) {
                try {
                    const collection = (await framer.getCollections()).find(c => c.id === plan.collection.id)
                    await collection.addItems([{ id: plan.item.id, fieldData: plan.fieldData }])
                    break
                } catch (error) {
                    if (!error?.retryable || attempt === 4) throw new Error(`Saving ${plan.collection.name}/${plan.item.slug} failed: ${error.message}`)
                    await framer.disconnect().catch(() => {})
                    await new Promise(resolve => setTimeout(resolve, attempt * 5000))
                    framer = await openProject()
                }
            }
            console.log(`Saved ${plan.collection.name}/${plan.item.slug}.`)
        }
        // Read back: no saved item may still hold a dead link.
        const wrong = []
        for (const collection of targets) {
            const fresh = (await framer.getCollections()).find(c => c.id === collection.id)
            const byId = new Map((await fresh.getItems()).map(i => [i.id, i]))
            for (const plan of plans.filter(p => p.collection.id === collection.id)) {
                const saved = byId.get(plan.item.id)
                const still = Object.keys(plan.fieldData).some(id => {
                    const e = saved?.fieldData[id]
                    return [e?.value, ...Object.values(e?.valueByLocale ?? {}).filter(isSet).map(v => v.value)].some(v => fixLinks(v, fixes).changes.length)
                })
                if (still) wrong.push(`${collection.name}/${plan.item.slug}`)
            }
        }
        if (wrong.length) throw new Error(`Saved, but these still hold a dead link: ${wrong.join(", ")}. Check them in Framer.`)
        console.log("Checked: every saved item is free of the dead links.")
    }
    say(`${rows.length} links in ${plans.length} items ${apply ? "fixed" : "would be fixed"}.`)
} finally {
    await framer.disconnect().catch(() => {})
}
say(apply ? "Nothing was published: publish in Framer." : "Nothing was changed. Tick \"apply\" in the workflow to fix these links.")
