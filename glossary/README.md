# Momos Glossary

```
glossary/terms/*.md ──PR──► checks ──merge to main──► GitHub Action ──► Framer CMS "Glossary"
                                                                              │
                                     momos.com/glossary/<term>  ◄── Publish in Framer
```

Each term is one Markdown file in `terms/`. A GitHub Action copies them into the `Glossary` CMS collection in Framer through Framer's [Server API](https://www.framer.com/developers/server-api-introduction). Framer renders them with a CMS page template at `/glossary/:slug`. Nothing goes live until someone clicks **Publish** in Framer.

Why this way: momos.com is hosted by Framer, and putting other code under `/glossary` would need Framer's paid rewrite or reverse-proxy add-on. Here Framer still serves the pages, but the content lives in GitHub with reviews, checks and history.

## Write a term

Create `terms/<slug>.md`. The file name is the URL, so `terms/customer-effort-score.md` becomes `momos.com/glossary/customer-effort-score`. Lowercase words joined by dashes. **Don't rename a file once it's live**.

```markdown
---
term: Customer Effort Score (CES)            # required
definition: One or two sentences, under 160 characters if you can.   # required; also the meta description
category: Metrics                            # required; one of the categories in glossary.config.json
related: [net-promoter-score, customer-satisfaction-score]           # optional; other file names
faq:                                         # optional
  - q: A question people search for?
    a: A short, direct answer.
seoTitle: What is CES? | Momos               # optional; default "What is <term>? | Momos"
seoDescription: ...                          # optional; default is the definition
updated: 2026-10-19                          # optional
draft: true                                  # optional; keeps it off the site after publishing
---

The full explanation in Markdown: headings (##), lists, **bold**, links.
Link to other terms like [NPS](/glossary/net-promoter-score).
```

Open a pull request. The **Glossary** check runs `npm test` and `npm run check`, which fail on:
- a missing field
- an unknown category
- a related term or `/glossary/...` link with no matching file
- a file name that isn't a slug

Merge, and the Action syncs to Framer. Then publish in Framer.

## Setup (once)

### 1. API key

In Framer: **Site Settings → General → API keys → Add**. Name it `Glossary Sync`. Use a separate key from `Blog Automation`, so either one can be revoked without breaking the other, and "Last used" shows which tool is active.

In GitHub: **mkt-automation → Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `FRAMER_API_KEY` | the key |
| Variable | `FRAMER_PROJECT_URL` | `https://framer.com/projects/Momos-Website-2025--g23b4Eds5wkUvpvpnYbL-8Quzu` |

Until both are set, the Action checks terms but skips the sync with a warning.

### 2. Create the collection

With Node 22+ and the two values exported in your shell (or in a Claude Code cloud session, where the environment has them):

```bash
cd glossary
npm ci
npm run setup -- --dry-run   # shows what it would create
npm run setup                # creates the "Glossary" collection and its fields
npm run sync                 # copies the terms in
```

`setup` only adds what's missing. It never removes or changes an existing field. If you add a category to `glossary.config.json` later, also add it as an option on the **Category** field in Framer. `setup` tells you which ones are missing.

### 3. Design the pages in Framer

1. **Term page:** CMS → Glossary → **Add page** (path `/glossary/:slug`). Bind the layers to fields:
   - **Term:** H1
   - **Definition:** the intro or highlight box
   - **Body:** a formatted text block
   - **FAQ:** a formatted text block; each question is an H3
   - **Related Terms:** a Collection List with its source set to this field, showing Term and linking to its page
   - **Category**
   - **Updated**
2. **Term page SEO:** in the page settings, set the title to **SEO Title** and the description to **SEO Description**.
3. **Index page:** a static page at `/glossary` with a Collection List of Glossary, sorted by Term (A–Z), optionally filtered or grouped by Category.
4. Link to `/glossary` from the footer (and nav if you want it), then **Publish**.

## Commands

| Command | What it does | Talks to Framer |
| --- | --- | --- |
| `npm run check` | Checks every term file | No |
| `npm test` | Tests the scripts | No |
| `npm run setup [-- --dry-run]` | Creates the collection and fields | Yes |
| `npm run sync [-- --dry-run]` | Creates or updates every term in Framer | Yes |

The GitHub Action (`.github/workflows/glossary.yml`) runs `check` and `test` on pull requests, and `sync` on pushes to main. It can also be run by hand: **Actions → Glossary → Run workflow**.

## Rules

- **GitHub is the source of truth.** `sync` overwrites every Glossary item that has a file in `terms/`. A fix made in Framer is lost on the next sync, so make it in the Markdown.
- **The sync never publishes.** Publishing pushes the whole site, including anyone's unfinished Framer work. Check what else changed, then publish.
- **The sync never deletes.** If you delete a term file, `sync` lists the leftover item. Delete it in Framer and add a redirect (**Site Settings → Redirects**) to the closest term or `/glossary`, so the old URL doesn't 404.
- **Quality over volume.** Claude can draft terms in bulk, but have a person edit each one before merging. Add restaurant-specific examples, check every fact, and link related terms. Hundreds of thin, look-alike pages can hurt search rankings.
