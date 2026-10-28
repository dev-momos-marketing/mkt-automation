// Step 1b of the blog migration: every Embed in the blog template, read from the published site.
// Framer's API returns no property values for these embeds, so this reads the template's compiled
// code on momos.com instead: each embed's HTML, which post shows it (from its visibility rule), where
// in the post it sits, and its translations. Only reads public pages; needs no API key.
//
// Writes to out/live/:
//   embeds.csv           one row per embed: the posts that show it, its rule, section, size, file
//   posts.csv            one row per post with embeds: which embeds, in order, and where
//   embeds/<id>.html     each embed's HTML; <id>.<locale>.html for each translation
//   summary.md           the headline numbers (also appended to out/summary.md)
//
// Usage: npm run embeds
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { csv } from "./lib.mjs"
import { describeRule, guessLanguage, parseTemplate, parseTranslations, ruleMatches } from "./template.mjs"

const SITE = (process.env.BLOG_SITE || "https://www.momos.com").replace(/\/$/, "")
const OUT = new URL("../out/live/", import.meta.url)
await rm(OUT, { recursive: true, force: true })
await mkdir(new URL("embeds/", OUT), { recursive: true })
const write = (name, text) => writeFile(new URL(name, OUT), text)

// 1. Every live blog post, from the English sitemap.
const sitemap = await text(`${SITE}/sitemap_en.xml`).catch(() => text(`${SITE}/sitemap.xml`))
const slugs = [...new Set([...sitemap.matchAll(/<loc>[^<]*\/blog\/([a-z0-9-]+)\/?<\/loc>/gi)].map(m => m[1]))].sort()
if (!slugs.length) throw new Error(`No blog posts in ${SITE}'s sitemap.`)

// 2. The template's code: of the scripts a post loads, the one with the embeds in it.
const postUrl = `${SITE}/blog/${slugs[0]}`
const page = await text(postUrl)
const scripts = [...new Set([...page.matchAll(/(?:src|href)="(https:\/\/framerusercontent\.com\/sites\/[^"]+\.mjs)"/g)].map(m => m[1]))]
let template = null
for (const url of scripts) {
    const code = await text(url)
    const count = code.split("type:`html`").length - 1
    if (count && (!template || count > template.count)) template = { url, code, count }
}
if (!template) throw new Error(`None of the ${scripts.length} scripts on ${postUrl} contains an embed.`)
const { embeds, localeModules, ruleCount } = parseTemplate(template.code)

// 3. Translations, labelled with their language when the inventory has listed the locales.
const localeNames = await readFile(new URL("../out/blog-items.json", import.meta.url), "utf8")
    .then(t => new Map(JSON.parse(t).locales.map(l => [l.id, l.code])))
    .catch(() => new Map())
const translations = {}
for (const [id, path] of Object.entries(localeModules)) {
    const strings = parseTranslations(await text(new URL(path, template.url).href))
    const code = localeNames.get(id) ?? guessLanguage(Object.values(strings)) ?? id
    translations[code] = strings
}

// 4. Reports.
const rows = []
const byPost = new Map(slugs.map(s => [s, []]))
for (const e of embeds) {
    const posts = e.rule ? slugs.filter(s => ruleMatches(e.rule, s)) : ["(every post)"]
    const langs = Object.entries(translations).filter(([, t]) => e.translationKey && t[e.translationKey]).map(([code]) => code)
    await write(`embeds/${e.id}.html`, e.html)
    for (const code of langs) await write(`embeds/${e.id}.${code}.html`, translations[code][e.translationKey])
    for (const s of posts) byPost.get(s)?.push(e)
    rows.push({
        embed: e.id,
        posts,
        rule: describeRule(e.rule),
        place: e.place,
        html_kb: (Buffer.byteLength(e.html) / 1024).toFixed(1),
        has_script: /<script\b/i.test(e.html) ? "yes" : "",
        translations: langs,
        file: `embeds/${e.id}.html`,
        layer_path: e.names.join(" / "),
    })
}
await write("embeds.csv", csv(rows, ["embed", "posts", "rule", "place", "html_kb", "has_script", "translations", "file", "layer_path"]))
const postRows = [...byPost].filter(([, list]) => list.length).map(([slug, list]) => ({
    slug,
    embeds: list.length,
    in_order: list.map(e => `${e.id} (${e.place})`),
}))
await write("posts.csv", csv(postRows, ["slug", "embeds", "in_order"]))

const kb = n => `${Math.round(n / 1024)} KB`
const embedBytes = embeds.reduce((sum, e) => sum + Buffer.byteLength(e.html), 0)
const noPost = rows.filter(r => !r.posts.length)
const shared = rows.filter(r => r.posts.length > 1)
const unclear = embeds.filter(e => e.rule && !e.rule.kind)
const summary = `## Embeds on the live site

Read from \`${template.url.split("/").pop()}\`, the template code every blog post loads, on ${new Date().toISOString().slice(0, 10)}.

- **${embeds.length} embeds**, ${kb(embedBytes)} of HTML, inside a ${kb(Buffer.byteLength(template.code))} script that every post downloads (plus ${Object.keys(translations).length} translation files: ${Object.entries(translations).map(([code, t]) => `${code} ${Object.keys(t).length}`).join(", ")})
- ${ruleCount} visibility rules; ${slugs.length} live posts, of which ${postRows.length} show at least one embed
- ${rows.filter(r => r.posts.length === 1).length} embeds belong to exactly one post${shared.length ? `; ${shared.length} show on several (${shared.slice(0, 5).map(r => r.embed).join(", ")}${shared.length > 5 ? ", …" : ""})` : ""}
- ${noPost.length} match no live post (left over, or for a draft)${noPost.length ? `: ${noPost.slice(0, 8).map(r => `${r.embed} (${r.rule})`).join(", ")}${noPost.length > 8 ? ", …" : ""}` : ""}
${unclear.length ? `- ${unclear.length} have a rule that couldn't be read: ${unclear.map(e => e.id).join(", ")}\n` : ""}- ${rows.filter(r => r.has_script).length} contain a <script>; ${embeds.filter(e => e.translationKey).length} have translations

See \`live/embeds.csv\` (one row per embed) and \`live/posts.csv\` (one row per post).
`
await write("summary.md", summary)
await writeFile(new URL("../summary.md", OUT), summary, { flag: "a" })
console.log(summary)

async function text(url) {
    const res = await fetch(url, { headers: { "user-agent": "momos-blog-migration (github.com/dev-momos-marketing/mkt-automation)" } })
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    return res.text()
}
