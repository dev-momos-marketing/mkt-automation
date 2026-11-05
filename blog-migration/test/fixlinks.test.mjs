import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { compileFixes, fixLinks } from "../scripts/fixlinks.mjs"

const fixes = compileFixes([
    { from: "/product/review-boosting", to: "/product/ai-review-manager" },
    { from: "/growth-marketing", to: null },
    { from: "/fr", to: "/fr-ca" },
    { from: "https://www.oracle.com/industries/food-beverage/", to: null },
])

test("fixLinks repoints a site link written any way, keeping the query and anchor", () => {
    const html = '<p>See <a href="/product/review-boosting">boosting</a>, <a href="https://www.momos.com/product/review-boosting/?a=1#x" target="_blank">again</a> and <a href="https://momos.com/product/review-boosting">bare</a>.</p>'
    const out = fixLinks(html, fixes)
    assert.equal(out.text, '<p>See <a href="/product/ai-review-manager">boosting</a>, <a href="https://www.momos.com/product/ai-review-manager?a=1#x" target="_blank">again</a> and <a href="https://momos.com/product/ai-review-manager">bare</a>.</p>')
    assert.equal(out.changes.length, 3)
})

test("fixLinks removes a link and keeps its text when the fix is null", () => {
    const out = fixLinks('<p>Read <a href="https://www.oracle.com/industries/food-beverage" rel="noopener"><strong>Oracle</strong></a> and <a href="/growth-marketing">growth</a>.</p>', fixes)
    assert.equal(out.text, "<p>Read <strong>Oracle</strong> and growth.</p>")
    assert.deepEqual(out.changes.map(c => c.to), [null, null])
})

test("fixLinks leaves other links alone, including ones that only start the same", () => {
    const html = '<p><a href="/fr-ca/blogue/x">fr</a> <a href="/product/review-boosting-plus">p</a> <a href="/growth-marketing-guide">g</a> <a href="https://example.com/fr">e</a></p>'
    assert.deepEqual(fixLinks(html, fixes), { text: html, changes: [], left: [] })
    assert.equal(fixLinks('<a href="/fr">Français</a>', fixes).text, '<a href="/fr-ca">Français</a>')
})

test("fixLinks fixes a value that is only a URL, and reports one it can't remove", () => {
    assert.equal(fixLinks("https://www.momos.com/product/review-boosting", fixes).text, "https://www.momos.com/product/ai-review-manager")
    assert.deepEqual(fixLinks("/growth-marketing", fixes), { text: "/growth-marketing", changes: [], left: ["/growth-marketing"] })
    assert.deepEqual(fixLinks(null, fixes), { text: null, changes: [], left: [] })
})

test("link-fixes.json is well-formed and points only at site paths", async () => {
    const list = JSON.parse(await readFile(new URL("../link-fixes.json", import.meta.url), "utf8"))
    assert.ok(compileFixes(list).length > 0)
    for (const { to } of list) assert.ok(to === null || /^\/[a-z0-9/-]+$/.test(to), to)
})
