import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { BANNERS, KINDS, bannerEmbed, checkPlan, embedId, insertBanners, isPromoEmbed, placeBanners, sections } from "../scripts/banners.mjs"
import { embedsField, parseEmbedsField } from "../scripts/merge.mjs"

test("every banner is an embed without scripts, scoped to its own id, that survives the Embeds field", () => {
    for (const kind of KINDS) {
        const html = bannerEmbed(kind)
        assert.doesNotMatch(html, /<script/i, kind)
        assert.match(html, new RegExp(`^<div id="bn-${kind}"`), kind)
        const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
        for (const rule of css.split("}").map(r => r.trim()).filter(r => r && !r.startsWith("@") && !r.startsWith("}"))) {
            const selectors = rule.split("{")[0].replace(/^@[^{]*\{/, "")
            for (const sel of selectors.split(",")) assert.ok(sel.trim().startsWith(`#bn-${kind}`), `${kind}: "${sel.trim()}" isn't scoped`)
        }
        assert.equal(parseEmbedsField(embedsField([{ id: embedId(kind), html }])).get(embedId(kind)), html)
        for (const href of html.match(/href="[^"]+"/g)) assert.match(href, /^href="https:\/\/www\.momos\.com\/(alfie|rockie|case-studies\/)/, kind)
        assert.doesNotMatch(html, /\b(game[- ]changer|unlock|leverag\w*|supercharg\w*|seamless\w*|robust)\b/i, kind)
    }
    assert.equal(embedId("alfieReply"), "bnAlfieReply")
    assert.ok(isPromoEmbed('<a class="momos-cta-btn">See Momos in action</a>'))
    assert.ok(!isPromoEmbed('<div id="rev-levers">Calculator</div>'))
})

const post = [
    "<p>⟦embed:keyTakeaways⟧</p><p>Intro words here.</p>",
    "<h2>1. Do the First thing well every day</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>2. Do the Second thing well every day</h2><p>" + "word ".repeat(100) + "</p><p>⟦embed:cta1⟧</p>",
    "<h2>3. Do the Third thing well every day</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>4. Do the Fourth thing well every day</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>5. Do the Fifth thing well every day</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>6. Do the Sixth thing well every day</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>7. How Momos helps with the seventh thing</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>8. Do the Eighth thing well every day</h2><p>" + "word ".repeat(100) + "</p>",
    "<h2>Best Software For Sales</h2><p>Momos and others.</p>",
    "<h2>Sales: FAQ</h2><p>Answers.</p>",
].join("")
const embeds = new Map([["cta1", '<a class="momos-cta-btn" href="https://www.momos.com">See Momos in action</a>']])

test("placeBanners keeps banners away from Momos promotions, the intro and the closing sections", () => {
    const placed = placeBanners(post, ["alfieInbox", "rockiePeek"], embeds)
    assert.equal(placed.length, 2)
    const at = placed.map(p => p.index)
    // never next to the CTA (section 2) or the Momos section (7), never in the first section, before the software or FAQ
    for (const i of at) {
        assert.ok(![1, 2, 3, 7, 8, 9, 10].includes(i), `banner before section ${i}`)
    }
    assert.ok(at[1] - at[0] >= 2)
    const html = insertBanners(post, placed)
    assert.equal(sections(html).length, sections(post).length)
    assert.equal(html.match(/⟦embed:bn/g).length, 2)
    assert.equal(insertBanners(html, placed), html, "running again adds nothing")
    assert.equal(placeBanners(html, ["duo"], embeds).length, 0, "no room for a third banner next to the first two")
})

test("placeBanners puts at most one banner inside a list of tools, away from the Momos review", () => {
    const tools = ["Momos", "Tenzo", "Toast", "Apicbase", "Avero", "Otter", "Square", "Lineup"]
    const list = "<p>Intro.</p><h2>How To Choose</h2><p>" + "word ".repeat(60) + "</p>" +
        tools.map((t, i) => `<h2>${i + 1}. ${t}</h2><p>${t === "Momos" ? "Momos does it. Momos again." : "word ".repeat(80)}</p>`).join("") +
        "<h2>Analytics: FAQ</h2><p>Answers.</p>"
    const placed = placeBanners(list, ["rockieAnswer", "alfiePeek"])
    assert.equal(placed.length, 1)
    assert.ok(placed[0].index >= 5, `too close to the Momos review: ${placed[0].heading}`)
})

test("no banner before a closing call to action or a closing pitch", () => {
    const body = n => "<p>" + "word ".repeat(n) + "</p>"
    const post = "<p>Intro.</p>" +
        ["What Changed This Year", "Where Most Brands Slip", "How Leaders Respond", "Why Speed Matters Now"].map(h => `<h2>${h}</h2>${body(150)}`).join("") +
        `<h2>Your Stores Deserve to Be Found</h2>${body(60)}<h2>Want to Fix Problems Before They Cost You?</h2>${body(40)}<h2>Topic: FAQ</h2>${body(40)}`
    const placed = placeBanners(post, ["duo", "alfiePeek"])
    assert.ok(placed.length >= 1)
    for (const p of placed) assert.ok(!["Your Stores Deserve to Be Found", "Want to Fix Problems Before They Cost You?", "Topic: FAQ"].includes(p.heading), p.heading)
    const momos = "<p>Intro.</p><h2>One Thing To Know</h2>" + body(100) + "<h2>Two Things To Know</h2>" + body(100) + "<h2>Three Things</h2><p>Momos helps here.</p><h2>Four Things To Know</h2>" + body(100) + "<h2>FAQ</h2>" + body(10)
    for (const p of placeBanners(momos, ["duo"])) assert.ok(!["Three Things", "Four Things To Know"].includes(p.heading), p.heading)
})

test("a post with no room gets no banner", () => {
    assert.deepEqual(placeBanners("<p>Intro.</p><h2>About Momos</h2><p>Momos.</p><h2>FAQ</h2><p>x</p>", ["duo"]), [])
})

test("banners.json names known banners, one or two per post, and covers the posts/ files", async () => {
    const plan = JSON.parse(await readFile(new URL("../banners.json", import.meta.url), "utf8"))
    assert.deepEqual(checkPlan(plan), [])
    assert.ok(checkPlan({ a: ["nope"] }).length && checkPlan({ a: ["duo", "duo"] }).length && checkPlan({ a: [] }).length)
    const dir = new URL("../posts/", import.meta.url)
    for (const file of (await readdir(dir)).filter(f => f.endsWith(".html"))) {
        const slug = file.replace(/\.html$/, "")
        const html = await readFile(new URL(file, dir), "utf8")
        for (const kind of KINDS.filter(k => html.includes(`⟦embed:${embedId(k)}⟧`))) {
            const code = await readFile(new URL(`${slug}.embeds/${embedId(kind)}.html`, dir), "utf8")
            assert.equal(code.trim(), bannerEmbed(kind), `posts/${slug}.embeds/${embedId(kind)}.html is out of date: npm run banners -- --files`)
        }
    }
    assert.ok(Object.values(BANNERS).every(b => ["alfie", "rockie", "both"].includes(b.who)))
})
