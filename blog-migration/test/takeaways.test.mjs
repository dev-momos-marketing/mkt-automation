import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { EMBED_ID, MARKER_LINE, checkTakeaways, takeawaysEmbed } from "../scripts/takeaways.mjs"
import { embedsField, parseEmbedsField } from "../scripts/merge.mjs"

test("takeawaysEmbed builds a box without scripts, escaped, that survives the Embeds field", () => {
    const html = takeawaysEmbed(["Reply to every review.", "Keep 1 < 2 & answers short."])
    assert.doesNotMatch(html, /<script/i)
    assert.match(html, /<li>Keep 1 &lt; 2 &amp; answers short\.<\/li>/)
    assert.equal(parseEmbedsField(embedsField([{ id: EMBED_ID, html }])).get(EMBED_ID), html)
    assert.equal(MARKER_LINE, "<p>⟦embed:keyTakeaways⟧</p>")
})

test("checkTakeaways accepts good takeaways and reports house-style problems", () => {
    assert.deepEqual(checkTakeaways({ items: ["Reply fast.", "Track ratings by location.", "Fix the biggest theme first."] }), [])
    const problems = checkTakeaways({ items: ["Speed matters, not price.", "It's a game-changer.", "About 37% of guests leave"] }, "").join("\n")
    for (const part of ["X, not Y", "game-changer", "should end with a period", '"37%", which isn\'t in the post']) assert.ok(problems.includes(part), part)
    assert.match(checkTakeaways({ items: ["One."] }).join(), /1 takeaways/)
})

test("every file in takeaways/ follows the house style", async () => {
    const dir = new URL("../takeaways/", import.meta.url)
    for (const file of (await readdir(dir)).filter(f => f.endsWith(".json"))) {
        const takeaways = JSON.parse(await readFile(new URL(file, dir), "utf8"))
        assert.deepEqual(checkTakeaways(takeaways, "").filter(p => !p.includes("isn't in the post")), [], file)
    }
})
