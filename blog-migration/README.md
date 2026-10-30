# Blog migration

Moving every momos.com blog post from the template's fixed blocks (`Section Title 1` / `Section 1` … `Section 26`, with 140 Embed layers between them) to **one rich-text field per post**, with each post's own embeds moved in with it. Today every post downloads every embed (a 962 KB script), which makes the pages heavy.

**How embeds work after the move.** Framer's API leaves components out of rich-text fields (checked: a Blog Embed inserted by hand comes back as nothing), so a script can't place them there. Instead, each post's **Content** has a line like `⟦embed:Eo0D3eGLd⟧` where an embed goes, its **Embeds** field holds that embed's code, and the **BlogEmbeds** component on the template puts each embed at its line. Embeds without scripts are in the server's HTML, so Google reads them as it does today.

| Step | What | How |
| --- | --- | --- |
| 1 | **Inventory**: the fields, posts and every embed with its post and place | **Blog inventory** workflow (done) |
| 2 | Add the **Content**, **Embeds** and **Migrated** fields and the **BlogEmbeds** / **HtmlEmbed** components | **Blog setup** workflow |
| 3 | Can a script put a component in rich text? No: embeds use `⟦embed:…⟧` lines and BlogEmbeds | (done) |
| 4 | Dry run: every post merged, with previews, writing nothing | **Blog inventory** workflow (done) |
| 5 | Set up the template (by hand, once), then migrate 3 posts and check them | below, then **Blog migrate** |
| 6 | Migrate the rest | **Blog migrate** with `all` |
| 7 | Delete the old Section blocks, the 140 Embed layers and the old fields: **this is what makes pages light** | by hand in Framer |

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
- Each embed is shown by a rule on a CMS field (`vhLy0TtfC`) that usually holds the post's slug, so the embed-to-post mapping is read automatically. Some posts hold another post's slug there (duplicated posts kept the original's value) or nothing, and show those embeds on the live site; the migration reads each post's own value, and the embeds report's post lists assume the slug: 139 belong to exactly one post, and one (`RnVRZQ7G9`) has an empty rule and shows nowhere.
- Checked on six live posts: the embeds on each page are exactly the ones the script lists.

## Step 2: fields and components

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

- adds a **Content** field (formatted text) for each post's merged body, an **Embeds** field (plain text) for its embeds' code, and a **Migrated** field (on/off), which decides which posts the template shows in the new layout;
- creates the **BlogEmbeds** and **HtmlEmbed** code components from `framer/`, or updates them if the copies in Framer differ, and puts one back as it was if Framer finds a type error.

It never removes or changes an existing field, touches no other collection or code file, and never publishes. Running it again changes nothing that's already in place. It stops without changing anything if the Blog collection already has a field with one of those names that's the wrong type, or a Content field that posts already use (the migration would overwrite it); add a repo variable `BLOG_CONTENT_FIELD`, `BLOG_EMBEDS_FIELD` or `BLOG_MIGRATED_FIELD` with another name in that case. (Fields from an earlier setup run, recognised by Migrated being there, are reused as they are.)

From here on, `framer/` in this repo has the master copies: edits made to the component in Framer are overwritten by the next setup run. If you already added HtmlEmbed by hand, the setup replaces it with this repo's version.

Or locally: `cd blog-migration && npm run setup` (dry run), then `npm run setup -- --apply`.

## Step 4: dry run

`npm run dryrun` builds every post's single body, in English and each translation, from the inventory's data, and writes nothing to Framer. It runs in the same **Blog inventory** workflow; the files are in the `dryrun/` folder of its download.

How a post is merged (`scripts/merge.mjs`):

- Its `Section Title N` / `Section N` pairs, in number order, each title as an `<h2>` and each body as it is. Empty sections are skipped.
- Only sections 1–20: the template has no frames for 21–26, so text there has never been on the site, and it stays out with a warning (3 posts have some). To include it, add a repo variable `BLOG_MAX_SECTION` set to `26`.
- Its own embeds where the template showed them: after the text of their section, in template order. Each is a line `⟦embed:Eo0D3eGLd⟧`, which the BlogEmbeds component replaces with the embed (step 5).
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

## Step 5: template and migration

### The template (by hand in Framer, once)

On the blog post template (`/blog/:slug`), inside **Blog content → Body**:

1. **The new body**: add a frame next to the Section frames, say **New body**, with a vertical stack. Inside it:
   - a text layer connected to **Content**. The quickest way to get the right styles is to duplicate the text layer inside **Section 2** (the one connected to Section 2), move the copy into New body, and connect it to Content instead;
   - below it, the **BlogEmbeds** component (Assets → Code), width Fill, with its **Embeds** property connected to the **Embeds** field.
2. **Show one or the other**: set New body's visibility to show when **Migrated** is on, and the old Section frames (or the frame that holds them) to show when Migrated is off.
3. Preview a migrated post and an unmigrated one. Don't publish until both look right.

### Migrate

**Actions → Blog migrate → Run workflow**, with the post slugs (comma-separated) or `all`:

- leave **apply** unticked first: the run page lists what each post would get (sections, embeds, languages, embeds left out and why), and the **blog-migrate** download has each post's Content and Embeds;
- tick **apply** to write them. It reads the posts back and checks every embed line was kept;
- **undo** switches Migrated off for those posts, so they show the old layout again (Content and Embeds are kept);
- a post whose Content already has something in it (someone edited it) is skipped unless **overwrite** is ticked.

A language is written only where every section of the post is translated; otherwise that language keeps showing English, as Framer does today. It never changes the old Section fields and never publishes.

### Adding an embed to a post later

In the post's **Content**, add a line with `⟦embed:any-name⟧` where it should go, and add its code to the post's **Embeds** field:

```html
<template data-embed="any-name">
<div>…your HTML, <style> and <script>…</div>
</template>
```

Embeds with a `<script>` run in a sandboxed frame; others are part of the page. Translate the Embeds field like any other field.

### Speed

The pages get lighter in step 7, when the old Section blocks and their 140 Embed layers are deleted from the template: until then every post still downloads them. Cleanup can go post by post: once a migrated post is checked, the embeds that belong only to it (`live/embeds.csv` says which) can be deleted.


## Internal links

**Actions → Blog links → Run workflow** adds a few links to each post's Content: to other blog posts and to glossary terms, where their topic is mentioned in the text. Leave **apply** unticked first: the run page lists every link, and the **blog-links** download has `report.csv` with the sentence each link sits in. Tick **apply** to add them.

- Targets: published posts (not drafts or `-copy` duplicates) and every glossary term in the sitemap. Each gets anchor phrases from its slug and title (`best-restaurant-loyalty-software` → "restaurant loyalty software"); a phrase two posts share is dropped, and a glossary term wins over a post.
- Rules (`scripts/linking.mjs`): at most **max** new links per post (default 4), one per paragraph, each page once, the first mention only; never in headings, embed lines or existing links, never to the post itself or to a page it already links to.
- English text only. Translated anchor text differs per language, so translations are left as they are.
- Each run adds up to **max** more links per post, so run it on new posts only (name them in **posts**). It never publishes.

## Rewriting a post

A post's body can be written in this repo: `posts/<slug>.html`, from the first H2 on (the title stays in its own field), with `<p>⟦embed:ID⟧</p>` where each of its embeds goes. Use `<h2>`/`<h3>`, `<p>`, `<ul>`/`<ol>`/`<li>`, `<strong>`, `<em>` and `<a href="/blog/slug">` or `/glossary/slug`.

**Actions → Blog write → Run workflow** with the slug. The dry run checks the HTML, that each embed line has code in the post's Embeds field and that every link goes to a page in the sitemap, and lists the word count before and after. Tick **apply** to save it to Content; the run reads it back to check the embed lines. The post's translations stay as they are and are marked **needs review** in Framer's localization. It never publishes.

New interactive embeds (calculators and the like) go in `posts/<slug>.embeds/<id>.html`, with a `<p>⟦embed:<id>⟧</p>` line in the post. The run adds each one to the post's Embeds field, or replaces the embed with that id, and keeps the others. An embed with a `<script>` runs in a sandboxed frame that grows to fit, so scope its CSS to an element id, load Poppins in it, and put the initial result in the HTML.

A post saved this way is overwritten from the file the next time it's written, so make later edits in the file. The Blog links run doesn't change the file: add links to it by hand.

## FAQs

`faqs/<slug>.json` holds a post's FAQ: a heading ("Restaurant Guest Experience: FAQ") and 4–6 questions with answers of 2–4 sentences. **Actions → Blog FAQs** (posts `all`, or slugs) adds each one to the end of its post's English Content, as an H2 with the questions as H3s. Leave **apply** unticked first: the run page lists every post and its questions.

- A post that already has an FAQ heading is skipped, so running it again never adds a second FAQ. A post written from `posts/<slug>.html` is skipped too: its FAQ goes in that file.
- Before saving, it checks the house style (`scripts/faq.mjs`): 4–6 questions, 2–4 sentences per answer, no "X, not Y", no hype words, and no number that isn't already in the post. `npm test` checks the files' form.
- A heading left empty at the very end of a post ("5. Build local backlinks", "v": leftovers from the old section layout) is removed first, and the dry run names it.
- Translations are kept and marked **needs review**. It never publishes.

## Key takeaways

`takeaways/<slug>.json` holds a post's 3–5 key takeaways (`{"items": ["…"]}`). **Actions → Blog takeaways** (posts `all`, or slugs) shows them in a box at the top of the post: the box is the post's `keyTakeaways` embed, without scripts (so it's in the page's HTML for search engines), and a `⟦embed:keyTakeaways⟧` line goes first in its Content.

- Running it again updates each box from its file and never adds a second line; posts whose box is unchanged are skipped.
- A post written from `posts/<slug>.html` is skipped: its box is in that file (the line, and `posts/<slug>.embeds/keyTakeaways.html`).
- It checks the house style (`scripts/takeaways.mjs`): 3–5 takeaways of one or two sentences, no "X, not Y", no hype words, no number the post doesn't contain.
- Translated pages don't show the box until their text gets the line; their Content is marked **needs review**. It never publishes.

## Replacing embeds with text

Some older posts draw plain content, such as a numbered list, inside an embed. That's heavier than text, and the list's headings and words sit outside the post's own text. `replacements/<slug>/<ID>.html` holds the native HTML that takes the place of the post's `⟦embed:ID⟧` line, and `replacements/<slug>/embeds/<NEW>.html` any smaller embed it still needs, such as the table that followed a list. **Actions → Blog replace embeds** (posts `all`, or slugs) makes the swap.

- The old embed's code is removed from the Embeds field, unless a translation still shows it: then it stays until that translation is updated, and the run says so.
- A line that's already replaced is skipped, so running it again changes nothing. A post written from `posts/` is skipped: change its file.
- It checks the new HTML and its links, reads the posts back, marks Content translations **needs review**, and never publishes.

## After publishing

The migration is done: each post's Embeds field now holds its embeds' code, and is the copy to edit. `npm run embeds` and `npm run migrate` read the old template from the live site, so they stop working once the old Section frames are deleted from it.
