// Adds an FAQ section to the end of blog posts that don't have one: faqs/<slug>.json, written in
// this repo (see scripts/faq.mjs), goes after the post's English Content in Framer. A post that already
// has an FAQ heading is skipped, and so is a post written from posts/<slug>.html (add its FAQ to the
// file). An empty heading left at the very end of a post is removed first. Translations are kept and
// marked "needs review". A dry run unless --apply; never publishes.
//
// Usage: npm run faqs -- --all [--apply]
//        npm run faqs -- --posts slug-a,slug-b [--apply]
import { readFile, readdir } from "node:fs/promises"
import { COLLECTION, FIELD_NAMES } from "./lib.mjs"
import { FAQ_HEADING, checkFaq, dropTrailingHeadings, faqHtml } from "./faq.mjs"
import { openBlogSession } from "./session.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const all = args.includes("--all")
const chosen = (args[args.indexOf("--posts") + 1] ?? "").split(/[,\s]+/).filter(s => s && args.includes("--posts"))
if (!all && !chosen.length) throw new Error("Name the posts: --posts slug-a,slug-b (or --all).")
const say = text => console.log(`${apply ? "" : "[dry run] "}${text}`)

const dir = new URL("../faqs/", import.meta.url)
const files = (await readdir(dir)).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, ""))
const slugs = all ? files : chosen
const missing = slugs.filter(s => !files.includes(s))
if (missing.length) throw new Error(`No faqs/<slug>.json for ${missing.join(", ")}.`)
const written = new Set((await readdir(new URL("../posts/", import.meta.url)).catch(() => [])).filter(f => f.endsWith(".html")).map(f => f.replace(/\.html$/, "")))

const session = await openBlogSession()
try {
    const { fields, items, locales } = await session.read()
    const content = fields.find(f => f.name === FIELD_NAMES.content) ?? (() => { throw new Error(`"${COLLECTION}" has no "${FIELD_NAMES.content}" field.`) })()
    const updates = []
    const problems = []
    let skipped = 0
    for (const slug of slugs) {
        const item = items.find(i => i.slug === slug)
        if (!item) { problems.push(`${slug}: no post with this slug`); continue }
        const html = String(item.fieldData[content.id]?.value ?? "")
        if (written.has(slug)) { say(`Skipped ${slug}: it's written from posts/${slug}.html, so its FAQ goes in that file.`); skipped++; continue }
        if (FAQ_HEADING.test(html)) { say(`Skipped ${slug}: it already has an FAQ.`); skipped++; continue }
        if (!html.trim()) { problems.push(`${slug}: its Content is empty`); continue }
        const faq = JSON.parse(await readFile(new URL(`${slug}.json`, dir), "utf8"))
        const found = checkFaq(faq, html.replace(/<[^>]+>/g, " "))
        if (found.length) { problems.push(...found.map(p => `${slug}: ${p}`)); continue }
        const { html: body, removed } = dropTrailingHeadings(html)
        const translated = Object.entries(item.fieldData[content.id]?.valueByLocale ?? {}).filter(([, v]) => v && v.status !== "new").map(([id]) => id)
        updates.push({
            id: item.id, slug,
            fieldData: { [content.id]: {
                type: "formattedText", value: body + faqHtml(faq), contentType: "html",
                valueByLocale: Object.fromEntries(translated.map(id => [id, { action: "ignore", needsReview: true }])),
            } },
        })
        say(`${apply ? "Adding" : "Would add"} to ${slug}: "${faq.heading}" with ${faq.questions.length} questions: ${faq.questions.map(q => q.q).join(" | ")}` +
            `${removed.length ? `; removes the empty heading${removed.length > 1 ? "s" : ""} at the end: ${removed.map(r => `"${r}"`).join(", ")}` : ""}` +
            `${translated.length ? ` (translations marked for review: ${translated.map(id => locales.find(l => l.id === id)?.code ?? id).join(", ")})` : ""}`)
    }
    if (problems.length) throw new Error(`Fix these first, nothing was written:\n- ${problems.join("\n- ")}`)
    if (apply && updates.length) {
        await session.save(updates.map(({ id, fieldData }) => ({ id, fieldData })))
        const after = await session.readBack()
        const lost = updates.filter(u => !FAQ_HEADING.test(String(after.get(u.id)?.fieldData[content.id]?.value ?? "")))
        if (lost.length) throw new Error(`Saved, but the FAQ isn't in ${lost.map(u => u.slug).join(", ")}. Check those posts.`)
        console.log("Checked: every FAQ is in the saved posts.")
    }
    say(`${updates.length} posts ${apply ? "got" : "would get"} an FAQ; ${skipped} skipped.`)
} finally {
    await session.disconnect()
}
say(apply ? "Nothing was published." : "Nothing was changed. Tick \"apply\" in the workflow to add these FAQs.")
