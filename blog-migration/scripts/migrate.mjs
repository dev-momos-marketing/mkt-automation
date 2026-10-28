// Step 5 of the blog migration: writes each chosen post's merged body into its new fields, and
// switches it to the new layout.
//
//   Content    the post's Section Title N / Section N pairs as one body, with an ⟦embed:…⟧ line where
//              each of its embeds goes, plus each fully translated language
//   Embeds     the code of each of those embeds (and their translations), which BlogEmbeds puts in place
//   Migrated   on
//
// The embeds come from the published site (their code, post and place), the text from Framer. Never
// changes the old Section fields, never publishes, and skips a post whose Content already has
// something in it unless --overwrite is given. A dry run unless --apply is given.
//
// Usage: npm run migrate -- --posts slug-a,slug-b            dry run for these posts
//        npm run migrate -- --posts slug-a,slug-b --apply    write them
//        npm run migrate -- --all [--apply]                  every post
//        npm run migrate -- --posts slug-a --undo [--apply]  switch Migrated off again (keeps Content)
import { mkdir, rm, writeFile } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES, isFilled, openProject } from "./lib.mjs"
import { readLive } from "./live.mjs"
import { MARKER, buildPost, sectionFields } from "./merge.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const undo = args.includes("--undo")
const overwrite = args.includes("--overwrite")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const BATCH = 20
const OUT = new URL("../out/migrate/", import.meta.url)
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

let framer = await openProject()
try {
    const collection = (await framer.getCollections()).find(c => c.name === COLLECTION)
    if (!collection) throw new Error(`No "${COLLECTION}" collection in Framer. Set BLOG_COLLECTION to its name.`)
    const fields = await collection.getFields()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field. Run the Blog setup workflow first.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsField = field(FIELD_NAMES.embeds)
    const migrated = field(FIELD_NAMES.migrated)
    const items = await collection.getItems()
    const unknown = chosen.filter(slug => !items.some(i => i.slug === slug))
    if (unknown.length) throw new Error(`No post with the slug ${unknown.join(", ")}.`)
    const targets = all ? items : chosen.map(slug => items.find(i => i.slug === slug))

    if (undo) {
        const updates = targets.map(i => ({ id: i.id, fieldData: { [migrated.id]: { type: "boolean", value: false } } }))
        if (apply) await save(updates)
        say(`${apply ? "Switched" : "Would switch"} Migrated off for ${targets.map(i => i.slug).join(", ")}: the template shows their old layout again. Content and Embeds are kept.`)
    } else {
        const locales = (await framer.getLocales()).map(l => ({ id: l.id, code: l.code }))
        const live = await readLive({ localeNames: new Map(locales.map(l => [l.id, l.code])) })
        const sections = sectionFields(fields)
        const updates = []
        for (const item of targets) {
            const existing = item.fieldData[content.id]
            const post = buildPost({ fieldData: item.fieldData, sections, embeds: live.embeds.filter(e => e.posts.includes(item.slug)), locales })
            if (isFilled(existing) && !overwrite && existing.value !== post.content.value) {
                // Written by an earlier run (Framer tidies the HTML it saves, so it never matches exactly).
                if (item.fieldData[migrated.id]?.value === true) say(`Already migrated: ${item.slug}.`)
                else say(`Skipped ${item.slug}: its Content already has something in it (add --overwrite to replace it).`)
                continue
            }
            const markers = [...post.content.value.matchAll(MARKER)].length
            await writeFile(new URL(`${item.slug}.content.html`, OUT), `${post.content.value}\n`)
            await writeFile(new URL(`${item.slug}.embeds.html`, OUT), `${post.embeds.value}\n`)
            updates.push({
                id: item.id,
                fieldData: {
                    [content.id]: { type: "formattedText", value: post.content.value, contentType: "html", valueByLocale: post.content.valueByLocale },
                    [embedsField.id]: { type: "string", value: post.embeds.value, valueByLocale: post.embeds.valueByLocale },
                    [migrated.id]: { type: "boolean", value: true },
                },
            })
            say(`${apply ? "Writing" : "Would write"} ${item.slug}${item.draft ? " (draft)" : ""}: ${post.english.sections} sections, ${markers} embeds, ${(Buffer.byteLength(post.content.value) / 1024).toFixed(1)} KB` +
                `; translated: ${post.languages.join(", ") || "none"}${post.untranslated.length ? `; left in English: ${post.untranslated.join(", ")}` : ""}` +
                `${post.english.warnings.length ? `; ${post.english.warnings.join("; ")}` : ""}.`)
        }
        if (apply && updates.length) {
            await save(updates)
            await verify(await blogCollection(), content, updates)
        }
        say(`${updates.length} of ${targets.length} posts ${apply ? "written" : "would be written"}. Their old Section fields are unchanged.`)
    }
} finally {
    await framer.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Add --apply (or tick \"apply\" in the workflow) to write these posts.")

// Saves the posts in batches. Framer sometimes closes the connection on long runs; then it
// reconnects and carries on from the batch that didn't go through (saving a post again is harmless).
async function save(updates) {
    for (let i = 0; i < updates.length; i += BATCH) {
        for (let attempt = 1; ; attempt++) {
            try {
                await (await blogCollection()).addItems(updates.slice(i, i + BATCH))
                break
            } catch (error) {
                if (!error?.retryable || attempt === 4) throw error
                console.log(`Framer closed the connection (${error.code ?? error.message}); reconnecting to save posts ${i + 1}–${Math.min(i + BATCH, updates.length)} again (attempt ${attempt + 1} of 4)...`)
                await new Promise(resolve => setTimeout(resolve, attempt * 5000))
                await framer.disconnect().catch(() => {})
                framer = await openProject()
            }
        }
    }
}

async function blogCollection() {
    return (await framer.getCollections()).find(c => c.name === COLLECTION)
}

// Reads the posts back and checks that Content kept every embed line.
async function verify(collection, content, updates) {
    const after = new Map((await collection.getItems()).map(i => [i.id, i]))
    const problems = []
    for (const u of updates) {
        const wanted = [...u.fieldData[content.id].value.matchAll(MARKER)].length
        const stored = String(after.get(u.id)?.fieldData[content.id]?.value ?? "")
        const found = (stored.match(/⟦embed:[A-Za-z0-9_-]+⟧/g) ?? []).length
        if (!stored || found !== wanted) problems.push(`${after.get(u.id)?.slug ?? u.id}: ${found} of ${wanted} embed lines kept`)
    }
    if (problems.length) throw new Error(`Written, but Framer changed some of it: ${problems.join("; ")}. Check those posts, or switch them back with --undo.`)
    console.log(`Checked: every post's Content is saved with all its embed lines.`)
}
