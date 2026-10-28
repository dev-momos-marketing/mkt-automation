import { test } from "node:test"
import assert from "node:assert/strict"
import { addLinks, buildTargets, linkedPaths, phrasesFor } from "../scripts/linking.mjs"

test("phrasesFor turns slugs and titles into topic phrases", () => {
    assert.deepEqual(phrasesFor({ slug: "best-restaurant-loyalty-software", title: "12 Best Restaurant Loyalty Software (2026)" }), ["restaurant loyalty software"])
    assert.deepEqual(phrasesFor({ slug: "franchise-reputation-management", title: "Franchise Reputation Management: Definition, Trends" }), ["franchise reputation management"])
    assert.deepEqual(phrasesFor({ slug: "chatbot-for-restaurants" }), ["chatbot for restaurants"])
    assert.deepEqual(phrasesFor({ slug: "seo-for-restaurants", title: "SEO For Restaurants: How-to, Trends" }), ["seo for restaurants"])
    // Questions and one-word topics aren't anchors.
    assert.deepEqual(phrasesFor({ slug: "how-ai-benefits-restaurants", title: "How Does AI Benefit A Restaurant?" }), [])
    assert.deepEqual(phrasesFor({ slug: "nps" }), [])
    // Long slugs (thought-leadership titles) give nothing.
    assert.deepEqual(phrasesFor({ slug: "why-chick-fil-a-makes-9-4m-per-store-and-what-weve-learned" }), [])
})

test("buildTargets drops shared phrases unless one page is a glossary term, and sorts longest first", () => {
    const targets = buildTargets([
        { slug: "restaurant-reputation-management", url: "/blog/restaurant-reputation-management", kind: "blog" },
        { slug: "reputation-management", url: "/glossary/reputation-management", kind: "glossary" },
        { slug: "restaurant-reputation-management", url: "/glossary/restaurant-reputation-management", kind: "glossary" },
        { slug: "review-management", url: "/blog/review-management", kind: "blog" },
        { slug: "review-management-x", title: "Review Management", url: "/blog/review-management-x", kind: "blog" },
    ])
    assert.equal(targets.get("restaurant reputation management").url, "/glossary/restaurant-reputation-management")
    assert.equal(targets.get("reputation management").url, "/glossary/reputation-management")
    assert.equal(targets.has("review management"), false)
    assert.deepEqual([...targets.keys()][0], "restaurant reputation management")
})

test("linkedPaths reads Framer's relative links and absolute ones", () => {
    const html = '<p><a href="./chatbot-for-restaurants">x</a> <a href="https://www.momos.com/glossary/nps/">y</a> <a href="../product/inbox">z</a> <a href="/blog/seo-for-restaurants">w</a></p>'
    assert.deepEqual([...linkedPaths(html)].sort(), ["/blog/chatbot-for-restaurants", "/blog/seo-for-restaurants", "/glossary/nps"])
})

test("addLinks links the first mention in paragraphs, once per target and paragraph, within the limit", () => {
    const targets = buildTargets([
        { slug: "net-promoter-score", url: "/glossary/net-promoter-score", kind: "glossary" },
        { slug: "best-restaurant-loyalty-software", url: "/blog/best-restaurant-loyalty-software", kind: "blog" },
        { slug: "chatbot-for-restaurants", url: "/blog/chatbot-for-restaurants", kind: "blog" },
        { slug: "restaurant-guest-experience", url: "/blog/restaurant-guest-experience", kind: "blog" },
    ])
    const html = [
        "<h2>Net Promoter Score basics</h2>",
        '<p dir="auto">Your Net Promoter Score tells you a lot, and <strong>restaurant loyalty software</strong> helps.</p>',
        "<p>The net promoter score again, and a chatbot for restaurants.</p>",
        '<p>Already <a href="./chatbot-for-restaurants">chatbot for restaurants</a> linked.</p>',
        "<p>⟦embed:abc⟧</p>",
        "<p>Restaurant guest experience matters.</p>",
        "<p>This is the restaurant guest experience post itself.</p>",
    ].join("\n")
    const { html: out, added } = addLinks(html, targets, { self: "/blog/restaurant-guest-experience", max: 4 })
    // Heading untouched; first paragraph gets one link (the first matching target), not two.
    assert.match(out, /<h2>Net Promoter Score basics<\/h2>/)
    assert.match(out, /<p dir="auto">Your <a href="\/glossary\/net-promoter-score">Net Promoter Score<\/a> tells you a lot, and <strong>restaurant loyalty software<\/strong> helps\.<\/p>/)
    // Second paragraph: NPS is linked already, and the chatbot post is linked further down the post.
    assert.doesNotMatch(out, /href="\/blog\/chatbot-for-restaurants"/)
    // Loyalty software only appears in the first paragraph, which already got its one link.
    assert.equal(added.length, 1)
    assert.deepEqual(added.map(a => a.url), ["/glossary/net-promoter-score"])
    assert.match(added[0].context, /Net Promoter Score tells you/)
    // Embed lines and the post's own topic are never linked.
    assert.match(out, /<p>⟦embed:abc⟧<\/p>/)
    assert.doesNotMatch(out, /href="\/blog\/restaurant-guest-experience"/)
})

test("addLinks stops at the limit and finds phrases across a line break", () => {
    const targets = buildTargets([
        { slug: "menu-engineering-basics", url: "/blog/menu-engineering-basics", kind: "blog" },
        { slug: "review-velocity", url: "/glossary/review-velocity", kind: "glossary" },
    ])
    const { added } = addLinks("<p>Menu engineering\nbasics first.</p><p>Then review velocity.</p>", targets, { self: "/blog/x", max: 1 })
    assert.equal(added.length, 1)
    assert.equal(added[0].phrase, "Menu engineering\nbasics")
})
