import { test } from "node:test"
import assert from "node:assert/strict"
import { idsUsedIn, oldSectionFields } from "../scripts/old-fields.mjs"

test("oldSectionFields picks only Section Title N and Section N", () => {
    const fields = ["Title", "Content", "Embeds", "Migrated", "Section 1", "Section Title 1", "Section 20", "Section Title 26", "Section", "Sections Intro", "Image 2", "Subsection 3"].map((name, i) => ({ id: `f${i}`, name }))
    assert.deepEqual(oldSectionFields(fields).map(f => f.name), ["Section 1", "Section Title 1", "Section 20", "Section Title 26"])
})

test("idsUsedIn finds whole ids only", () => {
    const code = 'let {vhLy0TtfC:C=p.vhLy0TtfC??``,locale:u}=p; x="abcXYZ123longer"'
    assert.deepEqual(idsUsedIn(code, ["vhLy0TtfC", "abcXYZ123", "nope12345"]), ["vhLy0TtfC"])
})
