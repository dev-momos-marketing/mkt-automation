// The old layout's fields: "Section Title 1" … "Section 20" and beyond, which the posts no longer
// use since they moved to Content. Pure functions, used by remove-old-fields.mjs and the tests.
import { numbered } from "./lib.mjs"

export function oldSectionFields(fields) {
    return fields.filter(f => {
        const n = numbered(f.name)
        return n && /^section(\s+title)?$/i.test(n.group)
    })
}

// The field ids that published code still uses. Framer ships each CMS collection's definition with
// the page (`id:{defaultValue:…,title:"Section 1",…}` plus its schema), so a field shows up
// there whether or not the template uses it: a module that defines a field is skipped for that
// field, and any mention in another module counts as a use.
export function idsUsedIn(modules, ids) {
    const esc = id => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return ids.filter(id => modules.some(code =>
        !new RegExp(`(^|[^A-Za-z0-9_])${esc(id)}:\\{defaultValue:`).test(code) &&
        new RegExp(`(^|[^A-Za-z0-9_])${esc(id)}($|[^A-Za-z0-9_])`).test(code)))
}
