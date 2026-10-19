// Copies every term in terms/ into the Glossary CMS collection in Framer: creates new terms and
// overwrites existing ones (matched by slug). Never deletes and never publishes the site: a person
// clicks Publish in Framer.
// Usage: npm run sync [-- --dry-run]
import { findCollection, loadConfig, loadTerms, openProject, termValues, toFieldEntry, validateTerms } from "./lib.mjs"

const dryRun = process.argv.includes("--dry-run")
const BATCH = 100

const config = await loadConfig()
const terms = await loadTerms()
const { errors } = validateTerms(terms, config)
if (errors.length) {
    for (const e of errors) console.error(`error    ${e}`)
    throw new Error(`${errors.length} error(s) in terms/. Run npm run check.`)
}

const framer = await openProject()
try {
    const collection = await findCollection(framer, config.collection)
    if (!collection) throw new Error(`No "${config.collection}" collection in Framer. Run npm run setup first.`)

    const framerFields = new Map((await collection.getFields()).map(f => [f.name, f]))
    const fields = {}
    for (const [key, { name }] of Object.entries(config.fields)) {
        fields[key] = framerFields.get(name)
        if (!fields[key]) throw new Error(`"${config.collection}" has no "${name}" field. Run npm run setup.`)
    }

    const before = new Map((await collection.getItems()).map(i => [i.slug, i]))
    const items = terms.map(t => {
        const fieldData = {}
        for (const [key, value] of Object.entries(termValues(t))) {
            fieldData[fields[key].id] = toFieldEntry(fields[key], value)
        }
        const existing = before.get(t.slug)
        const draft = t.frontmatter.draft ?? false
        return existing ? { id: existing.id, slug: t.slug, draft, fieldData } : { slug: t.slug, draft, fieldData }
    })

    const created = terms.filter(t => !before.has(t.slug)).map(t => t.slug)
    const orphans = [...before.keys()].filter(slug => !terms.some(t => t.slug === slug))

    if (dryRun) {
        console.log(`Dry run: nothing was saved.`)
        console.log(`Would create ${created.length}: ${created.join(", ") || "none"}`)
        console.log(`Would update ${terms.length - created.length}.`)
    } else {
        for (let i = 0; i < items.length; i += BATCH) await collection.addItems(items.slice(i, i + BATCH))

        // Related terms point at other items by Framer ID, so they go in once every term exists.
        const ids = new Map((await collection.getItems()).map(i => [i.slug, i.id]))
        const related = terms.map(t => ({
            id: ids.get(t.slug),
            fieldData: { [fields.related.id]: toFieldEntry(fields.related, (t.frontmatter.related ?? []).map(s => ids.get(s))) },
        }))
        for (let i = 0; i < related.length; i += BATCH) await collection.addItems(related.slice(i, i + BATCH))

        console.log(`Synced ${terms.length} terms (${created.length} new: ${created.join(", ") || "none"}).`)
        console.log(`Nothing is live until someone clicks Publish in Framer: ${process.env.FRAMER_PROJECT_URL}`)
    }

    if (orphans.length) {
        console.warn(`\nIn Framer but not in terms/ (left alone; delete them in Framer and add a redirect if they were live): ${orphans.join(", ")}`)
    }
} finally {
    await framer.disconnect()
}
