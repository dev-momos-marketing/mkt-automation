import { test } from "node:test"
import assert from "node:assert/strict"
import { csv, embedInfo, findTemplatePages, guessPosts, isEmbed, isFilled, isSectionName, numbered, preview, translatedLocales } from "../scripts/lib.mjs"

test("numbered splits a field name into its group and number", () => {
    assert.deepEqual(numbered("Section Title 12"), { group: "Section Title", n: 12 })
    assert.deepEqual(numbered("Section 3"), { group: "Section", n: 3 })
    assert.deepEqual(numbered("Heading_7"), { group: "Heading", n: 7 })
    assert.equal(numbered("Title"), null)
})

test("isSectionName matches the template's section layers only", () => {
    assert.ok(isSectionName("Section 8"))
    assert.ok(isSectionName(" section 10 "))
    assert.ok(!isSectionName("Section Title"))
    assert.ok(!isSectionName("Section 8 copy"))
})

test("isEmbed finds Framer's Embed and HTML components", () => {
    assert.ok(isEmbed({ name: "Embed", componentName: "Embed", controls: {} }))
    assert.ok(isEmbed({ name: "Calculator", componentName: "Widget", controls: { html: "<div></div>" } }))
    assert.ok(!isEmbed({ name: "CTA", componentName: "Button", controls: { label: "Go" } }))
})

test("embedInfo reads HTML and URL embeds", () => {
    const html = embedInfo({ type: "html", html: "<div>Hi</div>" })
    assert.equal(html.mode, "html")
    assert.equal(html.hash.length, 10)
    const url = embedInfo({ type: "url", url: "https://example.com/x", html: "" })
    assert.equal(url.mode, "url")
    assert.equal(embedInfo({ html: "<p>a</p>" }).mode, "html")
    assert.equal(embedInfo({}).hash, "")
})

test("preview strips scripts, styles and tags", () => {
    assert.equal(preview("<style>.a{}</style><p>Hello&nbsp; <b>world</b></p><script>x()</script>"), "Hello world")
    assert.equal(preview("a".repeat(100), 10), `${"a".repeat(9)}…`)
})

test("isFilled ignores empty rich text", () => {
    assert.ok(!isFilled({ value: "<p></p>" }))
    assert.ok(!isFilled({ value: "" }))
    assert.ok(!isFilled(undefined))
    assert.ok(isFilled({ value: "<p>Text</p>" }))
    assert.ok(isFilled({ value: '<img src="x.png">' }))
    assert.ok(isFilled({ value: true }))
    assert.ok(!isFilled({ value: false }))
})

test("translatedLocales skips untranslated locales", () => {
    const codes = new Map([["l1", "fr"], ["l2", "es"]])
    assert.deepEqual(translatedLocales({ valueByLocale: { l1: { status: "done" }, l2: { status: "new" } } }, codes), ["fr"])
    assert.deepEqual(translatedLocales({}, codes), [])
})

test("csv quotes commas, quotes and newlines, and joins lists", () => {
    assert.equal(csv([{ a: 'say "hi"', b: ["x", "y"] }, { a: "line\nbreak", b: 3 }], ["a", "b"]), 'a,b\n"say ""hi""","x, y"\n"line\nbreak",3\n')
})

test("guessPosts matches slugs and titles in embed content", () => {
    const posts = [{ slug: "restaurant-reputation-software", title: "16 Best Restaurant Reputation Software" }, { slug: "nps", title: "NPS" }]
    assert.deepEqual(guessPosts('<a href="/blog/restaurant-reputation-software">', posts), ["restaurant-reputation-software"])
    assert.deepEqual(guessPosts("nps", posts), [])
    assert.deepEqual(guessPosts("", posts), [])
})

test("findTemplatePages prefers the given path, then the collection link, then /blog/:slug", () => {
    const pages = [
        { path: "/blog", collectionId: null },
        { path: "/blog/:slug", collectionId: null },
        { path: "/guides/:slug", collectionId: "g" },
        { path: "/archive/:slug", collectionId: "b" },
    ]
    assert.deepEqual(findTemplatePages(pages, { collectionId: "b" }).map(p => p.path), ["/archive/:slug"])
    assert.deepEqual(findTemplatePages(pages, { collectionId: "x" }).map(p => p.path), ["/blog/:slug"])
    assert.deepEqual(findTemplatePages(pages, { collectionId: "b", path: "/guides/:slug" }).map(p => p.path), ["/guides/:slug"])
    assert.deepEqual(findTemplatePages(pages, { collectionId: "x", path: "/nope" }), [])
})
