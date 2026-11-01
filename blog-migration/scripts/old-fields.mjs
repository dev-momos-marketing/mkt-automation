// The old layout's fields: "Section Title 1" … "Section 20" and beyond, which the posts no longer
// use since they moved to Content. Pure functions, used by remove-old-fields.mjs and the tests.
import { numbered } from "./lib.mjs"

export function oldSectionFields(fields) {
    return fields.filter(f => {
        const n = numbered(f.name)
        return n && /^section(\s+title)?$/i.test(n.group)
    })
}

// The field ids that a piece of published code still refers to.
export function idsUsedIn(code, ids) {
    return ids.filter(id => new RegExp(`(^|[^A-Za-z0-9_])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9_])`).test(code))
}
