// Reads the blog post template's compiled code, as published on momos.com, and finds every Embed in
// it: its HTML, the rule that decides which post shows it, where it sits, and its translations.
// Framer's API returns no property values for these embeds, but the published code has all of it.
import { parse } from "acorn"
import { ancestor } from "acorn-walk"

const PARSE_OPTIONS = { ecmaVersion: "latest", sourceType: "module" }

// The text of a string literal or a template literal. Template literals with ${…} keep a marker.
export function stringOf(node) {
    if (!node) return null
    if (node.type === "Literal" && typeof node.value === "string") return node.value
    if (node.type === "TemplateLiteral") {
        return node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? "${…}" : "")).join("")
    }
    return null
}

function prop(object, name) {
    return object.properties.find(p => p.type === "Property" && (p.key.name === name || p.key.value === name))?.value
}

// Framer's visibility rules compile to small helpers, renamed in every build, so they're recognised
// by what they do: equals, contains or starts with.
function ruleKind(source, fn) {
    const text = source.slice(fn.start, fn.end)
    if (!text.includes("toLowerCase")) return null
    if (text.includes(".startsWith(")) return "startsWith"
    if (text.includes("===")) return "equals"
    if (text.includes(".includes(")) return "contains"
    return null
}

// The name and value of `x = value` or `let x = value`.
function binding(node) {
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init) return [node.id.name, node.init]
    if (node.type === "AssignmentExpression" && node.operator === "=" && node.left.type === "Identifier") return [node.left.name, node.right]
    return null
}

export function parseTemplate(source) {
    const ast = parse(source, PARSE_OPTIONS)
    const helpers = new Map()
    const bindings = []
    const sections = []
    const embeds = []
    const localeModules = {}
    // Which CMS field each variable holds: `{ vhLy0TtfC: C = p.vhLy0TtfC ?? "" } = props`.
    const fieldOf = new Map()

    ancestor(ast, {
        VariableDeclarator: n => collect(n),
        AssignmentExpression: n => collect(n),
        ObjectPattern(node) {
            for (const p of node.properties) {
                const key = p.type === "Property" ? p.key?.name ?? p.key?.value : null
                const target = p.value?.type === "AssignmentPattern" ? p.value.left : p.value
                if (key && target?.type === "Identifier") fieldOf.set(target.name, key)
            }
        },
        ObjectExpression(node, _state, ancestors) {
            const name = stringOf(prop(node, "data-framer-name"))
            if (name && /^section\s*\d+$/i.test(name)) sections.push({ name, start: node.start, end: node.end })

            // { de: new X(() => import("./page-1.mjs")), ... }: the template's translations.
            const imports = node.properties.map(p => [p.key?.name ?? p.key?.value, p.value?.type === "NewExpression" && p.value.arguments[0]?.body])
            if (imports.length && imports.every(([, body]) => body?.type === "ImportExpression")) {
                for (const [key, body] of imports) localeModules[key] = stringOf(body.source)
            }

            if (stringOf(prop(node, "type")) !== "html" || !prop(node, "html")) return
            const html = prop(node, "html")
            let translationKey = null
            let code = stringOf(html)
            if (html.type === "LogicalExpression" && html.operator === "??") {
                if (html.left.type === "CallExpression") translationKey = stringOf(html.left.arguments[0])
                code = stringOf(html.right)
            }

            const objects = ancestors.filter(a => a.type === "ObjectExpression" && a !== node)
            const names = objects.map(o => stringOf(prop(o, "data-framer-name"))).filter(Boolean)
            const container = [...objects].reverse().find(o => prop(o, "nodeId"))
            const guard = [...ancestors].reverse().find(a =>
                a.type === "LogicalExpression" && a.operator === "&&" && a.left.type === "BinaryExpression" && a.left.operator === "!==" && a.left.left.type === "Identifier")
            embeds.push({
                id: stringOf(prop(node, "id")) ?? stringOf(prop(container ?? node, "nodeId")),
                nodeId: container ? stringOf(prop(container, "nodeId")) : null,
                html: code ?? "",
                translationKey,
                ruleVar: guard?.left.left.name ?? null,
                names,
                start: node.start,
            })
        },
    })

    function collect(node) {
        const b = binding(node)
        if (!b) return
        const [name, value] = b
        const member = value.type === "LogicalExpression" ? value.left : value
        if (member?.type === "MemberExpression" && !member.computed && member.property?.name && !fieldOf.has(name)) fieldOf.set(name, member.property.name)
        if (value.type === "ArrowFunctionExpression" || value.type === "FunctionExpression") {
            const kind = ruleKind(source, value)
            if (kind) helpers.set(name, kind)
        } else if (value.type === "CallExpression" && value.callee.type === "Identifier" && value.arguments.length === 2) {
            bindings.push({ name, callee: value.callee.name, field: value.arguments[0].name ?? null, value: stringOf(value.arguments[1]) })
        }
    }

    // Rules: `Z = equals(slug, "franchise-reputation-management")`. A name bound to more than one rule
    // can't be trusted, so it's reported as ambiguous.
    const rules = new Map()
    for (const b of bindings) {
        const kind = helpers.get(b.callee)
        if (!kind || b.value == null) continue
        rules.set(b.name, rules.has(b.name) ? { ambiguous: true } : { kind, value: b.value, field: b.field, fieldId: fieldOf.get(b.field) ?? null })
    }

    for (const e of embeds) {
        const inner = [...e.names].reverse().find(n => /^section\s*\d+$/i.test(n))
        const before = sections.filter(s => s.end < e.start).sort((a, b) => b.end - a.end)[0]
        e.section = inner ?? null
        e.place = inner ?? (before ? `after ${before.name}` : e.names.at(-1) ?? "")
        e.rule = e.ruleVar ? rules.get(e.ruleVar) ?? { unknown: true } : null
    }
    embeds.sort((a, b) => a.start - b.start)
    return { embeds, localeModules, ruleCount: rules.size }
}

