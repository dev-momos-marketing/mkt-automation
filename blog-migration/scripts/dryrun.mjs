// Step 4 of the blog migration: builds every post's single body, in every language, and writes it
// to files for review. Writes nothing to Framer.
//
// Reads what the inventory and embeds steps wrote: out/blog-items.json (every post's fields and
// translations, from Framer's API) and out/live/embeds.json (every embed's post and place, from the
// published site). Writes to out/dryrun/:
//   index.html                   every post, with its numbers, warnings and links to its previews
//   preview/<slug>.<lang>.html   the merged post as it would read, embeds shown in place
//   content/<slug>.<lang>.html   the exact value the migration would write into the Content field
//   report.csv                   the same numbers as the index
//   summary.md                   the headline numbers (also appended to out/summary.md)
//
// Usage: npm run dryrun (after npm run inventory and npm run embeds)
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { csv } from "./lib.mjs"
import { MARKER, mergePost, sectionFields, wordCount } from "./merge.mjs"

const OUT = new URL("../out/", import.meta.url)
const DRY = new URL("dryrun/", OUT)
const SITE = "https://www.momos.com"
const PREVIEW_CSS = `body{margin:0;font-family:Poppins,system-ui,sans-serif;color:#15181d;background:#faf8f5;line-height:1.7}
.bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;justify-content:space-between;padding:10px 16px;background:#15181d;color:#fff;font-size:13px}
.bar a{color:#fff}.warn{max-width:760px;margin:16px auto 0;padding:8px 16px;background:#fff3cd;border-radius:8px;font-size:14px}
main{max-width:760px;margin:0 auto;padding:24px 16px 80px}h1{font-size:36px;line-height:1.2}h2{font-size:26px;line-height:1.3;margin-top:48px}
img{max-width:100%;height:auto}table{max-width:100%}
.embed{margin:24px 0;outline:1px dashed #d73e33;outline-offset:6px}.embed iframe{display:block;width:100%;height:200px;border:0}
.embed figcaption{font-size:11px;color:#d73e33;text-align:right;margin-top:4px}`

const items = JSON.parse(await readFile(new URL("blog-items.json", OUT), "utf8").catch(() => {
    throw new Error("No out/blog-items.json: run npm run inventory first.")
}))
const embeds = JSON.parse(await readFile(new URL("live/embeds.json", OUT), "utf8").catch(() => {
    throw new Error("No out/live/embeds.json: run npm run embeds first.")
}))

await rm(DRY, { recursive: true, force: true })
await mkdir(new URL("preview/", DRY), { recursive: true })
await mkdir(new URL("content/", DRY), { recursive: true })
const write = (name, text) => writeFile(new URL(name, DRY), text)

const sections = sectionFields(items.fields)
const titleField = items.fields.find(f => /^(title|name|heading)$/i.test(f.name) && f.type === "string") ?? items.fields.find(f => f.type === "string")
const languages = [{ id: null, code: "en" }, ...items.locales.map(l => ({ id: l.id, code: l.code }))]

// Embed code by id and language. Embeds without a rule are part of the template (the sidebar), not
// of any post, so they stay out of the posts.
const code = new Map()
for (const e of embeds) {
    const byLang = { en: await readFile(new URL(`live/${e.file}`, OUT), "utf8") }
    for (const [lang, file] of Object.entries(e.translations ?? {})) byLang[lang] = await readFile(new URL(`live/${file}`, OUT), "utf8")
    code.set(e.id, byLang)
}
// An embed's code in a language: the exact locale (fr-CA), else the language (fr), else English.
function embedCode(id, lang) {
    const byLang = code.get(id)
    if (!byLang) return `<p>Missing embed ${id}</p>`
    const base = lang.split("-")[0]
    return byLang[lang] ?? byLang[base] ?? Object.entries(byLang).find(([k]) => k.split("-")[0] === base)?.[1] ?? byLang.en
}
const postEmbeds = slug => embeds.filter(e => e.posts.includes(slug))
const templateEmbeds = embeds.filter(e => e.posts.includes("(every post)"))

const rows = []
for (const item of items.items) {
    const title = String(item.fieldData[titleField?.id]?.value ?? item.slug)
    const own = postEmbeds(item.slug)
    const row = { slug: item.slug, title, draft: item.draft ? "yes" : "", warnings: [] }
    for (const lang of languages) {
        const result = mergePost({ fieldData: item.fieldData, sections, embeds: own, localeId: lang.id })
        await write(`content/${item.slug}.${lang.code}.html`, `${result.html}\n`)
        await write(`preview/${item.slug}.${lang.code}.html`, previewPage({ item, title, lang, result, languages }))
        if (lang.id == null) {
            Object.assign(row, { sections: result.sections, embeds: result.embeds.length, left_out: result.skipped.length, words: wordCount(result.html), content_kb: (Buffer.byteLength(result.html) / 1024).toFixed(1) })
            row.warnings.push(...result.warnings)
        } else {
            row[`translated_${lang.code}`] = `${result.translatedSections}/${result.sections}`
        }
    }
    rows.push(row)
}

const langCols = languages.filter(l => l.id).map(l => `translated_${l.code}`)
await write("report.csv", csv(rows, ["slug", "title", "draft", "sections", "embeds", "left_out", "words", "content_kb", ...langCols, "warnings"]))
await write("index.html", indexPage(rows))

