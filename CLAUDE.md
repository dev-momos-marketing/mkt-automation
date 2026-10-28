# mkt-automation

Momos marketing automation. `blog-migration/` holds the scripts and GitHub Actions workflows for the momos.com blog in Framer (see its README.md); `lead-routing/` is separate.

- Never call `framer.publish()` or `framer.deploy()`, and never delete CMS items from a script. A person publishes in Framer.
- Scripts that write to Framer run from the GitHub Actions workflows (the `FRAMER_API_KEY` secret is there), as a dry run first. Never ask for the API key in chat.
- When writing or editing a blog post, follow the `blog-writing` skill (`.claude/skills/blog-writing/SKILL.md`): posts live in `blog-migration/posts/<slug>.html`, every number has a named source, and the Blog write workflow saves them.
- Before committing changes in `blog-migration/`: `npm test` there.
