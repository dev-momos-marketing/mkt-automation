import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { checkReview, labels, sections, sharedRuns, uniquePart } from "../scripts/reviews.mjs"
import { checkPost } from "../scripts/posts.mjs"

const original = '<h2 dir="auto">2. Zendesk</h2><p><br></p><img alt width="1470" height="791" src="https://framerusercontent.com/images/abc.png"><p>Old intro.</p><ul><li><p><strong>What you can do with Zendesk:</strong> old.</p></li><li><p><strong>Why Zendesk stands out:</strong> old.</p></li><li><p><strong>It\'s best for:</strong> old.</p></li><li><p><strong>Pricing:</strong> old.</p></li></ul><p><strong>Website:</strong> <a href="https://www.zendesk.com/">Zendesk</a></p>'
const good = `<h2>2. Zendesk</h2>
<img alt="Zendesk" width="1470" height="791" src="https://framerusercontent.com/images/abc.png">
<p><a href="https://www.zendesk.com/">Zendesk</a> is a service suite for support teams.</p>
<p><strong>Key features</strong></p>
<ul>
<li><strong>One workspace:</strong> Answer every channel together.</li>
<li><strong>AI agents:</strong> Resolve routine questions.</li>
<li><strong>Help center:</strong> Publish answers.</li>
<li><strong>Reports:</strong> Track response times.</li>
</ul>
<p><strong>Pros</strong></p>
<ul>
<li><strong>Scales well:</strong> It handles large teams.</li>
<li><strong>Many apps:</strong> It connects to most tools.</li>
<li><strong>Familiar:</strong> Agents often know it already.</li>
</ul>
<p><strong>Cons</strong></p>
<ul>
<li><strong>AI costs extra:</strong> Advanced AI is an add-on.</li>
<li><strong>Setup time:</strong> Larger setups take planning.</li>
</ul>
<p><strong>Price and plans</strong></p>
<p>Zendesk shares prices on request.</p>`
const facts = '{"website": "https://www.zendesk.com/", "updates": [{"date": "2026-03"}]}'

test("sections splits a post at its H2 headings and numbers the reviews", () => {
    const s = sections("<p>Intro</p><h2>1. Momos</h2><p>a</p><h2>2. Zendesk</h2><p>b</p><h2>FAQ</h2>")
    assert.deepEqual(s.map(x => [x.heading, x.n]), [["", null], ["1. Momos", 1], ["2. Zendesk", 2], ["FAQ", null]])
    assert.equal(s.map(x => x.html).join(""), "<p>Intro</p><h2>1. Momos</h2><p>a</p><h2>2. Zendesk</h2><p>b</p><h2>FAQ</h2>")
})

test("labels reads the review's labels in order, including tool names with a colon", () => {
    assert.deepEqual(labels("<li><strong>What you can do: </strong>x</li><li><strong>Why businesses choose Tattle:</strong> y</li><li><strong>Best for:</strong> z</li><p><strong>It’s best for:</strong></p><p><strong>Pricing: </strong>q</p>"), ["What you can do with", "Why … stands out", "It's best for", "It's best for", "Pricing"])
    assert.deepEqual(labels("<p><strong>What you can do with Re:amaze:</strong></p><p><strong>Why Re:amaze stands out:</strong> x</p>"), ["What you can do with", "Why … stands out"])
    assert.deepEqual(labels(original), ["What you can do with", "Why … stands out", "It's best for", "Pricing", "Website"])
    assert.deepEqual(labels(good), ["Key features", "Pros", "Cons", "Price and plans"])
})

test("checkReview accepts a review with the linked name, key features, pros, cons and price and plans", () => {
    assert.deepEqual(checkReview(good, { original, facts }), [])
})

