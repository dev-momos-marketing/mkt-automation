import { test } from "node:test"
import assert from "node:assert/strict"
import { buildPost, embedsField, isEmptyHtml, localized, marker, parseEmbedsField, mergePost, sectionFields, sectionOf, titleHtml, wordCount } from "../scripts/merge.mjs"

const FIELDS = [
    { id: "t", name: "Title", type: "string" },
    { id: "b1", name: "Section 1", type: "formattedText" },
    { id: "t2", name: "Section Title 2", type: "string" },
    { id: "b2", name: "Section 2", type: "formattedText" },
    { id: "t3", name: "Section Title 3", type: "formattedText" },
    { id: "b3", name: "Section 3", type: "formattedText" },
    { id: "t10", name: "Section Title 10", type: "string" },
    { id: "b10", name: "Section 10", type: "formattedText" },
]

test("sectionFields pairs titles and bodies by number, in numeric order", () => {
    const s = sectionFields(FIELDS)
    assert.deepEqual([...s.keys()], [1, 2, 3, 10])
    assert.equal(s.get(1).title, undefined)
    assert.equal(s.get(2).title.id, "t2")
    assert.equal(s.get(10).body.id, "b10")
})

test("localized falls back to English where a translation is missing", () => {
    const entry = { value: "<p>Hi</p>", valueByLocale: { fr: { value: "<p>Salut</p>", status: "done" }, es: { value: null, status: "new" } } }
    assert.deepEqual(localized(entry, null), { value: "<p>Hi</p>", translated: true })
    assert.deepEqual(localized(entry, "fr"), { value: "<p>Salut</p>", translated: true })
    assert.deepEqual(localized(entry, "es"), { value: "<p>Hi</p>", translated: false })
    assert.deepEqual(localized(undefined, "es"), { value: "", translated: false })
})

test("titleHtml escapes plain text and unwraps rich text", () => {
    assert.equal(titleHtml("Pros & cons <2026>", "string"), "<h2>Pros &amp; cons &lt;2026&gt;</h2>")
    assert.equal(titleHtml("<p>How <strong>to</strong> choose &amp; compare</p>", "formattedText"), "<h2>How to choose &amp; compare</h2>")
    assert.equal(titleHtml("  ", "string"), "")
})

test("isEmptyHtml and sectionOf", () => {
    assert.ok(isEmptyHtml("<p><br></p>"))
    assert.ok(isEmptyHtml("<p>&nbsp;</p>\n"))
    assert.ok(!isEmptyHtml("<p>x</p>"))
    assert.ok(!isEmptyHtml('<img src="a.png">'))
    assert.equal(sectionOf("Section 8"), 8)
    assert.equal(sectionOf("after Section 7"), 7)
    assert.equal(sectionOf("Table of Content"), null)
})

test("mergePost joins sections in order and places embeds after their section", () => {
    const fieldData = {
        b1: { value: "<p>Intro</p>" },
        t2: { value: "Choosing", valueByLocale: { fr: { value: "Choisir", status: "done" } } },
        b2: { value: "<p>Body 2</p>", valueByLocale: { fr: { value: "<p>Corps 2</p>", status: "done" } } },
        t3: { value: "" },
        b3: { value: "<p></p>" },
        t10: { value: "Last" },
        b10: { value: "<p>Body 10</p>" },
    }
    const embeds = [
        { id: "e2a", place: "Section 2" },
        { id: "e2b", place: "Section 2" },
        { id: "e3", place: "Section 3" },
        { id: "e3after", place: "after Section 3" },
        { id: "eAfter", place: "after Section 10" },
        { id: "eOdd", place: "Sidebar" },
    ]
    const sections = sectionFields(FIELDS)
    const en = mergePost({ fieldData, sections, embeds })
    assert.equal(en.html, [
        "<p>Intro</p>",
        "<h2>Choosing</h2>", "<p>Body 2</p>", marker("e2a"), marker("e2b"),
        marker("e3after"),
        "<h2>Last</h2>", "<p>Body 10</p>", marker("eAfter"),
        marker("eOdd"),
    ].join("\n"))
    assert.equal(en.sections, 3)
    assert.deepEqual(en.embeds, ["e2a", "e2b", "e3after", "eAfter", "eOdd"])
    assert.deepEqual(en.skipped, ["e3"])
    assert.equal(en.warnings.length, 2)
    assert.match(en.warnings[0], /e3 left out: it sits in Section 3/)
    assert.match(en.warnings[1], /eOdd has no section/)

    const fr = mergePost({ fieldData, sections, embeds: [], localeId: "fr" })
    assert.match(fr.html, /<h2>Choisir<\/h2>\n<p>Corps 2<\/p>/)
    assert.match(fr.html, /<p>Intro<\/p>/)
    assert.equal(fr.translatedSections, 1)
    assert.equal(fr.sections, 3)
})

test("wordCount skips markers and counts Japanese by character", () => {
    assert.equal(wordCount(`<h2>Two words</h2>${marker("x")}<p>and three more</p>`), 5)
    assert.equal(wordCount("<p>レビュー管理</p>"), 6)
    assert.equal(wordCount(""), 0)
})

test("embedsField and parseEmbedsField round-trip each embed's code", () => {
    const entries = [{ id: "a1", html: "<style>.x{}</style>\n<div class=\"x\">A</div>" }, { id: "b_2", html: "<script>go()</script>" }]
    const field = embedsField(entries)
    assert.match(field, /^<template data-embed="a1">\n<style>/)
    assert.deepEqual([...parseEmbedsField(field)], [["a1", entries[0].html], ["b_2", entries[1].html]])
    assert.throws(() => embedsField([{ id: "c", html: "<template></template>" }]), /contains <\/template>/)
    assert.equal(parseEmbedsField("").size, 0)
})

test("buildPost writes English plus each fully translated language, with the embeds' own translations", () => {
    const fields = [{ id: "b1", name: "Section 1", type: "formattedText" }, { id: "t2", name: "Section Title 2", type: "string" }, { id: "b2", name: "Section 2", type: "formattedText" }]
    const fieldData = {
        b1: { value: "<p>Intro</p>", valueByLocale: { FR: { value: "<p>Intro FR</p>" }, JA: { value: null } } },
        t2: { value: "Two", valueByLocale: { FR: { value: "Deux" }, JA: { value: "二" } } },
        b2: { value: "<p>Body</p>", valueByLocale: { FR: { value: "<p>Corps</p>" }, JA: { value: "<p>本文</p>" } } },
    }
    const embeds = [{ id: "e1", place: "Section 2", code: { en: "<table>en</table>", fr: "<table>fr</table>" } }]
    const out = buildPost({ fieldData, sections: sectionFields(fields), embeds, locales: [{ id: "FR", code: "fr-CA" }, { id: "JA", code: "ja-JP" }] })
    assert.equal(out.content.value, ["<p>Intro</p>", "<h2>Two</h2>", "<p>Body</p>", marker("e1")].join("\n"))
    assert.deepEqual(out.languages, ["fr-CA"])
    assert.deepEqual(out.untranslated, ["ja-JP (1/2 sections)"])
    assert.match(out.content.valueByLocale.FR.value, /<p>Intro FR<\/p>\n<h2>Deux<\/h2>\n<p>Corps<\/p>/)
    assert.equal(out.content.valueByLocale.JA, undefined)
    assert.deepEqual([...parseEmbedsField(out.embeds.value)], [["e1", "<table>en</table>"]])
    assert.deepEqual([...parseEmbedsField(out.embeds.valueByLocale.FR.value)], [["e1", "<table>fr</table>"]])
})
