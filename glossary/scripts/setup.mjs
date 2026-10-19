// One-time: creates the Glossary CMS collection and its fields in Framer, or adds the fields it's
// missing. Never removes or changes a field that's already there.
// Usage: npm run setup [-- --dry-run]
import { findCollection, loadConfig, openProject } from "./lib.mjs"

const dryRun = process.argv.includes("--dry-run")
const config = await loadConfig()

const framer = await openProject()
try {
    let collection = await findCollection(framer, config.collection)
    if (!collection && dryRun) {
        console.log(`Would create the "${config.collection}" collection with: ${Object.values(config.fields).map(f => f.name).join(", ")}.`)
    } else {
        if (!collection) {
            collection = await framer.createCollection(config.collection)
            console.log(`Created the "${config.collection}" collection.`)
        }
        await addMissingFields(collection)
    }
} finally {
    await framer.disconnect()
}

async function addMissingFields(collection) {
    const existing = new Map((await collection.getFields()).map(f => [f.name, f]))
    const toAdd = []
    for (const { name, type } of Object.values(config.fields)) {
        const field = existing.get(name)
        if (field && field.type !== type) {
            throw new Error(`"${name}" is a ${field.type} field in Framer, but glossary.config.json expects ${type}. Fix it in Framer, then re-run.`)
        }
        if (field) continue
        if (type === "enum") toAdd.push({ type, name, cases: config.categories.map(c => ({ name: c })) })
        else if (type === "multiCollectionReference") toAdd.push({ type, name, collectionId: collection.id })
        else toAdd.push({ type, name })
    }

    const category = existing.get(config.fields.category.name)
    const missingCases = category ? config.categories.filter(c => !category.cases.some(k => k.name === c)) : []
    if (missingCases.length) {
        console.warn(`Add these options to "${category.name}" in Framer by hand: ${missingCases.join(", ")}`)
    }

    if (!toAdd.length) {
        console.log(`"${config.collection}" already has every field.`)
    } else if (dryRun) {
        console.log(`Would add: ${toAdd.map(f => `${f.name} (${f.type})`).join(", ")}`)
    } else {
        await collection.addFields(toAdd)
        console.log(`Added: ${toAdd.map(f => `${f.name} (${f.type})`).join(", ")}`)
    }
}