test("checkReview reports missing assets, wrong labels, a missing list, unsourced numbers and copied text", () => {
    const bad = good.replace(/<img[^>]*>/, "").replace("Zendesk shares prices on request.", "From $49 a month.")
    const problems = checkReview(bad, { original, facts, others: ["<p>zendesk is a service suite for support teams around the globe</p>"] }).join("\n")
    for (const part of ["image", "$49", "runs of 8 words"]) assert.ok(problems.includes(part), part)
    assert.equal(sharedRuns("<p>one two three four five six seven eight nine</p>", ["x one two three four five six seven eight y"]).length, 1)
    assert.match(checkReview(good.replace(/<p><strong>Cons<\/strong><\/p>\s*<ul>[\s\S]*?<\/ul>/, ""), { original, facts }).join(), /labels should be Key features → Pros → Cons → Price and plans/)
    assert.match(checkReview(good.replace("<li><strong>Familiar:</strong> Agents often know it already.</li>", "").replace("<li><strong>Many apps:</strong> It connects to most tools.</li>", ""), { original, facts }).join(), /1 pros \(3 to 6\)/)
    assert.match(checkReview(good.replace("<strong>Scales well:</strong>", "<strong>Scales well.</strong>"), { original, facts }).join(), /bold lead-in ending in a colon/)
    assert.match(checkReview(good.replace("<p><strong>Key features</strong></p>", "<p><strong>Notable customers:</strong> Acme.</p><p><strong>Key features</strong></p>"), { original, facts }).join(), /labels should be/)
    assert.match(checkReview(good.replace('<a href="https://www.zendesk.com/">Zendesk</a> is', "Zendesk is"), { original, facts }).join(), /name linked to its website/)
    assert.match(checkReview(good.replace('href="https://www.zendesk.com/"', 'href="https://x.com"'), { original, facts }).join(), /name should link to https:\/\/www.zendesk.com\//)
    assert.doesNotMatch(checkReview(good, { original: original.replace('href="https://www.zendesk.com/"', 'href="zendesk.com"'), facts }).join(), /link/)
    // A new domain replaces the old "Website:" link; other old links still have to stay.
    const moved = original.replace('href="https://www.zendesk.com/"', 'href="https://old-zendesk.com/"')
    assert.deepEqual(checkReview(good, { original: moved, facts }), [])
    assert.match(checkReview(good, { original: moved + '<p>See <a href="/glossary/csat">CSAT</a>.</p>', facts }).join(), /link \/glossary\/csat is missing/)
    const linkedIntro = '<h2>2. Zendesk</h2><img src="https://framerusercontent.com/images/abc.png"><p><a href="https://zendesk.com/?utm_source=x">Zendesk</a> is a suite.</p>'
    assert.deepEqual(checkReview(good, { original: linkedIntro, facts }), [])
})

test("checkReview doesn't count lead-ins or the price and plans toward copied text", () => {
    const other = good.replace("is a service suite for support teams", "helps service teams answer guests").replace("Zendesk shares prices on request.", "Zendesk shares prices on request.")
    assert.deepEqual(checkReview(good, { original, facts, others: [other.replace(/<p><a[^]*?<\/p>/, "<p>Another tool entirely, written in other words.</p>").replace(/<li><strong>([^<]+)<\/strong>[^<]*<\/li>/g, "<li><strong>$1</strong> different words here.</li>")] }), [])
    assert.equal(uniquePart(good).includes("prices on request"), false)
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

test("checkReview lets a different tool take a slot with swap", () => {
    const ada = good.replace("2. Zendesk", "2. Ada").replace(/<img[^>]*>\n/, "").replace('href="https://www.zendesk.com/">Zendesk', 'href="https://www.ada.cx/">Ada').replaceAll("Zendesk", "Ada")
    const adaFacts = '{"website": "https://www.ada.cx/"}'
    assert.match(checkReview(ada, { original, facts: adaFacts }).join(), /heading should be "2. Zendesk"/)
    assert.deepEqual(checkReview(ada, { original, facts: adaFacts, swap: "2. Ada" }), [])
})
