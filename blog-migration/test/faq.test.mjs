import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { FAQ_HEADING, checkFaq, dropTrailingHeadings, faqHtml } from "../scripts/faq.mjs"

const good = {
    heading: "Restaurant Surveys: FAQ",
    questions: [
        { q: "How long should a survey be?", a: "Short surveys get more answers. Three to five questions is enough for most visits." },
        { q: "When should I send it?", a: "Send it soon after the visit. The details are still fresh then." },
        { q: "Should I offer a reward?", a: "A small reward can lift responses. Keep it modest so answers stay honest." },
        { q: "What should I do with the results?", a: "Read the comments every week. Fix the theme that affects the most guests first." },
    ],
}

test("faqHtml builds an H2 with H3 questions and escapes text", () => {
    const html = faqHtml({ heading: "A & B: FAQ", questions: [{ q: "Is 1 < 2?", a: "Yes. Always." }] })
    assert.equal(html, "<h2>A &amp; B: FAQ</h2><h3>Is 1 &lt; 2?</h3><p>Yes. Always.</p>")
    assert.match(html, FAQ_HEADING)
    assert.doesNotMatch("<h2>Frequent mistakes</h2>", FAQ_HEADING)
    assert.match('<h2 dir="auto">Frequently Asked Questions</h2>', FAQ_HEADING)
})

test("checkFaq accepts a good FAQ and reports house-style problems", () => {
    assert.deepEqual(checkFaq(good, ""), [])
    const bad = { heading: "Questions", questions: [
        { q: "Why", a: "It matters, not because of price. Really." },
        { q: "Why", a: "One sentence only." },
        { q: "How much?", a: "About 37% of guests leave. It's a game-changer." },
    ] }
    const problems = checkFaq(bad, "Some post text with 12% in it.").join("\n")
    for (const part of ["heading", "3 questions", "isn't a question", "asked twice", "1 sentences", "X, not Y", "game-changer", '"37%", which isn\'t in the post']) assert.ok(problems.includes(part), part)
})

test("every file in faqs/ follows the house style", async () => {
    const dir = new URL("../faqs/", import.meta.url)
    for (const file of (await readdir(dir)).filter(f => f.endsWith(".json"))) {
        const faq = JSON.parse(await readFile(new URL(file, dir), "utf8"))
        // Numbers are checked against the post when the workflow runs; here only the form.
        const problems = checkFaq(faq, "").filter(p => !p.includes("isn't in the post"))
        assert.deepEqual(problems, [], file)
    }
})

test("dropTrailingHeadings removes only empty headings at the very end", () => {
    assert.deepEqual(dropTrailingHeadings('<p>A</p><h2 dir="auto">5. Build local backlinks</h2><h3>v</h3> '), { html: "<p>A</p>", removed: ["v", "5. Build local backlinks"] })
    assert.deepEqual(dropTrailingHeadings("<h2>T</h2><p>A</p>"), { html: "<h2>T</h2><p>A</p>", removed: [] })
})
