// Step 2 of the blog migration: adds the fields the migration needs to the Blog collection, and
// creates or updates the code components in framer/.
//
//   Content    formatted text   each post's merged body, with an ⟦embed:…⟧ line where each embed goes
//   Embeds     plain text       the code of each of the post's embeds, which BlogEmbeds puts in place
//   Migrated   on/off           which posts the template shows in the new layout
//
//   BlogEmbeds.tsx   on the blog template: puts each embed at its ⟦embed:…⟧ line
//   HtmlEmbed.tsx    a single embed, for use anywhere on the site
//
// A dry run unless --apply is given. Never removes or changes an existing field, never touches other
// collections or code files, and never publishes.
//
// Usage: npm run setup            (dry run: says what it would do)
//        npm run setup -- --apply (does it)
import { readFile } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES, isFilled, openProject } from "./lib.mjs"

const apply = process.argv.includes("--apply")
const FIELDS = [
    { name: FIELD_NAMES.content, type: "formattedText", variable: "BLOG_CONTENT_FIELD" },
    { name: FIELD_NAMES.embeds, type: "string", variable: "BLOG_EMBEDS_FIELD" },
    { name: FIELD_NAMES.migrated, type: "boolean", variable: "BLOG_MIGRATED_FIELD" },
]
const CODE_FILES = ["BlogEmbeds.tsx", "HtmlEmbed.tsx"]
// A new component version takes a while (up to a minute or more) to become the current one.
const SETTLE_MS = Number(process.env.SETTLE_MS) || 75_000

const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

const code = Object.fromEntries(await Promise.all(CODE_FILES.map(async name => [name, await readFile(new URL(`../framer/${name}`, import.meta.url), "utf8")])))
const changed = []
const framer = await openProject()
try {
    const collection = (await framer.getCollections()).find(c => c.name === COLLECTION)
    if (!collection) throw new Error(`No "${COLLECTION}" collection in Framer. Set BLOG_COLLECTION to its name.`)
    await addFields(collection)
    for (const name of CODE_FILES) if (await syncCodeFile(framer, name, code[name])) changed.push(name)
} finally {
    await framer.disconnect()
}
if (changed.length) await confirmCodeFiles(changed, code)
say(apply ? "Done. Nothing was published." : "Nothing was changed. Run with --apply (or tick \"apply\" in the workflow) to make these changes.")

async function addFields(collection) {
    const existing = new Map((await collection.getFields()).map(f => [f.name, f]))
    // Fields made by an earlier setup run come with Migrated. Without it, a Content or Embeds field
    // that's already there belongs to someone else, and is only safe to use if it's empty.
    const ours = existing.get(FIELD_NAMES.migrated)?.type === "boolean"
    const items = ours ? [] : await collection.getItems()
    const toAdd = []
    for (const { name, type, variable } of FIELDS) {
        const field = existing.get(name)
        if (!field) {
            toAdd.push({ name, type })
            continue
        }
        if (field.type !== type) {
            throw new Error(`"${COLLECTION}" already has a ${field.type} field called "${name}"; the migration needs a ${type} field. Pick another name with the ${variable} variable, then run again.`)
        }
        const used = type === "boolean" ? [] : items.filter(item => isFilled(item.fieldData[field.id]))
        if (used.length) {
            throw new Error(`"${name}" already exists and ${used.length} posts fill it in (${used.slice(0, 3).map(i => i.slug).join(", ")}…). The migration would overwrite it. Pick another name with the ${variable} variable, then run again.`)
        }
        say(`"${name}" (${type}) is already there.`)
    }
    if (!toAdd.length) return
    if (apply) await collection.addFields(toAdd)
    say(`${apply ? "Added" : "Would add"} to "${COLLECTION}": ${toAdd.map(f => `${f.name} (${f.type})`).join(", ")}.`)
}

// Creates or updates a component, then type-checks it. On a type error, puts it back as it was.
async function syncCodeFile(framer, name, code) {
    const file = (await framer.getCodeFiles()).find(f => f.name === name || f.path === name) ?? (await framer.getCodeFile(name))
    if (file?.content === code) {
        say(`The ${name} code component is already up to date.`)
        return false
    }
    if (!apply) {
        say(`Would ${file ? "update" : "create"} the ${name} code component${file ? ` (the copy in Framer differs from framer/${name} and would be replaced)` : ""}.`)
        return false
    }
    const saved = file ? await file.setFileContent(code) : await framer.createCodeFile(name, code)
    // TypeScript's DiagnosticCategory: 1 is an error; warnings and suggestions don't block.
    const errors = (await saved.typecheck()).filter(d => d.category === 1)
    if (errors.length) {
        if (file) await saved.setFileContent(file.content)
        else await saved.remove()
        throw new Error(`${name} has type errors in Framer, so it was put back as it was:\n${errors.map(d => d.message ?? JSON.stringify(d)).join("\n")}`)
    }
    say(`${file ? "Updated" : "Created"} the ${name} code component.`)
    return true
}

// Waits for the new versions to become current, then checks them from a fresh connection, writing
// any that didn't take once more.
async function confirmCodeFiles(names, code) {
    let pending = names
    for (let attempt = 1; attempt <= 2; attempt++) {
        console.log(`Waiting ${SETTLE_MS / 1000}s to confirm ${pending.join(", ")} in Framer...`)
        await new Promise(resolve => setTimeout(resolve, SETTLE_MS))
        const check = await openProject()
        try {
            const stale = []
            for (const name of pending) if ((await check.getCodeFile(name))?.content !== code[name]) stale.push(name)
            if (!stale.length) {
                console.log(`Confirmed: ${names.join(", ")} ${names.length > 1 ? "are" : "is"} current in Framer.`)
                return
            }
            if (attempt === 2) throw new Error(`${stale.join(", ")} still ${stale.length > 1 ? "aren't" : "isn't"} current in Framer. Reload any open Framer tabs and run the workflow again.`)
            for (const name of stale) await (await check.getCodeFile(name))?.setFileContent(code[name])
            pending = stale
        } finally {
            await check.disconnect()
        }
    }
}