const totalEmbeds = rows.reduce((n, r) => n + r.embeds, 0)
const leftOut = embeds.filter(e => !e.posts.length)
const fully = l => rows.filter(r => { const [a, b] = r[`translated_${l.code}`].split("/"); return a === b }).length
const summary = `## Dry run

Every post merged into one body, in ${languages.length} languages, without writing anything to Framer. Open \`dryrun/index.html\`.

- ${rows.length} posts (${rows.filter(r => r.draft).length} drafts): ${rows.reduce((n, r) => n + r.sections, 0)} sections merged, ${totalEmbeds} embeds placed in ${rows.filter(r => r.embeds).length} posts
- Content per post: ${Math.min(...rows.map(r => r.content_kb))}–${Math.max(...rows.map(r => r.content_kb))} KB, against the 962 KB template script every post loads today
- Fully translated posts: ${languages.filter(l => l.id).map(l => `${l.code} ${fully(l)}/${rows.length}`).join(", ")} (missing sections fall back to English, as on the site today)
- ${rows.reduce((n, r) => n + r.left_out, 0)} embeds left out because they sit in a section their post leaves empty (the live page hides them too)
- ${rows.filter(r => r.warnings.length).length} posts with warnings (see the index)
- Left as part of the template: ${templateEmbeds.map(e => e.id).join(", ") || "none"} (shown on every post). Not placed anywhere: ${leftOut.map(e => e.id).join(", ") || "none"}
`
await write("summary.md", summary)
await writeFile(new URL("summary.md", OUT), summary, { flag: "a" })
console.log(summary)

function previewPage({ item, title, lang, result, languages }) {
    const body = result.html.replace(MARKER, (_, id) => embedFrame(id, embedCode(id, lang.code)))
    const live = lang.id ? `${SITE}/${lang.code}/blog/${item.slugByLocale?.[lang.id]?.value || item.slug}` : `${SITE}/blog/${item.slug}`
    return `<!doctype html><html lang="${lang.code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeAttr(title)} (${lang.code}) · dry run</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
<style>${PREVIEW_CSS}</style></head><body>
<header class="bar"><a href="../index.html">← All posts</a><span>Dry run · ${lang.code}${item.draft ? " · draft" : ""} · ${result.sections} sections · ${result.embeds.length} embeds${lang.id ? ` · ${result.translatedSections}/${result.sections} translated` : ""}</span>
<nav>${languages.map(l => l.code === lang.code ? `<b>${l.code}</b>` : `<a href="${item.slug}.${l.code}.html">${l.code}</a>`).join(" ")} · <a href="${live}" target="_blank" rel="noopener">Live page ↗</a></nav></header>
${result.warnings.length ? `<div class="warn">${result.warnings.map(w => `<p>⚠ ${escapeAttr(w)}</p>`).join("")}</div>` : ""}
<main><h1>${escapeAttr(title)}</h1>
${body}
</main>
<script>addEventListener("message",e=>{if(!e.data||e.data.type!=="dryrun-embed-height")return;for(const f of document.querySelectorAll("iframe"))if(f.contentWindow===e.source)f.style.height=e.data.height+"px"})</script>
</body></html>
`
}

// Each embed in its own sandboxed frame, as the HtmlEmbed component will show it.
function embedFrame(id, html) {
    const doc = `<!doctype html><html><head><meta charset="utf-8"><base href="${SITE}/" target="_top"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"><style>html,body{margin:0;background:transparent}body{display:flow-root;font-family:Poppins,sans-serif;overflow:hidden}</style></head><body>${html}<script>(function(){var l=0;function s(){var h=Math.ceil(document.body.getBoundingClientRect().height);if(h!==l){l=h;parent.postMessage({type:"dryrun-embed-height",height:h},"*")}}new ResizeObserver(s).observe(document.body);addEventListener("load",s);s()})()<\/script></body></html>`
    return `<figure class="embed"><iframe title="Embed ${id}" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" loading="lazy" srcdoc="${escapeAttr(doc)}"></iframe><figcaption>embed ${id}</figcaption></figure>`
}

function indexPage(rows) {
    const head = ["Post", "Sections", "Embeds", "Words", "KB", ...langCols.map(c => c.replace("translated_", "")), "Warnings", "Previews"]
    const tr = r => `<tr${r.warnings.length ? ' class="has-warn"' : ""}><td><b>${escapeAttr(r.title)}</b><br><small>${r.slug}${r.draft ? " · draft" : ""}</small></td><td>${r.sections}</td><td>${r.embeds}</td><td>${r.words}</td><td>${r.content_kb}</td>${langCols.map(c => `<td>${r[c]}</td>`).join("")}<td>${r.warnings.map(w => escapeAttr(w)).join("<br>")}</td><td>${languages.map(l => `<a href="preview/${r.slug}.${l.code}.html">${l.code}</a>`).join(" ")}</td></tr>`
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blog migration dry run</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"><style>${PREVIEW_CSS}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{border-bottom:1px solid #e5e5e5;padding:8px;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#fff}tr.has-warn td{background:#fff8e6}main.wide{max-width:none;padding:24px}</style></head><body>
<main class="wide"><h1>Blog migration dry run</h1><p>${rows.length} posts. Each preview shows the post as one body, with its own embeds in place. Nothing has been written to Framer. Rows with warnings are highlighted.</p>
<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(tr).join("")}</tbody></table></main></body></html>
`
}

function escapeAttr(text) {
    return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
