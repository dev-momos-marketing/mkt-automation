import { test } from "node:test"
import assert from "node:assert/strict"
import { idsUsedIn, oldSectionFields } from "../scripts/old-fields.mjs"

test("oldSectionFields picks only Section Title N and Section N", () => {
    const fields = ["Title", "Content", "Embeds", "Migrated", "Section 1", "Section Title 1", "Section 20", "Section Title 26", "Section", "Sections Intro", "Image 2", "Subsection 3"].map((name, i) => ({ id: `f${i}`, name }))
    assert.deepEqual(oldSectionFields(fields).map(f => f.name), ["Section 1", "Section Title 1", "Section 20", "Section Title 26"])
})

test("idsUsedIn ignores a field's own definition and counts a use in any other module", () => {
    const collection = "c(Zn,{uWb4TXEFU:{defaultValue:``,title:`Section Title 1`,type:u.String},vhLy0TtfC:{defaultValue:``,title:`Slug`}}),schema:[`uWb4TXEFU`,`vhLy0TtfC`]"
    const template = 'let {vhLy0TtfC:C=p.vhLy0TtfC??``}=p; x="abcXYZ123longer"'
    assert.deepEqual(idsUsedIn([collection, template], ["uWb4TXEFU", "vhLy0TtfC", "abcXYZ123"]), ["vhLy0TtfC"])
    assert.deepEqual(idsUsedIn([collection, template + ";q(uWb4TXEFU)"], ["uWb4TXEFU"]), ["uWb4TXEFU"])
})
