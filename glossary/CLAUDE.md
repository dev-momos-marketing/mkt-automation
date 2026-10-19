# glossary

Markdown terms in `terms/` → the `Glossary` CMS collection in Framer → momos.com/glossary/<slug>. See README.md.

- GitHub is the source of truth. `npm run sync` overwrites the Glossary items it manages; edits made in Framer to those items are lost on the next sync.
- Never call `framer.publish()` or `framer.deploy()`. Publishing pushes the whole momos.com site, including other people's unfinished work. A person publishes in Framer.
- Never delete CMS items from a script. Removed terms are reported by `sync`; a person deletes them in Framer and adds a redirect.
- Never rename a term file once it's live: the file name is the URL.
- Only touch the `Glossary` collection. The Blog and other collections belong to other tools.
- Run `npm run check` and `npm test` before committing, and `npm run sync -- --dry-run` before a real sync.
- Needs `FRAMER_PROJECT_URL`, `FRAMER_API_KEY`, and network access to `api.framer.com`. Never ask for the API key in chat.
