// Brings the Glossary's English text in line with the brand guide's tone of voice, from
// glossary-wording.json (see wording.mjs): hand-picked phrase edits (guests, agent, resolves) and
// each term's name in sentence case in its title, headings and labels. Translations are left as
// they are, with their status. A dry run unless --apply; never publishes, never deletes.
//
// Writes out/glossary-wording/report.csv: every text that changes, before and after.
//
// Usage: npm run glossary-wording [-- --apply] [-- --terms slug-a,slug-b]
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { csv, openProject } from "./lib.mjs"
import { applyWording, compileRules, sentenceCaseTitle } from "./wording.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const only = args.includes("--terms") ? (args[args.indexOf("--terms") + 1] ?? "").split(/[,\s]+/).filter(Boolean) : []
const OUT = new URL("../out/glossary-wording/", import.meta.url)
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const rules = compileRules(JSON.parse(await readFile(new URL("../glossary-wording.json", import.meta.url), "utf8")))
const TEXT_TYPES = new Set(["string", "formattedText"])
const short = (text, n = 220) => { const t = String(text).replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n)}…` : t }

let framer = await openProject()
try {
    const collections = await framer.getCollections()
    const name = process.env.GLOSSARY_COLLECTION
    const glossary = collections.find(c => name ? c.name === name : /glossary/i.test(c.name))
    if (!glossary) throw new Error(`No glossary collection${name ? ` called "${name}"` : ""}. Collections: ${collections.map(c => c.name).join(", ")}. Set GLOSSARY_COLLECTION.`)
    const fields = (await glossary.getFields()).filter(f => TEXT_TYPES.has(f.type))
    const items = (await glossary.getItems()).filter(i => !only.length || only.includes(i.slug))
    const missing = only.filter(slug => !items.some(i => i.slug === slug))
    if (missing.length) throw new Error(`No glossary term with the slug ${missing.join(", ")}.`)
    // The term's name: the title field, the string field most items fill with a short name.
    const titleField = fields.find(f => /^(title|name|term|heading)$/i.test(f.name) && f.type === "string")
    if (!titleField) throw new Error(`Can't tell which field holds the term's name. Text fields: ${fields.map(f => f.name).join(", ")}.`)
    say(`${glossary.name}: ${items.length} terms; text fields ${fields.map(f => f.name).join(", ")}; the name is in "${titleField.name}".`)

    const rows = []
    const plans = []
    const names = []
    for (const item of items) {
        const all = fields.map(f => String(item.fieldData[f.id]?.value ?? "")).join("\n").replace(/<[^>]+>/g, " ")
        const title = String(item.fieldData[titleField.id]?.value ?? "").trim()
        const from = title.replace(/\s*[(|].*$/, "").trim()
        const to = from ? sentenceCaseTitle(from, all, rules.keepNames) : from
        if (from !== to) names.push(`${from} → ${to}`)
        const fieldData = {}
        for (const field of fields) {
            const entry = item.fieldData[field.id]
            if (!entry || typeof entry.value !== "string") continue
            const { html, changes } = applyWording(entry.value, { phrases: rules.phrases, term: { from, to } })
            if (!changes.length) continue
            for (const c of changes) rows.push({ term: item.slug, field: field.name, rule: c.rule, before: c.before.trim(), after: c.after.trim() })
            const byLocale = Object.fromEntries(Object.entries(entry.valueByLocale ?? {})
                .filter(([, v]) => v && v.status !== "new")
                .map(([id, v]) => [id, { action: "ignore", needsReview: v.status === "needsReview" }]))
            fieldData[field.id] = {
                type: field.type, value: html,
                ...(field.type === "formattedText" ? { contentType: "html" } : {}),
                ...(Object.keys(byLocale).length ? { valueByLocale: byLocale } : {}),
            }
        }
        if (Object.keys(fieldData).length) plans.push({ item, fieldData })
    }

    say(`Term names in sentence case (${names.length}): ${names.join("; ")}.`)
    for (const plan of plans) {
        const mine = rows.filter(r => r.term === plan.item.slug)
        say(`${plan.item.slug}: ${mine.length} change${mine.length > 1 ? "s" : ""}`)
        for (const r of mine) console.log(`    [${r.field} · ${r.rule}]\n      - ${short(r.before)}\n      + ${short(r.after)}`)
    }
    await writeFile(new URL("report.csv", OUT), csv(rows, ["term", "field", "rule", "before", "after"]))
    // Every phrase edit should change something somewhere; one that doesn't is a typo in the list.
    const used = rules.phrases.filter(p => rows.some(r => r.after.includes(p.replace) && r.before.includes(p.find)))
    const unused = rules.phrases.filter(p => !used.includes(p)).map(p => p.find)
    if (unused.length && !only.length) console.log(`::warning::These phrase edits matched nothing (already done, or the text differs):\n- ${unused.join("\n- ")}`)

    if (apply && plans.length) {
        for (const plan of plans) {
            for (let attempt = 1; ; attempt++) {
                try {
                    const collection = (await framer.getCollections()).find(c => c.id === glossary.id)
                    await collection.addItems([{ id: plan.item.id, fieldData: plan.fieldData }])
                    break
                } catch (error) {
                    if (!error?.retryable || attempt === 4) throw new Error(`Saving ${plan.item.slug} failed: ${error.message}`)
                    await framer.disconnect().catch(() => {})
                    await new Promise(resolve => setTimeout(resolve, attempt * 5000))
                    framer = await openProject()
                }
            }
            console.log(`Saved ${plan.item.slug}.`)
        }
        // Read back: each saved field holds exactly the new text.
        const fresh = new Map((await (await framer.getCollections()).find(c => c.id === glossary.id).getItems()).map(i => [i.id, i]))
        const wrong = plans.filter(p => Object.entries(p.fieldData).some(([id, e]) => fresh.get(p.item.id)?.fieldData[id]?.value !== e.value)).map(p => p.item.slug)
        if (wrong.length) throw new Error(`Saved, but these terms don't hold the new text: ${wrong.join(", ")}. Check them in Framer.`)
        console.log("Checked: every saved term holds the new text.")
    }
    say(`${rows.length} texts in ${plans.length} terms ${apply ? "changed" : "would change"}.`)
} finally {
    await framer.disconnect().catch(() => {})
}
say(apply ? "Nothing was published: publish in Framer." : "Nothing was changed. Tick \"apply\" in the workflow to save these.")
