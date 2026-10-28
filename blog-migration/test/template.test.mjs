import { test } from "node:test"
import assert from "node:assert/strict"
import { describeRule, guessLanguage, parseTemplate, parseTranslations, ruleMatches } from "../scripts/template.mjs"

// A miniature of the code Framer publishes for the blog post template: minified helper names, a
// rule per post, embeds nested in Section frames, and translations looked up by key.
const TEMPLATE = `
var U,W,vn,N,Z,X,Y,Q;
function M(e,t){return null}
U=(e,t)=>typeof e==\`string\`&&typeof t==\`string\`?e.toLowerCase()===t.toLowerCase():e===t,
W=(e,t)=>typeof e==\`string\`&&typeof t==\`string\`?e.toLowerCase().includes(t.toLowerCase()):!1,
vn=(e,t)=>typeof e==\`string\`&&e.toLowerCase().startsWith(t.toLowerCase());
N={AAA:new w(()=>import(\`./tpl-0.mjs\`)),BBB:new w(()=>import(\`./tpl-1.mjs\`))};
function Page(p){
  let C=p.slug??\`\`,u=p.locale;
  Z=U(C,\`seo-for-restaurants\`),X=W(C,\`loyalty\`),Y=vn(C,\`best-\`),Q=U(C,\`\`);
  return s(tn,{"data-framer-name":\`Body\`,children:[
    s(tn,{"data-framer-name":\`Section 1\`,children:[
      s(rt,{"data-framer-name":\`Section 1\`,text:\`Intro\`}),
      Z!==!1&&s(y,{children:s(x,{nodeId:\`node1\`,children:s(E,{height:\`100%\`,html:M(\`v4\`,u)??\`<div id="calc">Calc</div><script>go()<\\/script>\`,id:\`emb1\`,type:\`html\`,url:\`\`})})}),
      X!==!1&&s(y,{children:s(x,{nodeId:\`node2\`,children:s(E,{html:\`<table></table>\`,id:\`emb2\`,type:\`html\`,url:\`\`})})})
    ]}),
    Y!==!1&&s(y,{children:s(x,{nodeId:\`node3\`,children:s(E,{html:M(\`v5\`,u)??\`<p>Between</p>\`,id:\`emb3\`,type:\`html\`})})}),
    s(tn,{"data-framer-name":\`Section 2\`,children:[
      Q!==!1&&s(y,{children:s(x,{nodeId:\`node4\`,children:s(E,{html:\`<p>Orphan</p>\`,id:\`emb4\`,type:\`html\`})})})
    ]}),
    s(x,{nodeId:\`node5\`,children:s(E,{html:\`<p>Everywhere</p>\`,id:\`emb5\`,type:\`html\`})}),
    s(E,{html:\`not an embed\`,type:\`url\`})
  ]})
}
export{Page as default};
`

test("parseTemplate finds every embed with its HTML, rule, place and translation key", () => {
    const { embeds, localeModules, ruleCount } = parseTemplate(TEMPLATE)
    assert.equal(ruleCount, 4)
    assert.deepEqual(localeModules, { AAA: "./tpl-0.mjs", BBB: "./tpl-1.mjs" })
    assert.deepEqual(embeds.map(e => e.id), ["emb1", "emb2", "emb3", "emb4", "emb5"])

    const [calc, table, between, orphan, everywhere] = embeds
    assert.equal(calc.html, '<div id="calc">Calc</div><script>go()</script>')
    assert.equal(calc.translationKey, "v4")
    assert.equal(calc.nodeId, "node1")
    assert.equal(calc.place, "Section 1")
    assert.deepEqual(calc.rule, { kind: "equals", value: "seo-for-restaurants", field: "C" })
    assert.deepEqual(table.rule, { kind: "contains", value: "loyalty", field: "C" })
    assert.equal(table.translationKey, null)
    assert.equal(between.place, "after Section 1")
    assert.equal(between.section, null)
    assert.equal(between.rule.kind, "startsWith")
    assert.equal(orphan.place, "Section 2")
    assert.equal(everywhere.rule, null)
})

test("ruleMatches compares like Framer, ignoring case", () => {
    assert.ok(ruleMatches({ kind: "equals", value: "SEO-for-restaurants" }, "seo-for-restaurants"))
    assert.ok(!ruleMatches({ kind: "equals", value: "seo" }, "seo-for-restaurants"))
    assert.ok(ruleMatches({ kind: "contains", value: "loyalty" }, "best-restaurant-loyalty-software"))
    assert.ok(ruleMatches({ kind: "startsWith", value: "best-" }, "best-x"))
    assert.ok(!ruleMatches({ kind: "startsWith", value: "best-" }, "the-best-x"))
    assert.ok(ruleMatches(null, "anything"))
    assert.ok(!ruleMatches({ ambiguous: true }, "anything"))
})

test("describeRule reads as plain words", () => {
    assert.equal(describeRule({ kind: "equals", value: "a" }), 'slug is "a"')
    assert.equal(describeRule({ kind: "contains", value: "b" }), 'slug contains "b"')
    assert.equal(describeRule(null), "every post")
})

test("parseTranslations follows Framer's exported variables, or reads one object", () => {
    const exported = 'var n,o,a;n=`Publicado por: `,o=`<table>es</table>`,a=t(e,{children:`x`});export{n as v1,o as v4,a as v9};'
    assert.deepEqual(parseTranslations(exported), { v1: "Publicado por: ", v4: "<table>es</table>" })
    assert.deepEqual(parseTranslations("export default {v4:`<p>fr</p>`,v5:'<p>b</p>',other:1}"), { v4: "<p>fr</p>", v5: "<p>b</p>" })
})

test("guessLanguage tells Japanese, French and Spanish apart", () => {
    assert.equal(guessLanguage(["公開日"]), "ja")
    assert.equal(guessLanguage(["Publié par : "]), "fr")
    assert.equal(guessLanguage(["Publicado por: "]), "es")
    assert.equal(guessLanguage(["Published by"]), null)
    assert.equal(guessLanguage(["Publié par : ", `<table>${"x".repeat(100)}東京</table>`]), "fr")
})
