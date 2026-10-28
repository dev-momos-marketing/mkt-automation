# Blog migration

Moving every momos.com blog post from the template's fixed blocks (`Section Title 1` / `Section 1` … `Section 20`, each with its own Embed layers) to **one field per post**, with each post's own embeds moved in with it. Today every post carries every other post's embeds, hidden, which makes the pages heavy.

| Step | What | Status |
| --- | --- | --- |
| 1 | **Inventory**: list the fields, posts and every embed in the template | this folder |
| 2 | Add an `HTML Embed` component, a `Content` field and a `Migrated` switch in Framer | component in `framer/`; fields next |
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
| Repository secret | `FRAMER_API_KEY` | a Framer API key (Framer → Site Settings → General → API keys). The glossary's key works |

Add it as a **repository** secret, not an environment secret, and in this repo, not the glossary one. The project link defaults to Momos-Website-2025; set a `FRAMER_PROJECT_URL` variable only to point it elsewhere.

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

## Step 2: the HTML Embed component

`framer/HtmlEmbed.tsx` is the one embed blog posts will use, in place of the Embed layers in the template. Paste HTML (with its own `<style>` and `<script>`) or a URL.

- **Loads on scroll.** Nothing loads until the embed is about 600px from the screen, and a post only ever loads the embeds it contains.
- **Sandboxed by default.** The HTML runs in its own frame: its CSS and scripts can't break the page or read visitors' cookies. The frame resizes to fit its content as it changes. Links such as `/blog/...` open in the main window. Poppins is loaded inside, so text matches the site.
- **Inline mode**, for trusted HTML that has to reach the page itself (the same way the glossary renders its HTML). Its text is in the page's HTML from the start, so Google reads it; its scripts run on scroll.
- A URL embed keeps its **Min height**, because a page from another site can't report its height.

| Property | What it does |
| --- | --- |
| Mode | Sandboxed (default) or Inline |
| HTML | The code to embed |
| URL | A page to embed instead, if HTML is empty (sandboxed only) |
| Title | Read out by screen readers |
| Min height | Space kept before it loads; also a URL embed's height |
| Load | On scroll (default) or at once |

### Add it to Framer (once)

**Assets → Code → New file** (Code component), name it `HtmlEmbed`, replace its contents with `framer/HtmlEmbed.tsx`, and save. A later step's script will keep it in sync from this repo, the way the glossary syncs its components; until then, edits here have to be pasted again.
