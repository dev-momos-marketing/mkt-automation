// Adds internal links to the blog posts' Content: to other blog posts and to glossary terms, where
// their topic is mentioned. A few per post, in the English text; see linking.mjs for the rules.
// A dry run unless --apply is given; never publishes.
//
// Writes out/links/report.csv: every link, with the sentence it sits in.
//
// Usage: npm run links -- --all [--max 4] [--apply]
//        npm run links -- --posts slug-a,slug-b [--apply]
import { mkdir, rm, writeFile } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES, csv, isFilled } from "./lib.mjs"
import { addLinks, buildTargets, linkedPaths } from "./linking.mjs"
import { SITE } from "./live.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
const max = Number(args[args.indexOf("--max") + 1]) || 4
if (!all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const OUT = new URL("../out/links/", import.meta.url)
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

// Glossary terms, from the site's sitemap (read before connecting to Framer).
const sitemap = await (await fetch(`${SITE}/sitemap_en.xml`, { headers: { "user-agent": "Mozilla/5.0 momos-blog-migration" } })).text()
const glossary = [...new Set([...sitemap.matchAll(/<loc>[^<]*\/glossary\/([a-z0-9-]+)\/?<\/loc>/gi)].map(m => m[1]))]
    .map(slug => ({ slug, url: `/glossary/${slug}`, kind: "glossary" }))

const session = await openBlogSession()
try {
    const { fields, items } = await session.read()
    const field = name => fields.find(f => f.name === name) ?? (() => { throw new Error(`"${COLLECTION}" has no "${name}" field.`) })()
    const content = field(FIELD_NAMES.content)
    const migrated = field(FIELD_NAMES.migrated)
    const titleField = fields.find(f => /^(title|name|heading)$/i.test(f.name) && f.type === "string" && items.some(i => isFilled(i.fieldData[f.id])))
    // Link targets: published posts (not drafts or "-copy" duplicates) and the glossary.
    const posts = items
        .filter(i => !i.draft && !/-copy(-copy)*$/.test(i.slug))
        .map(i => ({ slug: i.slug, title: String(i.fieldData[titleField?.id]?.value ?? ""), url: `/blog/${i.slug}`, kind: "blog" }))
    const targets = buildTargets([...posts, ...glossary])
    console.log(`${targets.size} link targets: ${[...targets.values()].filter(t => t.kind === "blog").length} from blog posts, ${[...targets.values()].filter(t => t.kind === "glossary").length} from ${glossary.length} glossary terms.`)

    const unknown = chosen.filter(slug => !items.some(i => i.slug === slug))
    if (unknown.length) throw new Error(`No post with the slug ${unknown.join(", ")}.`)
    const sources = (all ? items : chosen.map(slug => items.find(i => i.slug === slug)))
        .filter(i => !i.draft && i.fieldData[migrated.id]?.value === true && isFilled(i.fieldData[content.id]))

    const rows = []
    const updates = []
    for (const item of sources) {
        const { html, added } = addLinks(item.fieldData[content.id].value, targets, { self: `/blog/${item.slug}`, max })
        if (!added.length) continue
        for (const a of added) rows.push({ post: item.slug, anchor: a.phrase, link: a.url, sentence: a.context })
        updates.push({ id: item.id, slug: item.slug, urls: added.map(a => a.url), fieldData: { [content.id]: { type: "formattedText", value: html, contentType: "html" } } })
        say(`${item.slug}: ${added.map(a => `"${a.phrase}" → ${a.url}`).join("; ")}`)
    }
    await writeFile(new URL("report.csv", OUT), csv(rows, ["post", "anchor", "link", "sentence"]))

    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const missing = updates.filter(u => u.urls.some(url => !linkedPaths(after.get(u.id)?.fieldData[content.id]?.value ?? "").has(url)))
        if (missing.length) throw new Error(`Saved, but some links aren't in the saved text: ${missing.map(u => u.slug).join(", ")}. Check those posts.`)
        console.log("Checked: every link is in the saved posts.")
    }
    say(`${rows.length} links in ${updates.length} of ${sources.length} posts (at most ${max} new per post). English text only; translations are unchanged.`)
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Add --apply (or tick \"apply\" in the workflow) to add these links. The full list is in the blog-links download (report.csv).")
