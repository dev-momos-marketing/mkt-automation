// Reads every Embed of the blog template from the published site: the template's compiled code,
// its translation files and the sitemap. Used by the embeds report and by the migration.
import { describeRule, guessLanguage, parseTemplate, parseTranslations, ruleMatches } from "./template.mjs"

export const SITE = (process.env.BLOG_SITE || "https://www.momos.com").replace(/\/$/, "")

// `localeNames` maps Framer locale ids to codes (fr-CA); without it, languages are guessed.
export async function readLive({ site = SITE, localeNames = new Map() } = {}) {
    // 1. Every live blog post, from the English sitemap.
    const sitemap = await text(`${site}/sitemap_en.xml`).catch(() => text(`${site}/sitemap.xml`))
    const slugs = [...new Set([...sitemap.matchAll(/<loc>[^<]*\/blog\/([a-z0-9-]+)\/?<\/loc>/gi)].map(m => m[1]))].sort()
    if (!slugs.length) throw new Error(`No blog posts in ${site}'s sitemap.`)

    // 2. The template's code: of the scripts a post loads, the one with the embeds in it.
    const postUrl = `${site}/blog/${slugs[0]}`
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

    // 3. Translations.
    const translations = {}
    for (const [id, path] of Object.entries(localeModules)) {
        const strings = parseTranslations(await text(new URL(path, template.url).href))
        translations[localeNames.get(id) ?? guessLanguage(Object.values(strings)) ?? id] = strings
    }

    // 4. Each embed with the posts that show it and its code in every language.
    for (const e of embeds) {
        e.posts = e.rule ? slugs.filter(s => ruleMatches(e.rule, s)) : ["(every post)"]
        e.ruleText = describeRule(e.rule)
        e.code = { en: e.html }
        for (const [lang, strings] of Object.entries(translations)) {
            if (e.translationKey && strings[e.translationKey]) e.code[lang] = strings[e.translationKey]
        }
    }
    return { slugs, embeds, translations, ruleCount, template: { url: template.url, bytes: Buffer.byteLength(template.code) } }
}

async function text(url) {
    const res = await fetch(url, { headers: { "user-agent": "momos-blog-migration (github.com/dev-momos-marketing/mkt-automation)" } })
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    return res.text()
}
