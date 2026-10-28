# Blog migration

Moving every momos.com blog post from the template's fixed blocks (`Section Title 1` / `Section 1` … `Section 20`, each with its own Embed layers) to **one field per post**, with each post's own embeds moved in with it. Today every post carries every other post's embeds, hidden, which makes the pages heavy.

| Step | What | Status |
| --- | --- | --- |
| 1 | **Inventory**: list the fields, posts and every embed in the template | this folder |
| 2 | Add a `Content` field, a `Migrated` switch and an `HTML Embed` component in Framer | next |
| 3 | Test whether a script can place the embed component inside `Content` | |
| 4 | Dry run: build every post's merged body and preview it, writing nothing | |
| 5 | Migrate 3 posts, publish, compare speed and translations | |
| 6 | Migrate the rest | |
| 7 | Delete the old Section blocks, Embed layers and fields | |

The scripts never publish and never delete. A person does both in Framer.

## Step 1: inventory

### Setup (once)

GitHub → **mkt-automation → Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `FRAMER_API_KEY` | a Framer API key (Framer → Site Settings → General → API keys). The glossary's key works |
| Variable | `FRAMER_PROJECT_URL` | `https://framer.com/projects/Momos-Website-2025--g23b4Eds5wkUvpvpnYbL-8Quzu` |

If the collection isn't called `Blog`, also add a variable `BLOG_COLLECTION` with its name.

### Run it

**Actions → Blog inventory → Run workflow**. When it's done, the run page shows the summary, and **Artifacts → blog-inventory** has the files:

| File | What's in it |
| --- | --- |
| `summary.md` | The headline numbers: posts, sections used, embeds, translations |
| `fields.csv` | Every Blog field, its type and how many posts fill it in |
| `posts.csv` | Every post: highest section used, other fields used, languages translated into |
| `embeds.csv` | Every Embed layer: breakpoint, section, HTML or URL, a guessed post, and an empty `post` column |
| `embeds/<hash>.html` | Each distinct embed's code |
| `template-outline.txt` | The blog template's layer tree |
| `blog-items.json`, `embed-nodes.json` | Raw data, for writing the migration in step 4 |

Or locally, with the two values set in your shell:

```bash
cd blog-migration && npm ci && npm run inventory
```

### The one manual part

Framer's API shows each Embed's code but not its visibility rule (which post it's shown on). Fill in the `post` column of `embeds.csv`: in Framer, select the layer and note the post its visibility is set for. One row per distinct `file` is enough, because the copies for each breakpoint share the same code. `guessed_post` already has a guess where the embed mentions the post's slug or title.
