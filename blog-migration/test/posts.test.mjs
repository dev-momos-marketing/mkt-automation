import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { checkPost, embedLines } from "../scripts/posts.mjs"

const paths = new Set(["/blog/a", "/glossary/b", "/rockie"])
const embeds = new Map([["x1", "<div></div>"]])

test("checkPost accepts a well-formed body with known embeds and links", () => {
    const html = '<p>Hi <a href="/blog/a">a</a> and <a href="/glossary/b/">b</a>.</p><p>⟦embed:x1⟧</p><h2>T</h2><ul><li><strong>X:</strong> y</li></ul>'
    assert.deepEqual(checkPost(html, { embeds, paths }), [])
})

test("checkPost reports broken tags, unknown embeds and bad links", () => {
    const problems = checkPost('<h1>T</h1><p>⟦embed:zz⟧</p><p><a href="/blog/nope">n</a><a href="glossary/b">r</a><a href="/blog/a">1</a><a href="/blog/a">2</a><div>', { embeds, paths })
    assert.ok(problems.some(p => p.includes("H1")))
    assert.ok(problems.some(p => p.includes("embed zz")))
    assert.ok(problems.some(p => p.includes("/blog/nope")))
    assert.ok(problems.some(p => p.includes("should start with /")))
    assert.ok(problems.some(p => p.includes("linked twice")))
    assert.ok(problems.some(p => p.includes("<div>")))
    assert.ok(problems.some(p => p.includes("never closed")))
})

test("every post in posts/ is well-formed", async () => {
    const dir = new URL("../posts/", import.meta.url)
    for (const file of (await readdir(dir)).filter(f => f.endsWith(".html"))) {
        const html = await readFile(new URL(file, dir), "utf8")
        const problems = checkPost(html, { embeds: new Map(embedLines(html).map(id => [id, ""])), paths: { has: () => true } })
        assert.deepEqual(problems, [], file)
    }
})
