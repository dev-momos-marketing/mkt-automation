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
import { COLLECTION, FIELD_NAMES, batchesBySize, isFilled, openProject } from "./lib.mjs"
import { readLive } from "./live.mjs"
import { embedsForItem, ruleValueFor } from "./template.mjs"
import { MARKER, buildPost, sectionFields } from "./merge.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const undo = args.includes("--undo")
const overwrite = args.includes("--overwrite")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const BATCH = 20
// Framer closes the connection on a message that's too big (each post carries its Content and
// Embeds in every language, often 100–250 KB), so saves stay under this size.
const MAX_BATCH_BYTES = Number(process.env.BLOG_MAX_BATCH_BYTES) || 400_000
const OUT = new URL("../out/migrate/", import.meta.url)
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

// Framer's project session can close on its own (it does on long runs and after a big read), and
// may report it outside any call. That's noted here instead of stopping the run; the next call to
// Framer then fails and is retried over a fresh connection.
process.on("unhandledRejection", error => {
    if (!error?.retryable) throw error
    console.log(`Framer's session closed (${error.code ?? error.message}); the next step reconnects.`)
})

// The embeds come from the published site, read before connecting to Framer so the connection
// never sits idle. Their translations are labelled by language (fr, es, ja), which buildPost matches
// to the project's locales (fr-CA, es-ES, ja-JP).
const live = undo ? null : await readLive()

const targetsById = new Map()
let framer = await openProject()
try {
    const { fields, items, locales } = await retrying("reading the posts", async () => {
        const collection = await blogCollection()
        if (!collection) throw new Error(`No "${COLLECTION}" collection in Framer. Set BLOG_COLLECTION to its name.`)
        return {
            fields: await collection.getFields(),
            items: await collection.getItems(),
            locales: (await framer.getLocales()).map(l => ({ id: l.id, code: l.code })),
        }
    })
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field. Run the Blog setup workflow first.`) })()
    const content = field(FIELD_NAMES.content)
    const embedsField = field(FIELD_NAMES.embeds)
    const migrated = field(FIELD_NAMES.migrated)
    const unknown = chosen.filter(slug => !items.some(i => i.slug === slug))
    if (unknown.length) throw new Error(`No post with the slug ${unknown.join(", ")}.`)
    const targets = all ? items : chosen.map(slug => items.find(i => i.slug === slug))
    for (const t of targets) targetsById.set(t.id, t.slug)

    if (undo) {
        const updates = targets.map(i => ({ id: i.id, fieldData: { [migrated.id]: { type: "boolean", value: false } } }))
        if (apply) await save(updates)
        say(`${apply ? "Switched" : "Would switch"} Migrated off for ${targets.map(i => i.slug).join(", ")}: the template shows their old layout again. Content and Embeds are kept.`)
    } else {
        const sections = sectionFields(fields)
        const updates = []
        for (const item of targets) {
            const existing = item.fieldData[content.id]
            const own = embedsForItem(live.embeds, item)
            const post = buildPost({ fieldData: item.fieldData, sections, embeds: own, locales })
            // The rules compare a CMS field that usually holds the post's slug. Where it doesn't, say so.
            const ruleField = live.embeds.find(e => e.rule?.fieldId)?.rule
            const fieldValue = ruleField ? ruleValueFor(ruleField, item) : item.slug
            if (fieldValue !== item.slug) {
                const name = fields.find(f => f.id === ruleField.fieldId)?.name ?? ruleField.fieldId
                say(`Note: ${item.slug} has "${fieldValue}" in its ${name} field, which decides its embeds (${own.map(e => e.id).join(", ") || "none"}), as on the live site.`)
            }
            if (isFilled(existing) && !overwrite && existing.value !== post.content.value) {
                // Written by an earlier run (Framer tidies the HTML it saves, so it never matches exactly).
                // It's written again only if its embeds have changed, e.g. after a fix to which embeds
                // a post shows.
                const before = embedLines(existing.value)
                const now = embedLines(post.content.value)
                if (item.fieldData[migrated.id]?.value === true && before.join() !== now.join()) {
                    say(`Updating ${item.slug}: its embeds were ${before.join(", ") || "none"}, and are now ${now.join(", ") || "none"}, as on the live site.`)
                } else {
                    if (item.fieldData[migrated.id]?.value === true) say(`Already migrated: ${item.slug}.`)
                    else say(`Skipped ${item.slug}: its Content already has something in it (add --overwrite to replace it).`)
                    continue
                }
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
            await verify(content, updates)
        }
        say(`${updates.length} of ${targets.length} posts ${apply ? "written" : "would be written"}. Their old Section fields are unchanged.`)
    }
} finally {
    await framer.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Add --apply (or tick \"apply\" in the workflow) to write these posts.")

// Saves the posts in batches small enough for Framer. If Framer still closes the connection, it
// reconnects and tries again with the batch split in half, down to one post; a single post that
// keeps failing stops the run with its name. Saving a post again is harmless.
async function save(updates) {
    const slug = id => targetsById.get(id) ?? id
    let saved = 0
    const pending = batchesBySize(updates, MAX_BATCH_BYTES, BATCH)
    let failures = 0
    while (pending.length) {
        const batch = pending.shift()
        try {
            await (await blogCollection()).addItems(batch)
            saved += batch.length
            failures = 0
            console.log(`Saved ${saved} of ${updates.length} posts.`)
        } catch (error) {
            if (!error?.retryable) throw error
            failures++
            if (batch.length === 1 && failures >= 3) {
                throw new Error(`Framer keeps closing the connection while saving ${slug(batch[0].id)} (${error.code ?? error.message}). ${saved} posts were saved; run again to continue.`)
            }
            const halves = batch.length > 1 ? [batch.slice(0, Math.ceil(batch.length / 2)), batch.slice(Math.ceil(batch.length / 2))] : [batch]
            console.log(`Framer closed the connection (${error.code ?? error.message}) while saving ${batch.length} post${batch.length > 1 ? "s" : ""}; reconnecting and trying again${batch.length > 1 ? " in smaller batches" : ""}...`)
            pending.unshift(...halves)
            await reconnect(failures)
        }
    }
}

// Runs a read, reconnecting and trying again (up to 3 more times) if Framer's session closes.
async function retrying(what, read) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await read()
        } catch (error) {
            if (!error?.retryable || attempt === 4) throw error
            console.log(`Framer's session closed while ${what} (${error.code ?? error.message}); reconnecting (attempt ${attempt + 1} of 4)...`)
            await reconnect(attempt)
        }
    }
}

async function reconnect(attempt) {
    await new Promise(resolve => setTimeout(resolve, Math.min(attempt, 3) * 5000))
    await framer.disconnect().catch(() => {})
    framer = await openProject()
}

async function blogCollection() {
    return (await framer.getCollections()).find(c => c.name === COLLECTION)
}

function embedLines(html) {
    return [...String(html ?? "").matchAll(/⟦embed:([A-Za-z0-9_-]+)⟧/g)].map(m => m[1])
}

// Reads the posts back and checks that Content kept every embed line.
async function verify(content, updates) {
    const after = new Map((await retrying("checking the posts", async () => (await blogCollection()).getItems())).map(i => [i.id, i]))
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
