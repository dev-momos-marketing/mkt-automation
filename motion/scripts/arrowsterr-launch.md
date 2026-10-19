# Arrowsterr: "Ship to the answer"

**Format:** ~46s, 16:9 and 9:16, 30fps. Works muted (every beat has on-screen text).
**One idea:** Your buyers ask AI now. Arrowsterr is the pipeline from "AI named a rival" to "AI quotes your page".
**Treatment:** the whole film is a system trace. Each scene is one stage of the pipeline, shown as real product UI and dev surfaces (request, job matrix, diff, queue, stream, cron log, MCP call). Techie in the visuals, plain in the voice.
**Sources:** product claims and the sample brands and numbers (Tablely, Revora, 60%, 14 gaps, 1,900/mo, $8.4k/mo, Google 92 / AI 88) come from the arrowsterr.com homepage demo (read 2026-10-19). The new-citation beat in scene 7 is illustrative.

## Brand rules this script follows

- Greys ~85% of every frame on the flight grid (`bg-2` + 16px dot grid). `signal` blue ~10%. `night` only for the closing band.
- **One gold Spark in the whole film's key moment** (scene 7). Every other "good" state is blue or `pos` green with a chevron.
- Funnel Display headlines with one payoff word in `signal-text`. Every number in Geist Mono, tabular, with an `aw-delta` chevron.
- Motion: up or right only, 8px rise + fade, `cubic-bezier(.22,1,.36,1)`, no bounce, no spin, no parallax. Target ticks on the one number to read per scene.
- Copy: short, "you", digits, no em dashes, no emoji, no "not X, Y", no lists of three.

## Script

| # | Time | Stage | On screen | Voiceover |
|---|------|-------|-----------|-----------|
| 1 | 0:00–0:04 | **Request** | A bare request window on the flight grid. Mono text types: `prompt: "best review software for small cafes"` → `model: chatgpt`. Response streams in token by token: *"...for small cafes, **Revora** is a strong pick..."* Target ticks snap onto "Revora". A counter in the corner: `tablely.com mentions: 0`. | "Your buyer just asked ChatGPT for the best tool. It named Revora." |
| 2 | 0:04–0:09 | **Fan-out** | The one prompt splits right into 6 parallel lanes, like a CI job matrix: ChatGPT, Claude, Gemini, Perplexity, AI Overviews, AI Mode. Each lane runs, then resolves to a mono score: 64%, 48%, 71%, 82%, 55%. They roll up into one stat: **Visibility 60%** `▲ +12 pts`. Header line: `daily check · 6 engines · 0 6 * * *`. | "Arrowsterr asks your buyers' questions on 6 AI engines. Every day." |
| 3 | 0:09–0:14 | **Diff** | Competitor gaps as a diff. Green `+` rows where Tablely is cited, red `−` rows where a rival wins: `− Best review software for small cafes · Revora cited`, `− Cheapest way to reply to Yelp reviews · Guestly cited`. Badge: **14 gaps found**. Share-of-voice bars grow right: Tablely 38%, Revora 27%, Guestly 19%. | "You see every prompt where AI names a rival instead of you." |
| 4 | 0:14–0:19 | **Transform** | One red gap row lifts out and compiles into keyword rows. Columns type in: `keyword · volume · KD · intent` → `review software for cafes · 1,900 · 28 · Buy`, `best restaurant review app · 1,300 · 35 · Buy`, `how to reply to yelp reviews · 880 · 19 · Learn`. | "Each gap becomes a keyword with real search volume." |
| 5 | 0:19–0:24 | **Queue** | The Topic Bank as a priority queue, sorting itself by value: Best review software for cafes `$2.1k`, Revora alternatives `$1.4k`, Guest feedback tools for hotels `$1.2k`. Rows drop into a Mon to Fri content plan. Total locks in: **$8.4k/mo** traffic value. | "An AI agent ranks them by revenue and plans your month." |
| 6 | 0:24–0:31 | **Build** | The Agentic Writer streams a draft: *"The best review software for cafes in 2026"*. Two gauges climb as it writes: **Google 92**, **AI 88**. Checks tick: Answers 6 buyer prompts, Cites 4 trusted sources. The notched **Export draft** button presses. Status flips: `draft → live`. | "The Agentic Writer drafts the page. It is built to rank on Google and get cited by AI." |
| 7 | 0:31–0:35 | **Next run** | Cron log line: `06:00 UTC · daily check · 25 prompts · 6 engines · done`. One new row slides in with the film's only gold Spark: **New citation. Perplexity now quotes your page.** Visibility ticks `▲`. | "Next morning's check. Perplexity now quotes your page." |
| 8 | 0:35–0:40 | **Dev mode** | A terminal chat. `> how visible is tablely in AI answers this month?` A tool call renders: `arrowsterr.visibility({ brand: "tablely.com", days: 30 })` → `200 OK · 312ms` → a compact result table (visibility, share of voice, citations). Caption: MCP Server and API. | "Ask Claude about your AI visibility. Connect over MCP in 2 minutes." |
| 9 | 0:40–0:46 | **Close** | Night band with the Climb watermark rising in the corner. **Win organic search everywhere, *all at once*** (payoff in `#8FB0FF`). Notched **Start free trial** and ghost **Book a demo**. Line: Free forever plan. No card needed. White logo. Status line at the bottom, like the site footer: `All systems normal`. | "Win organic search everywhere. Start free. No card needed." |

## Why this story

- **It opens on the buyer's moment**, an AI answer naming a rival, which is the problem every Arrowsterr customer already feels.
- **The spine is the product's own pipeline** from the homepage ("From AI visibility to published content"): visibility, gaps, keywords, Topic Bank, writer. Each scene hands its output to the next, so the film reads like data flowing through a system.
- **Techie without jargon in the voice.** The dev surfaces (job matrix, diff, queue, stream, cron, MCP tool call) carry the tech feel; the voiceover stays at the brand's 9th-grade, verbs-first level.
- **The one Spark is the payoff.** Gold is saved for the moment AI quotes you, exactly as the brand reserves it for "a citation won".
- **Developers get their own beat.** MCP and API access is a real differentiator on the homepage, and it's the most techie proof point.

## Motion and sound notes

- Styles from the library: 6 Product UI demo (scenes 2–6), 11 Data story (gauges, bars), a dev-console treatment for 1, 7 and 8, Night band close.
- Transitions: everything exits left and enters from the right, matching "arrows point up or right". Cut on the beat; no iris or flips.
- Each stage's output flies into the next stage's input (match cut): the request becomes lane 1, a red diff row becomes the keyword table, keyword rows become queue items, the top queue item becomes the draft title.
- Music: minimal, precise electronic at 124 bpm (clean kick, ticking hi-hats, soft arps). Lift into scene 6, one bright chime on the Spark, resolve on the close. No stadium energy; this brand is calm and pointed.
- Voice: confident, calm, mid-tempo. Product names in their own case: ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews.
