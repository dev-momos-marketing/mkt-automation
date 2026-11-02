import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { checkReview, labels, sections, sharedRuns } from "../scripts/reviews.mjs"
import { checkPost } from "../scripts/posts.mjs"

const original = '<h2 dir="auto">2. Zendesk</h2><p><br></p><img alt width="1470" height="791" src="https://framerusercontent.com/images/abc.png"><p>Old intro.</p><ul><li><p><strong>What you can do with Zendesk:</strong> old.</p></li><li><p><strong>Why Zendesk stands out:</strong> old.</p></li><li><p><strong>It\'s best for:</strong> old.</p></li><li><p><strong>Pricing:</strong> old.</p></li></ul><p><strong>Website:</strong> <a href="https://www.zendesk.com/">Zendesk</a></p>'
const good = `<h2>2. Zendesk</h2>
<img alt="Zendesk" width="1470" height="791" src="https://framerusercontent.com/images/abc.png">
<p>Zendesk is a service suite.</p>
<p><strong>Notable customers:</strong> Acme and Globex.</p>
<p><strong>What's new:</strong> In March 2026, it added AI agents.</p>
<p><strong>What you can do with Zendesk:</strong></p>
<ul>
<li><strong>One workspace.</strong> Answer every channel together.</li>
<li><strong>AI agents.</strong> Resolve routine questions.</li>
<li><strong>Help center.</strong> Publish answers.</li>
<li><strong>Reports.</strong> Track response times.</li>
</ul>
<p><strong>Why Zendesk stands out:</strong> It scales.</p>
<p><strong>It's best for:</strong> Larger teams.</p>
<p><strong>Pricing:</strong> Custom pricing.</p>
<p><strong>Website:</strong> <a href="https://www.zendesk.com/">Zendesk</a></p>`

test("sections splits a post at its H2 headings and numbers the reviews", () => {
    const s = sections("<p>Intro</p><h2>1. Momos</h2><p>a</p><h2>2. Zendesk</h2><p>b</p><h2>FAQ</h2>")
    assert.deepEqual(s.map(x => [x.heading, x.n]), [["", null], ["1. Momos", 1], ["2. Zendesk", 2], ["FAQ", null]])
    assert.equal(s.map(x => x.html).join(""), "<p>Intro</p><h2>1. Momos</h2><p>a</p><h2>2. Zendesk</h2><p>b</p><h2>FAQ</h2>")
})

test("labels reads the review's labels in order, including tool names with a colon", () => {
    assert.deepEqual(labels("<li><strong>What you can do: </strong>x</li><li><strong>Why businesses choose Tattle:</strong> y</li><li><strong>Best for:</strong> z</li><p><strong>It’s best for:</strong></p><p><strong>Pricing: </strong>q</p>"), ["What you can do with", "Why … stands out", "It's best for", "It's best for", "Pricing"])
    assert.deepEqual(labels("<p><strong>What you can do with Re:amaze:</strong></p><p><strong>Why Re:amaze stands out:</strong> x</p>"), ["What you can do with", "Why … stands out"])
    assert.deepEqual(labels(original), ["What you can do with", "Why … stands out", "It's best for", "Pricing", "Website"])
})

test("checkReview accepts a rewrite that keeps the structure and adds customers and updates", () => {
    assert.deepEqual(checkReview(good, { original, facts: '{"updates":[{"date":"2026-03"}]}' }), [])
})

test("checkReview reports missing assets, wrong labels, a missing list, unsourced numbers and copied text", () => {
    const bad = good.replace(/<img[^>]*>/, "").replace("<p><strong>Notable customers:</strong> Acme and Globex.</p>", "").replace("Custom pricing.", "From $49 a month.")
    const problems = checkReview(bad, { original, facts: "2026", others: ["zendesk is a service suite used by many teams around the globe"] }).join("\n")
    for (const part of ["image", "labels should be Notable customers", "$49"]) assert.ok(problems.includes(part), part)
    assert.equal(sharedRuns("<p>one two three four five six seven eight nine</p>", ["x one two three four five six seven eight y"]).length, 1)
    const label = good.replace("What you can do with Zendesk:", "What you can do with Salesforce Service Cloud:")
    assert.doesNotMatch(checkReview(label, { original: original.replace("What you can do with Zendesk:", "What you can do with Salesforce Service Cloud:"), facts: "2026", others: ["What you can do with Salesforce Service Cloud: route cases"] }).join(), /runs of 8 words/)
    assert.match(checkReview(good.replace(/<ul>[\s\S]*<\/ul>/, ""), { original, facts: "2026" }).join(), /features should be a <ul>/)
    assert.match(checkReview(good.replace('href="https://www.zendesk.com/"', 'href="https://x.com"'), { original, facts: "2026" }).join(), /link https:\/\/www.zendesk.com\/ is missing/)
    assert.doesNotMatch(checkReview(good, { original: original.replace('href="https://www.zendesk.com/"', 'href="zendesk.com"'), facts: "2026" }).join(), /link/)
})

test("every review in reviews/ is well-formed HTML", async () => {
    const root = new URL("../reviews/", import.meta.url)
    for (const post of (await readdir(root, { withFileTypes: true }).catch(() => [])).filter(d => d.isDirectory())) {
        for (const file of (await readdir(new URL(`${post.name}/`, root))).filter(f => f.endsWith(".html"))) {
            const html = await readFile(new URL(`${post.name}/${file}`, root), "utf8")
            const embeds = new Map([...html.matchAll(/⟦embed:([\w-]+)⟧/g)].map(m => [m[1], ""]))
            assert.deepEqual(checkPost(html, { embeds, paths: { has: () => true } }), [], `${post.name}/${file}`)
        }
    }
})

test("checkReview lets a different tool take a slot with swap, keeping the label order", () => {
    const ada = good.replace("2. Zendesk", "2. Ada").replace(/<img[^>]*>\n/, "").replace('href="https://www.zendesk.com/">Zendesk', 'href="https://www.ada.cx/">Ada').replaceAll("Zendesk", "Ada")
    assert.match(checkReview(ada, { original, facts: "2026" }).join(), /heading should be "2. Zendesk"/)
    assert.deepEqual(checkReview(ada, { original, facts: "2026", swap: "2. Ada" }), [])
})
