// Offline: checks every file in terms/ without talking to Framer. Runs on every pull request.
// Usage: npm run check
import { loadConfig, loadTerms, validateTerms } from "./lib.mjs"

const config = await loadConfig()
const terms = await loadTerms()
const { errors, warnings } = validateTerms(terms, config)

for (const w of warnings) console.warn(`warning  ${w}`)
for (const e of errors) console.error(`error    ${e}`)

if (errors.length) {
    console.error(`\n${errors.length} error(s) in ${terms.length} terms. Fix them before syncing.`)
    process.exit(1)
}
console.log(`${terms.length} terms OK${warnings.length ? `, ${warnings.length} warning(s)` : ""}.`)
