import assert from "node:assert/strict"
import { test } from "node:test"
import { loadConfig, loadTerms, parseTerm, termValues, toFieldEntry, validateTerms } from "../scripts/lib.mjs"

const config = await loadConfig()

const term = (file, frontmatter, body = "Some body text.") => parseTerm(file, `---\n${frontmatter}\n---\n${body}\n`)
const good = (file = "churn-rate.md", extra = "") =>
    term(file, `term: Churn Rate\ndefinition: The share of customers who stop coming back over a period.\ncategory: Metrics${extra}`)

test("the terms in terms/ pass the checks", async () => {
    const { errors } = validateTerms(await loadTerms(), config)
    assert.deepEqual(errors, [])
})

test("a complete term has no errors", () => {
    assert.deepEqual(validateTerms([good()], config).errors, [])
})

test("missing fields, bad category and unknown keys are errors", () => {
    const { errors } = validateTerms([term("x.md", "term: X\ncategory: Food\ntitle: X", "")], config)
    assert.ok(errors.some(e => e.includes(`needs a "definition"`)))
    assert.ok(errors.some(e => e.includes(`"category" must be one of`)))
    assert.ok(errors.some(e => e.includes(`unknown frontmatter key "title"`)))
    assert.ok(errors.some(e => e.includes("needs body text")))
})

test("file names must be slugs", () => {
    const { errors } = validateTerms([good("Churn Rate.md")], config)
    assert.ok(errors.some(e => e.includes("file name must be lowercase")))
})

test("related terms and /glossary links must point at existing files", () => {
    const a = good("a.md", "\nrelated: [b, missing, a]")
    const b = term("b.md", "term: B\ndefinition: Bee.\ncategory: Metrics", "See [A](/glossary/a) and [Z](/glossary/z).")
    const { errors } = validateTerms([a, b], config)
    assert.deepEqual(errors.sort(), [
        `a.md: "related" lists the term itself`,
        `a.md: "related" names "missing", but there's no terms/missing.md`,
        `b.md: links to /glossary/z, but there's no terms/z.md`,
    ])
})

test("broken YAML is reported, not thrown", () => {
    const { errors } = validateTerms([term("a.md", "term: [unclosed")], config)
    assert.match(errors[0], /isn't valid YAML/)
})

test("FAQ becomes Markdown with a heading per question, SEO fields fall back", () => {
    const values = termValues(good("a.md", "\nfaq:\n  - q: Why?\n    a: Because.\n  - q: How?\n    a: Like this."))
    assert.equal(values.faq, "### Why?\n\nBecause.\n\n### How?\n\nLike this.")
    assert.equal(values.seoTitle, "What is Churn Rate? | Momos")
    assert.equal(values.seoDescription, "The share of customers who stop coming back over a period.")
})

test("field entries match Framer's types", () => {
    const category = { name: "Category", type: "enum", cases: [{ id: "c1", name: "Metrics" }] }
    assert.deepEqual(toFieldEntry(category, "Metrics"), { type: "enum", value: "c1" })
    assert.throws(() => toFieldEntry(category, "Food"), /isn't an option/)
    assert.deepEqual(toFieldEntry({ type: "formattedText" }, "**hi**"), { type: "formattedText", value: "**hi**", contentType: "markdown" })
    assert.deepEqual(toFieldEntry({ type: "date" }, "2026-10-19"), { type: "date", value: "2026-10-19T00:00:00.000Z" })
})
