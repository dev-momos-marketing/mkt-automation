// Removes the old layout's fields (Section Title N and Section N) from the Blog collection, now that
// every post uses Content. Before anything is removed it
//   1. checks that the published blog template no longer refers to any of them,
//   2. writes every post's values for them, with translations, to out/old-fields/backup.json.
// A dry run unless both --apply and --yes-delete are given. Removing fields can't be undone in
// Framer; the backup is the way back. Never removes other fields, never publishes.
//
// Usage: npm run remove-old-fields                         dry run: lists the fields, checks, backs up
//        npm run remove-old-fields -- --apply --yes-delete
import { mkdir, writeFile } from "node:fs/promises"
import { SITE } from "./live.mjs"
import { idsUsedIn, oldSectionFields } from "./old-fields.mjs"
import { isFilled } from "./lib.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply") && args.includes("--yes-delete")
if (args.includes("--apply") && !apply) throw new Error("Removing fields can't be undone: add --yes-delete as well as --apply (in the workflow, type DELETE).")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)
const OUT = new URL("../out/old-fields/", import.meta.url)
await mkdir(OUT, { recursive: true })

const session = await openBlogSession()
try {
    const { fields, items } = await session.read()
    const old = oldSectionFields(fields)
    if (!old.length) { say("No old Section fields left in the collection. Nothing to do."); process.exit(0) }
    const filled = f => items.filter(i => isFilled(i.fieldData[f.id])).length
    say(`${old.length} old fields: ${old.map(f => `${f.name} (${filled(f)} posts)`).join(", ")}.`)
    say(`Kept: ${fields.filter(f => !old.includes(f)).map(f => f.name).join(", ")}.`)

    // 1. The published template must not refer to them any more (its code names fields by id).
    const post = items.find(i => !i.draft)
    const page = await (await fetch(`${SITE}/blog/${post.slug}`, { headers: { "user-agent": "Mozilla/5.0 momos-blog-migration" } })).text()
    const modules = [...new Set(page.match(/https:\/\/framerusercontent\.com\/sites\/[^"'\s]+\.mjs/g) ?? [])]
    if (!modules.length) throw new Error(`Couldn't read the published template's code from ${SITE}/blog/${post.slug}; nothing was removed.`)
    const code = await Promise.all(modules.map(async u => (await fetch(u)).text()))
    const stillUsed = idsUsedIn(code, old.map(f => f.id)).map(id => old.find(f => f.id === id).name)
    if (stillUsed.length) throw new Error(`The published blog template still uses ${stillUsed.join(", ")}. Delete those layers in Framer and publish first; nothing was removed.`)
    say(`Checked: the published template (${modules.length} scripts) uses none of them.`)

    // 2. Backup of every value, translations included.
    const backup = {
        collection: "Blog", savedAt: new Date().toISOString(),
        fields: old.map(f => ({ id: f.id, name: f.name, type: f.type })),
        items: items.map(i => ({ id: i.id, slug: i.slug, values: Object.fromEntries(old.filter(f => i.fieldData[f.id] !== undefined).map(f => [f.name, i.fieldData[f.id]])) })),
    }
    await writeFile(new URL("backup.json", OUT), JSON.stringify(backup, null, 1))
    say(`Backed up ${old.length} fields for ${items.length} posts to out/old-fields/backup.json (the blog-old-fields download).`)

    if (apply) {
        const left = await session.removeFields(old.map(f => f.id))
        const remaining = left.filter(f => old.some(o => o.id === f.id))
        if (remaining.length) throw new Error(`Framer kept ${remaining.map(f => f.name).join(", ")}. Check the collection.`)
        console.log(`Removed ${old.length} fields. The collection now has: ${left.map(f => f.name).join(", ")}.`)
    }
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was removed. Tick \"apply\" and type DELETE in the workflow to remove these fields.")
