// Step 2 of the blog migration: adds the two fields the migration needs to the Blog collection, and
// creates or updates the HtmlEmbed code component from framer/HtmlEmbed.tsx.
//
//   Content    formatted text   each post's merged body (filled in by the migration, step 5)
//   Migrated   on/off           which posts the template shows in the new layout
//
// A dry run unless --apply is given. Never removes or changes an existing field, never touches other
// collections or code files, and never publishes.
//
// Usage: npm run setup            (dry run: says what it would do)
//        npm run setup -- --apply (does it)
import { readFile } from "node:fs/promises"
import { COLLECTION, isFilled, openProject } from "./lib.mjs"

const apply = process.argv.includes("--apply")
const FIELDS = [
    { name: process.env.BLOG_CONTENT_FIELD || "Content", type: "formattedText" },
    { name: process.env.BLOG_MIGRATED_FIELD || "Migrated", type: "boolean" },
]
const CODE_FILE = "HtmlEmbed.tsx"
// A new component version takes a while (up to a minute or more) to become the current one.
const SETTLE_MS = Number(process.env.SETTLE_MS) || 75_000

const code = await readFile(new URL("../framer/HtmlEmbed.tsx", import.meta.url), "utf8")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

let codeChanged = false
const framer = await openProject()
try {
    const collection = (await framer.getCollections()).find(c => c.name === COLLECTION)
    if (!collection) throw new Error(`No "${COLLECTION}" collection in Framer. Set BLOG_COLLECTION to its name.`)
    await addFields(collection)
    codeChanged = await syncCodeFile()
} finally {
    await framer.disconnect()
}
if (codeChanged) await confirmCodeFile()
say(apply ? "Done. Nothing was published." : "Nothing was changed. Run with --apply (or tick \"apply\" in the workflow) to make these changes.")

async function addFields(collection) {
    const existing = new Map((await collection.getFields()).map(f => [f.name, f]))
    const toAdd = []
    for (const { name, type } of FIELDS) {
        const field = existing.get(name)
        if (!field) {
            toAdd.push({ name, type })
            continue
        }
        if (field.type !== type) {
            throw new Error(`"${COLLECTION}" already has a ${field.type} field called "${name}"; the migration needs a ${type} field. Pick another name with the BLOG_CONTENT_FIELD or BLOG_MIGRATED_FIELD variable, then run again.`)
        }
        // An existing Content field is only safe to use if it's empty: the migration overwrites it.
        if (type === "formattedText") {
            const used = (await collection.getItems()).filter(item => isFilled(item.fieldData[field.id]))
            if (used.length) {
                throw new Error(`"${name}" already exists and ${used.length} posts fill it in (${used.slice(0, 3).map(i => i.slug).join(", ")}…). The migration would overwrite it. Pick another name with BLOG_CONTENT_FIELD, then run again.`)
            }
        }
        say(`"${name}" (${type}) is already there${type === "formattedText" ? ", and empty" : ""}.`)
    }
    if (!toAdd.length) return
    if (apply) await collection.addFields(toAdd)
    say(`${apply ? "Added" : "Would add"} to "${COLLECTION}": ${toAdd.map(f => `${f.name} (${f.type})`).join(", ")}.`)
}

// Creates or updates the component, then type-checks it. On a type error, puts it back as it was.
async function syncCodeFile() {
    const file = (await framer.getCodeFiles()).find(f => f.name === CODE_FILE || f.path === CODE_FILE) ?? (await framer.getCodeFile(CODE_FILE))
    if (file?.content === code) {
        say(`The ${CODE_FILE} code component is already up to date.`)
        return false
    }
    if (!apply) {
        say(`Would ${file ? "update" : "create"} the ${CODE_FILE} code component${file ? " (the copy in Framer differs from framer/HtmlEmbed.tsx and would be replaced)" : ""}.`)
        return false
    }
    const saved = file ? await file.setFileContent(code) : await framer.createCodeFile(CODE_FILE, code)
    // TypeScript's DiagnosticCategory: 1 is an error; warnings and suggestions don't block.
    const errors = (await saved.typecheck()).filter(d => d.category === 1)
    if (errors.length) {
        if (file) await saved.setFileContent(file.content)
        else await saved.remove()
        throw new Error(`${CODE_FILE} has type errors in Framer, so it was put back as it was:\n${errors.map(d => d.message ?? JSON.stringify(d)).join("\n")}`)
    }
    say(`${file ? "Updated" : "Created"} the ${CODE_FILE} code component.`)
    return true
}

// Waits for the new version to become current, then checks it from a fresh connection, writing it
// once more if it didn't take.
async function confirmCodeFile() {
    for (let attempt = 1; attempt <= 2; attempt++) {
        console.log(`Waiting ${SETTLE_MS / 1000}s to confirm ${CODE_FILE} in Framer...`)
        await new Promise(resolve => setTimeout(resolve, SETTLE_MS))
        const check = await openProject()
        try {
            const file = await check.getCodeFile(CODE_FILE)
            if (file?.content === code) {
                console.log(`Confirmed: ${CODE_FILE} is current in Framer.`)
                return
            }
            if (attempt === 2) throw new Error(`${CODE_FILE} still isn't current in Framer. Reload any open Framer tabs and run the workflow again.`)
            await file?.setFileContent(code)
        } finally {
            await check.disconnect()
        }
    }
}
