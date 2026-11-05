import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { applyWording, compileRules, sentenceCaseTitle } from "../scripts/wording.mjs"

test("sentenceCaseTitle follows how the article writes the name", () => {
    assert.equal(sentenceCaseTitle("Review Velocity", "Your review velocity is…"), "Review velocity")
    assert.equal(sentenceCaseTitle("Closed-Loop Feedback", "closed-loop feedback means…"), "Closed-loop feedback")
    assert.equal(sentenceCaseTitle("Key Performance Indicators (KPIs) for Restaurants", "key performance indicators for restaurants"), "Key performance indicators (KPIs) for restaurants")
    assert.equal(sentenceCaseTitle("AI Review Response", "AI review response is…"), "AI review response")
    // Written capitalized in the text, or a kept name: unchanged.
    assert.equal(sentenceCaseTitle("Net Promoter Score", "Net Promoter Score (NPS) measures…"), "Net Promoter Score")
    assert.equal(sentenceCaseTitle("Employee Net Promoter Score", "employee net promoter score", ["Net Promoter Score"]), "Employee Net Promoter Score")
    assert.equal(sentenceCaseTitle("XM", "XM"), "XM")
})

test("applyWording changes the name in headings and labels, not in running text or titles", () => {
    const term = { from: "Moments of Truth", to: "Moments of truth" }
    const html = "<h1>Moments of Truth</h1><h2>What is Moments of Truth?</h2><p>Moments of Truth at a glance</p>" +
        "<p>In Moments of Truth, Carlzon argued for it. Then more.</p><td>Jan Carlzon, Moments of Truth (1987)</td>"
    const out = applyWording(html, { term })
    assert.equal(out.html, "<h1>Moments of truth</h1><h2>What is moments of truth?</h2><p>Moments of truth at a glance</p>" +
        "<p>In Moments of Truth, Carlzon argued for it. Then more.</p><td>Jan Carlzon, Moments of Truth (1987)</td>")
    assert.equal(out.changes.length, 3)
    const ai = applyWording("<h2>What is AI Review Response?</h2>", { term: { from: "AI Review Response", to: "AI review response" } })
    assert.equal(ai.html, "<h2>What is AI review response?</h2>")
    const quoted = applyWording('<h2>"The Voice of the Customer" paper</h2>', { term: { from: "Voice of the Customer", to: "Voice of the customer" } })
    assert.equal(quoted.changes.length, 0)
})

test("applyWording edits phrases in text only, never in tags, links or scripts", () => {
    const phrases = [{ find: "Our Alfie assistant drafts and sends replies", replace: "Our Alfie agent resolves reviews" }, { find: "customers", replace: "guests" }]
    const html = '<p>Our Alfie assistant drafts and sends replies in your brand&#x27;s voice.</p><a href="/customers" title="customers">x</a><script>if (a < b && customers > 1) {}</script><p>Ask customers.</p>'
    const out = applyWording(html, { phrases })
    assert.equal(out.html, "<p>Our Alfie agent resolves reviews in your brand's voice.</p><a href=\"/customers\" title=\"customers\">x</a><script>if (a < b && customers > 1) {}</script><p>Ask guests.</p>")
    assert.deepEqual(applyWording(null, { phrases }), { html: null, changes: [] })
})

test("glossary-wording.json is well-formed and its replacements follow the brand words", async () => {
    const config = JSON.parse(await readFile(new URL("../glossary-wording.json", import.meta.url), "utf8"))
    const rules = compileRules(config)
    assert.ok(rules.phrases.length > 0)
    for (const { find, replace } of rules.phrases) {
        assert.notEqual(find, replace)
        assert.doesNotMatch(replace, /\b(assistant|copilot|chatbot)\b|\bcustomers?\b/i, replace)
    }
})
