import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { replaceMarker, usedByTranslation } from "../scripts/replace.mjs"
import { checkPost } from "../scripts/posts.mjs"

test("replaceMarker swaps the embed line for the new HTML, once, and reports a missing line", () => {
    const html = '<p dir="auto">Intro</p><p dir="auto">⟦embed:abc⟧</p><p>After</p>'
    const out = replaceMarker(html, "abc", "<ol>\n<li>One</li>\n</ol>\n<p>⟦embed:abcTable⟧</p>\n")
    assert.equal(out.html, '<p dir="auto">Intro</p><ol><li>One</li></ol><p>⟦embed:abcTable⟧</p><p>After</p>')
    assert.equal(out.found, true)
    assert.deepEqual(replaceMarker(out.html, "abc", "<p>x</p>"), { html: out.html, found: false })
})

test("usedByTranslation finds the embed line in a translated value", () => {
    assert.equal(usedByTranslation({ fr: { status: "done", value: "<p>⟦embed:abc⟧</p>" } }, "abc"), true)
    assert.equal(usedByTranslation({ fr: { status: "new", value: null } }, "abc"), false)
    assert.equal(usedByTranslation(undefined, "abc"), false)
})

test("every replacement in replacements/ is well-formed and refers to embeds it brings", async () => {
    const dir = new URL("../replacements/", import.meta.url)
    for (const post of (await readdir(dir, { withFileTypes: true })).filter(d => d.isDirectory())) {
        const base = new URL(`${post.name}/`, dir)
        const embeds = new Map((await readdir(new URL("embeds/", base)).catch(() => [])).map(f => [f.replace(/\.html$/, ""), ""]))
        for (const file of (await readdir(base)).filter(f => f.endsWith(".html"))) {
            const html = await readFile(new URL(file, base), "utf8")
            assert.deepEqual(checkPost(html, { embeds, paths: { has: () => true } }), [], `${post.name}/${file}`)
        }
    }
})
