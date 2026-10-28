# Blog migration

Moving every momos.com blog post from the template's fixed blocks (`Section Title 1` / `Section 1` … `Section 20`, each with its own Embed layers) to **one field per post**, with each post's own embeds moved in with it. Today every post carries every other post's embeds, hidden, which makes the pages heavy.

| Step | What | Status |
| --- | --- | --- |
| 1 | **Inventory**: list the fields, posts and every embed in the template | done |
| 2 | Add an `HTML Embed` component, a `Content` field and a `Migrated` switch in Framer | **Blog setup** workflow |
| 3 | Test whether a script can place the embed component inside `Content` | |
| 4 | Dry run: build every post's merged body and preview it, writing nothing | `npm run dryrun` |
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

If the collection isn't called `Blog`, also add a variable `BLOG_COLLECTION` with its name. The blog post template is found by its link to the collection, or else at `/blog/:slug`; if the summary says it wasn't found, add a variable `BLOG_TEMPLATE_PATH` with one of the paths it lists.

### Run it

**Actions → Blog inventory → Run workflow**. When it's done, the run page shows the summary, and **Artifacts → blog-inventory** has the files. It runs two scripts:

- `npm run inventory` reads Framer through the API: the collection's fields and posts, and the template's layers.
- `npm run dryrun` merges every post into one body (step 4, below).
- `npm run embeds` reads every Embed in the template from the published site. Framer's API doesn't always return these embeds' code and never says which post shows each one, but the template's compiled code on momos.com holds each one's HTML, its visibility rule (`slug is "seo-for-restaurants"`), its section and its translations. It needs no API key.

| File | What's in it |
| --- | --- |
| `summary.md` | The headline numbers: posts, sections used, embeds, translations, weight |
| `fields.csv` | Every Blog field, its type and how many posts fill it in |
| `posts.csv` | Every post: highest section used, other fields used, languages translated into |
| `template-outline.txt` | The blog template's layer tree |
| `live/embeds.csv` | Every embed: the post(s) that show it, its rule, its section, size, scripts, translations |
| `live/posts.csv` | Every post with embeds: which ones, in order, and in which section |
| `live/embeds/<id>.html` | Each embed's HTML; `<id>.<language>.html` for each translation |
| `blog-items.json`, `embeds.csv`, `embed-nodes.json` | Raw data from the API, for writing the migration in step 4 |

Or locally (`embeds` alone needs no settings):

```bash
cd blog-migration && npm ci && npm run inventory && npm run embeds
```

### What it found (October 28, 2026)

- 115 posts, every one translated into French, Spanish and Japanese, using up to 26 Section blocks.
- **140 embeds, 792 KB of HTML, inside a 962 KB script that every blog post downloads**, with 3 translation files of the same size. A post shows 0 to 10 of them; 45 of 112 live posts show any.
- Each embed is shown by a rule on the post's slug, so the embed-to-post mapping is read automatically: 139 belong to exactly one post, and one (`RnVRZQ7G9`) has an empty rule and shows nowhere.
- Checked on six live posts: the embeds on each page are exactly the ones the script lists.

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

### Add the fields and the component: the Blog setup workflow

**Actions → Blog setup → Run workflow.** Leave **apply** unticked the first time: it's a dry run and lists what it would do. Read that on the run page, then run it again with **apply** ticked. It:

- adds a **Content** field (formatted text), where the migration puts each post's merged body, and a **Migrated** field (on/off), which decides which posts the template shows in the new layout;
- creates the **HtmlEmbed** code component from `framer/HtmlEmbed.tsx`, or updates it if the copy in Framer differs, and puts it back as it was if Framer finds a type error.

It never removes or changes an existing field, touches no other collection or code file, and never publishes. Running it again changes nothing that's already in place. It stops without changing anything if the Blog collection already has a field with one of those names that's the wrong type, or a Content field that posts already use (the migration would overwrite it); add a repo variable `BLOG_CONTENT_FIELD` or `BLOG_MIGRATED_FIELD` with another name in that case.

From here on, `framer/HtmlEmbed.tsx` in this repo is the master copy: edits made to the component in Framer are overwritten by the next setup run. If you already added HtmlEmbed by hand, the setup replaces it with this repo's version.

Or locally: `cd blog-migration && npm run setup` (dry run), then `npm run setup -- --apply`.

## Step 4: dry run

`npm run dryrun` builds every post's single body, in English and each translation, from the inventory's data, and writes nothing to Framer. It runs in the same **Blog inventory** workflow; the files are in the `dryrun/` folder of its download.

How a post is merged (`scripts/merge.mjs`):

- Its `Section Title N` / `Section N` pairs, in number order, each title as an `<h2>` and each body as it is. Empty sections are skipped.
- Its own embeds where the template showed them: after the text of their section, in template order. Each is a marker paragraph, `⟦embed:Eo0D3eGLd⟧`, until step 3 shows whether a script can place the HtmlEmbed component in the text itself.
- An embed inside a section the post leaves empty is left out, with a warning: Framer hides the empty section, embed and all, so the live page doesn't show it either. Embeds between sections ("after Section 7") are kept.
- Translations: each section in the post's translation, falling back to English where a translation is missing, as the site does today. Embeds use their own translations.
- Embeds without a rule (the sidebar) stay part of the template.

| File | What's in it |
| --- | --- |
| `dryrun/index.html` | Every post: sections, embeds, words, size, how much is translated, warnings, links to its previews |
| `dryrun/preview/<slug>.<lang>.html` | The merged post as it would read, with each embed shown in place (outlined in red), and a link to the live page |
| `dryrun/content/<slug>.<lang>.html` | The exact value the migration would write into the `Content` field |
| `dryrun/report.csv` | The index as a spreadsheet |

Unzip the download and open `dryrun/index.html` in a browser.