// A translations module. Framer assigns each string to a variable and exports it under its key
// (`o = "<style>…"; export { o as v4 }`); older builds use one object ({ v4: "…" }).
export function parseTranslations(source) {
    const ast = parse(source, PARSE_OPTIONS)
    const values = new Map()
    let object = {}
    ancestor(ast, {
        VariableDeclarator: n => remember(n),
        AssignmentExpression: n => remember(n),
        ObjectExpression(node) {
            const entries = node.properties
                .filter(p => p.type === "Property" && /^v\d+$/.test(p.key.name ?? p.key.value ?? ""))
                .map(p => [p.key.name ?? p.key.value, stringOf(p.value)])
                .filter(([, v]) => v != null)
            if (entries.length > Object.keys(object).length) object = Object.fromEntries(entries)
        },
    })
    function remember(node) {
        const b = binding(node)
        const text = b && stringOf(b[1])
        if (text != null) values.set(b[0], text)
    }
    const exported = {}
    for (const node of ast.body) {
        if (node.type !== "ExportNamedDeclaration") continue
        for (const spec of node.specifiers) {
            const key = spec.exported.name ?? spec.exported.value
            if (/^v\d+$/.test(key) && values.has(spec.local.name)) exported[key] = values.get(spec.local.name)
        }
    }
    return Object.keys(exported).length >= Object.keys(object).length ? exported : object
}

// The language of a translations module, from its text, for when the locale ids can't be matched.
// Judged by the template's short labels ("Publié par", "公開者"), since embeds can quote any language.
export function guessLanguage(strings) {
    const text = strings.filter(s => s.length < 80).join(" ")
    if (/(?<!\p{L})(Publié|Mis à jour|Écrit|Rédigé)(?!\p{L})/u.test(text)) return "fr"
    if (/(?<!\p{L})(Publicado|Actualizado|Escrito)(?!\p{L})/u.test(text)) return "es"
    if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) return "ja"
    return null
}

// Whether a rule shows the embed for this value of the field it compares. Framer compares without
// case.
export function ruleMatches(rule, slug) {
    if (!rule) return true
    if (!rule.kind) return false
    const a = String(slug ?? "").toLowerCase()
    const b = rule.value.toLowerCase()
    if (rule.kind === "equals") return a === b
    if (rule.kind === "contains") return a.includes(b)
    return a.startsWith(b)
}

// The value a rule compares for a post: the CMS field it names (for most posts that field holds the
// post's slug, but a duplicated post can keep the original's value, or have it empty), else the slug.
export function ruleValueFor(rule, item) {
    if (rule?.fieldId && item.fieldData && rule.fieldId in item.fieldData) return String(item.fieldData[rule.fieldId]?.value ?? "")
    return item.slug
}

// The embeds a post shows on the live site, by its own field values. Embeds without a rule (on
// every post) belong to the template and aren't included.
export function embedsForItem(embeds, item) {
    return embeds.filter(e => e.rule?.kind && ruleMatches(e.rule, ruleValueFor(e.rule, item)))
}

export function describeRule(rule) {
    if (!rule) return "every post"
    if (rule.ambiguous) return "unclear (several rules share a name)"
    if (rule.unknown) return "unclear (rule not found)"
    const words = { equals: "slug is", contains: "slug contains", startsWith: "slug starts with" }
    return `${words[rule.kind]} "${rule.value}"`
}
