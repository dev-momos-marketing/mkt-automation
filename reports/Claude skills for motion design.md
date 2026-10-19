# Teach Claude Code to direct momos videos

The tools are no longer what limits quality. Direction is. The official Remotion skills and HeyGen's HyperFrames already take Claude Code from a prompt to a rendered MP4 in minutes. Both teach correct use of their APIs, not taste. One reviewer calls the Remotion skill "more guardrails than magic", and a typical one-shot result gets described as "not beautiful but fairly good" ([Quickleap](https://quickleap.io/blog/remotion-claude-code-skill-review), [Substack note](https://substack.com/@techysurgeon/note/c-231237268)). Teams whose output looks expensive add four layers on top. First, a brief that replaces adjectives with cubic-bezier values, frame counts and hex codes. Second, brand and motion token files the agent must read before animating. Third, a loop that renders stills, judged by a separate critic agent that never sees the code. Fourth, human sign-off on the storyboard and a final watch on a phone. For momos, the recommended stack has four parts: Remotion skills as the render engine, Anthropic's frontend-design and brand-guidelines skills for anti-slop calibration, a house `momos-motion` skill holding numeric rules, and a companion review skill that plays the strict critic. The numeric rules cover expo-out entrances, near-critically-damped springs, 40–80 ms stagger, one second of hold per 13 characters, and a composite 9:16 safe box. Budget for real iteration on the first piece: one documented 30-second film took **14 hours and 7 critique rounds** ([claude-video-studio](https://github.com/rishabhsxn/claude-video-studio)). After that, every later video starts from the same encoded taste instead of the model's defaults. Remotion is free only for companies with up to three employees, so momos will need a Company License ([Remotion LICENSE](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)).

## Four official skill sets cover the pipeline; everything else is a community bet

**Remotion's official skills should be the default engine for momos's MP4 work.** The `remotion-dev/skills` repo has 5.3k stars. It has grown from a single best-practices skill at its January 2026 launch into **12 task-scoped skills**: create, markup, render, studio, captions, maps, saas, interactivity, docs, upgrade, multimedia, and a `remotion-best-practices` router. It installs with `npx skills add remotion-dev/skills` ([GitHub](https://github.com/remotion-dev/skills)). The `remotion-markup` skill alone links about 40 topic files covering sequencing, transitions, motion blur, LUT color grading, ElevenLabs voiceover, SFX, Lottie, text measurement and Zod-parametrised compositions ([remotion-markup SKILL.md](https://raw.githubusercontent.com/remotion-dev/skills/main/skills/remotion-markup/SKILL.md)). The Zod-parametrised compositions matter most for marketing, because one template can render per-feature, per-locale or per-customer variants. The skill's value is mostly defensive. It stops Claude from writing CSS transitions and Tailwind animation classes, which "will not render correctly". It also forces all motion through `useCurrentFrame()` and `interpolate()` ([remotion-markup](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)). Without it, Claude "frequently gets interpolation curves, audio trimming, and composition patterns wrong" ([Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills)). Newer conventions such as inline keyframes and Studio-editable elements are built so a human can open Remotion Studio and polish what Claude drafted. That makes "Claude drafts, designer finishes" a realistic split of work.

**HyperFrames is the serious alternative and worth a one-week bake-off.** HeyGen's Apache-2.0 renderer turns HTML/CSS plus GSAP, Lottie, Three.js or WAAPI animation into deterministic MP4 through headless Chrome and FFmpeg. It has **66.9k stars**, and it ships 21 skills, including ready-made `/product-launch-video`, `/pr-to-video`, `/faceless-explainer`, `/embedded-captions` and `/figma` workflows that map closely to B2B SaaS marketing ([GitHub](https://github.com/heygen-com/hyperframes)). It has weaknesses. Its README calls its Studio "evolving" and points to Remotion Lambda as the "mature cloud renderer". One reviewer found its template catalog thin and its single-machine rendering slow ([andrew.ooo](https://andrew.ooo/posts/hyperframes-heygen-html-video-agents-review/)). No independent head-to-head comparison of Remotion and HyperFrames exists, so momos should run the same brief through both.

For web animation on momos.com or in the product rather than rendered video, GreenSock's official `gsap-skills` (8 skills covering core, timelines, ScrollTrigger, React and performance) and Motion's AI Kit (`npx motion-ai`, which also wires up Motion's MCP server) are the maintained choices ([gsap-skills](https://github.com/greensock/gsap-skills), [motion.dev](https://motion.dev/ai-kit)). Whether the Motion kit is free or requires the paid Motion+ plan is unresolved in the sources. GSAP skills also pair naturally with HyperFrames, which uses GSAP as a runtime. They conflict with Remotion, which forbids animation that isn't driven by the frame number. Anthropic's own `anthropics/skills` marketplace has no video skill. It still carries **frontend-design**, the most refined anti-"AI slop" taste skill available, plus brand-guidelines, theme-factory and skill-creator. All of them matter here ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills)).

| Tool | Install | Use at momos for | Caveat |
|---|---|---|---|
| Remotion skills | `npx skills add remotion-dev/skills` | Primary MP4 engine, templated variants, captions, VO | Company License needed; guardrails, not taste |
| HyperFrames | `claude plugin marketplace add heygen-com/hyperframes` → `claude plugin install hyperframes@hyperframes` | Bake-off engine; launch/PR-to-video workflows; Figma import | Studio still maturing; skills.sh copy can lag `main` |
| gsap-skills | `npx skills add https://github.com/greensock/gsap-skills` | Website/scroll animation; GSAP inside HyperFrames | Don't mix into Remotion |
| Motion AI Kit | `npx motion-ai` | React UI micro-interactions | Pricing unclear; "Motion MCP" name collides with usemotion.com |
| anthropics/skills | `/plugin marketplace add anthropics/skills` → `/plugin install example-skills@anthropic-agent-skills` | frontend-design, brand-guidelines, skill-creator | No video skill |
| Lottie | `npx skills add diffusionstudio/lottie` | Text-to-Lottie icons; embed via `@remotion/lottie` | Single-file community skill |
| Manim | `/plugin marketplace add Yusuke710/manim-skill` | Diagram explainers only | "Precision explanations, not cinematic flair" |
| After Effects MCPs | Community CEP/ExtendScript bridges | Only for scripted variants of existing AE templates | Fragile; one failed on macOS; "anthropics/ae-mcp" listing unverified |

Sources for the table: [Lottie skill guide](https://mcp.directory/blog/claude-text-to-lottie-skill-guide), [manim list](https://github.com/wilwaldon/Claude-Code-Video-Toolkit), [claudemarketplaces](https://claudemarketplaces.com/skills/affaan-m/ecc/manim-video), [glama.ai AE MCP](https://glama.ai/mcp/servers/p10q/ae-mcp).

The community kits are worth reading for their rules even if momos never installs them. They are `whaleyxbt/claude-motion` ("Remotion skills teach your agent the API. This teaches it taste"), `NovusEdge/motion-lab`, `rishabhsxn/claude-video-studio`, `EveryInc/product-launch-video`, `digitalsamba/claude-code-video-toolkit` (2.3k stars, brand profiles and a `/scene-review` command), `Vincentwei1021/video-shotcraft` (152 shot recipe cards), `emilkowalski/skills` and `lottiefiles/motion-design-skill` ([claude-motion](https://github.com/whaleyxbt/claude-motion), [digitalsamba](https://github.com/digitalsamba/claude-code-video-toolkit), [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)). Each is maintained by one person or a small team. Anthropic's guidance is to install skills "only from trusted sources" and audit bundled code ([Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)). So pin or vendor anything momos adopts, and lift the useful rules into the house skill rather than depending on the upstream repo.

## Professional motion is a set of numbers the agent may not invent

Practitioners agree on why AI motion looks generic. Given a vague brief, the agent writes "the median of every tutorial": an opacity fade, a small upward slide, a centred layout, a linear gradient. Words like "modern and sleek" name no decision, so every decision falls back to the default ([snapcn](https://snapcn.dev/why-ai-motion-graphics-look-the-same)). The fix every strong skill uses is a lookup table. Emil Kowalski's animate skill states it bluntly: "No approximated values. Every curve, duration, and spring config comes from the tables below," and "Never present motion options as a menu. Make the call" ([emilkowalski/skills](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md)). The values below are a starter token set for momos. Each comes from a design system or a published skill, not from guesswork.

### Easing: strong asymmetric curves, and springs that barely overshoot

CSS's built-in easings are "too weak". Ease-in on an entrance delays "the exact moment the user is watching", and linear motion reads as robotic except for constant motion such as tickers, progress bars or camera drift ([Emil STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)). Remotion's own canonical example uses `Easing.bezier(0.16, 1, 0.3, 1)` (expo-out) for reveals and a no-bounce `Easing.spring({damping: 200})` for transforms ([remotion-markup](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)). Springs are where AI motion most often looks cheap. **Remotion's `spring()` default (mass 1, stiffness 100, damping 10) has a damping ratio of 0.5, which computes to roughly 16% overshoot**: the "boingy" look ([Remotion spring docs](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/spring.mdx)). At stiffness 100, damping 15 gives about 2.8% overshoot and damping 20 gives critical damping with none. Material 3's Expressive tokens use damping ratio 0.8 for default spatial motion and keep color and opacity critically damped ([androidx tokens](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt)). The detector in pbakaus's open-source Impeccable skill flags bounce and elastic easing as AI-slop tells ([pbakaus/impeccable](https://github.com/pbakaus/impeccable)).

### Timing, holds and stagger: readability sets the floor

Video can afford longer moves than UI, but text sets a hard minimum. Hold any line for at least **one second per 13 characters**, so a 30-character line needs at least 2.3 s ([legibility.info](https://legibility.info/rules-for-text-in-videos)). Motion-lab's version is 0.3 s per word plus 0.5 s ([motion-lab numbers.md](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md)). Netflix never shows a subtitle event for less than 5/6 of a second ([Netflix Timed Text](https://backlothelp.netflix.com/hc/en-us/articles/215758617)). For list items, stagger by **30–80 ms**. Anything longer feels slow, and everything entering at once is a named failure ([Emil STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)). LottieFiles caps total stagger under 500 ms and allows no more than a third of elements to be active at once ([quality-checklist](https://github.com/lottiefiles/motion-design-skill/blob/main/skills/motion-design/reference/quality-checklist.md)). Exits should be shorter than entrances, about 40–50% of the entrance duration in motion-lab's table. Nothing should appear from nothing: start at scale 0.9–0.97 with opacity 0, never `scale(0)` ([Emil STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)). Write all of these in seconds or beats, never raw frames. Remotion's skill requires reading `fps` from `useVideoConfig()` so that 30 fps drafts and 60 fps finals keep identical timing.

| Token | Value | Source |
|---|---|---|
| Enter (reveals, text, logo) | `cubic-bezier(0.16, 1, 0.3, 1)` expo-out; premium alt `(0.22, 1, 0.36, 1)` | [Remotion](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md), [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md) |
| Move on screen / camera | `cubic-bezier(0.77, 0, 0.175, 1)` or `(0.76, 0, 0.24, 1)` | [Emil](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md), [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md) |
| Exit | `cubic-bezier(0.7, 0, 0.84, 0)` at 40–50% of enter duration | [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md) |
| Springs | Damping ratio 1.0 for text/opacity; 0.7–0.85 "premium" for shapes; 0.4–0.6 only for one playful accent. Remotion: `damping: 200`, or ≥16 at stiffness 100 | [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md), [Remotion](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/spring.mdx) |
| Durations | UI feedback 100–200 ms; UI move 200–500 ms; hero reveal 600–900 ms | [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md) |
| Stagger | Letters 1 frame; words 60–120 ms; list items 40–80 ms; total under 500 ms | [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md), [LottieFiles](https://github.com/lottiefiles/motion-design-skill/blob/main/skills/motion-design/reference/quality-checklist.md) |
| Secondary elements | 50–70% of hero travel, starting 100–200 ms later | [motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md) |
| Text hold | ≥1 s per 13 characters (or 0.3 s/word + 0.5 s) | [legibility.info](https://legibility.info/rules-for-text-in-videos) |
| Flashing | ≤3 flashes per second | [Yale / WCAG 2.3.1](https://usability.yale.edu/digital-accessibility/accessibility-resources/accessibility-articles/animated-content-and-timing) |

### Choreography: shots, cuts and one hero at a time

The deepest difference between slop and craft is structural. Agents "animate properties inside a single scene rather than building a sequence of shots with cuts, which is where rhythm comes from" ([snapcn](https://snapcn.dev/why-ai-motion-graphics-look-the-same)). Flatness "usually comes from the shot scale never changing" ([suno.bi](https://suno.bi/en/blog/shot-scale-camera-motion-rhythm-method-sunomv-2026)), and plain fades to black make a piece feel "like a PowerPoint" ([ChatCut](https://chatcut.io/blog/ai-motion-graphics-prompts-seedance-2)). Anthropic's frontend-design skill gives the governing rule: "A single orchestrated moment ... lands better than scattered effects; fade-and-slide-up entrances on each section ... read as AI-generated," and "spend your boldness in one place" ([frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)). Motion-lab's review step counts moving elements per frame, because "more than one hero at a time is the most common failure" ([motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/SKILL.md)). claude-video-studio's house rules work well as pacing rules for momos. Frame 0 is never empty. The hook must be readable by 2 s. Something new appears every 2–4 s. No hold lasts longer than one bar without a micro push (scale 1.00→1.04). The end card lasts at most 2 s and is never static. "A pure opacity fade is never an enter or exit" ([CLAUDE.md](https://github.com/rishabhsxn/claude-video-studio/blob/main/CLAUDE.md)). That file allows a small set of entrances: rise through a mask, grow from a source, type-on, build from skeleton to content. Exits work the same way: lift through a mask, get covered, get pushed, collapse into the next shot, or a hard cut. Cut on motion rather than letting a scene settle to rest before the cut ([HyperFrames doctrine guide](https://aiagentskills.net/blog/skill-heygen-com-hyperframes-motion-doctrine-guide)).

### Kinetic type and sound: masks, real fonts, and frames per beat

Animate headlines, not body copy. Reveal 3–8-word headlines word by word and longer text line by line ([StudioMeyer](https://studiomeyer.io/en/blog/kinetische-typografie)). Mask reveals, where text rises from behind a hard edge, read as more premium than opacity fades ([Todaymade](https://www.todaymade.com/blog/kinetic-typography-examples)). A `clip-path: inset()` wipe on `(0.77, 0, 0.175, 1)` is a ready recipe ([Emil](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)). Defaulting to Inter is a named AI giveaway, so momos's brand fonts belong in `public/fonts/` and should load through Remotion's font loader, which blocks rendering until the font is ready ([Charlie Hills](https://charliehills.substack.com/p/5-fixes-for-claude-motion-graphics), [google-fonts.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/google-fonts.md)). For music sync, **frames per beat = fps × 60 / BPM**, so 120 BPM at 30 fps gives 15 frames per beat. Compute each cut from its beat index rather than adding up rounded durations, which drift ([Tap Tempo](https://taptempocalculator.com/bpm-to-frames-calculator/)). A whoosh's loudest point should land on the cut frame, and impacts land exactly on the hit; "even 50 ms early reads as sloppy" ([Zella](https://zellahq.com/blog/sound-design-at-cuts-whoosh-impact-riser/)). Motion-lab puts sound hits 1 frame after the picture event and 3–6 dB over the music bed. claude-motion masters to −14 LUFS with true peak at or below −1 dBFS ([motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/SKILL.md), [claude-motion review-loop](https://github.com/whaleyxbt/claude-motion/blob/main/.claude/skills/review-loop/SKILL.md)). For texture, Remotion ships `noise()`, `paper()`, motion blur and `lut()` grading, which beat CSS approximations ([remotion-markup](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)). Use them sparingly, though: the stricter critics ban light leaks, glitches, particles, glows and spins outright unless the brief justifies them ([frame-critic](https://github.com/rishabhsxn/claude-video-studio/blob/main/.claude/agents/frame-critic.md)).

## Design every cut for a muted phone and a 768×960 safe box

**A single 1080×1920 master covers Reels, TikTok, Shorts, LinkedIn mobile and X vertical.** Add a 1080×1350 (4:5) cut for the Instagram, Facebook and LinkedIn feeds, and 1920×1080 for LinkedIn desktop, X and YouTube. LinkedIn serves vertical ads only to mobile, so 16:9 is the safe choice when targeting desktop ([QuickFrame](https://quickframe.com/blog/linkedin-video-ad-specs)). The binding file limit is LinkedIn's **200 MB, MP4 only, H.264/AAC, 30 fps recommended** ad cap ([Sendspark](https://blog.sendspark.com/linkedin-video-specs)). Do not crop one aspect ratio into another. "A 16:9 clip cropped to 9:16 in post usually looks bad", so each ratio should get its own Remotion composition with its own layout ([EveryInc](https://github.com/EveryInc/product-launch-video/blob/main/.claude/skills/product-launch-video/SKILL.md)).

Platform UI covers different parts of the vertical frame on each platform. Meta Reels reserves roughly 14% top, 35% bottom and 6% on each side ([Inro](https://www.inro.social/tools/instagram-reels-safe-zone-checker)). Google's Shorts ad template keeps the top 288 px, bottom 672 px, left 48 px and right 192 px clear ([AdCheckLab](https://adchecklab.com/articles/youtube-shorts-safe-area-dimensions)). TikTok in-feed guides list about 240/660/120/120 ([Solidlabs via search](https://www.solidlabs.com/social-safe-zones)). Combining all three gives a conservative **safe box of x 120–888, y 288–1248 (about 768×960 px)**. The headline, the UI focal point, the logo and burned-in captions should all sit inside it, with captions in its lower band rather than in the bottom 672 px, where usernames and CTA buttons sit. All of these pixel values come from third-party transcriptions that disagree with one another, so check them against the live platform pages before locking a template. Inside the box, Remotion's layout rules set the type floor: headline **84 px**, important supporting text **44 px** on a 1080-wide frame, and "you are designing a video, not a webpage" ([video-layout.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-create/video-layout.md)).

The creative conventions all assume sound-off viewing. Meta's guidance is to show the brand and key message within three seconds, with motion in the first frame, designed for sound off ([Benly](https://benly.ai/learn/meta-ads/video-ads-guide)). Do not quote the familiar "47% of value in the first 3 seconds" and "85% watched muted" statistics. Both trace to studies from around 2016 ([BrandRocket](https://www.brandrocket.net/resources/your-video-ad-has-to-work-with-the-sound-off-then-it-has-to-work-better-with-it)). Paid B2B spots perform best at 15–30 s ([Factors.ai](https://www.factors.ai/blog/linkedin-video-ads-best-practices)). Every's launch skill adds that "product must appear within 3 seconds" and that "85%+ of social views are muted — burn all captions in" ([EveryInc](https://github.com/EveryInc/product-launch-video/blob/main/.claude/skills/product-launch-video/SKILL.md)). Keep captions to 25–32 characters per line, at most two lines, sentence case, on a plate or outline that reaches 4.5:1 contrast ([Nimdzi](https://www.nimdzi.com/subtitling-vertical-videos-guidelines-where-art-thou/), [Limecraft](https://support.limecraft.com/support/solutions/articles/48001169202)). LinkedIn is the channel that matters most for momos. Its video uploads rose 34% and viewership 36% year over year ([TechCrunch](https://techcrunch.com/2025/02/04/linkedin-amps-up-vertical-video-tools-as-uploads-jump-36)), and 8 in 10 teams call it their primary video channel ([Wistia](https://wistia.com/stateofvideo)).

momos's subject matter suggests four formats, and each fits the "real UI as hero" pattern. In a **review-card stack**, Google- and Yelp-style cards land, the star rating counts up, and momos's AI-drafted reply types out in the real interface. A **stat counter** shows one large number per beat (rating 4.1→4.6, response time) with a source line. A **UI push-in** has the camera move to one focal region per 2–3 s, guided by a deliberate cursor. A **customer result** card pairs an operator quote with a before/after metric. That last format likely performs best: secondhand Vidyard figures put case-study video engagement at 36%, against 23% for product videos ([Brixon Group](https://brixongroup.com/en/?p=6417)). Lago, modelling its films on Linear's, describes the principle as "the camera moves through the real product, one action at a time" ([Lago](https://getlago.com/blog/we-killed-our-motion-design-job)). On mobile, crop hard into the UI and use large labels, because a full dashboard is unreadable at 9:16 ([Hera](https://hera.video/blog/ui-animation-video-for-software-marketing)). Anonymise or recreate diner names and reviews, and get permission before showing a restaurant customer's logo. Giant Ant's OpenTable work is the closest category reference among top studios ([Giant Ant](https://www.giantant.ca/)).

## Brief, storyboard, render stills, and let a blind critic decide

### A brief with no empty slots

Every published high-quality result sits on a long brief, or on a skill that writes one. Motion-lab's `directing-motion` skill makes the agent fill a `brief.md` before writing code. Its rationale is the clearest statement of the problem: "Every decision left open in the brief is filled with the model's default look: dark backdrop, neon glow, purple-to-blue gradients ... everything centered and moving at once. Replace each adjective with a number before building" ([motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/SKILL.md)). A momos version combines motion-lab's slots with Every's marketing rules: lead with the viewer's problem, never invent UI labels, and end on one headline plus a CTA using the landing page's real tagline ([EveryInc](https://github.com/EveryInc/product-launch-video/blob/main/.claude/skills/product-launch-video/SKILL.md)).

```
GOAL:    what the restaurant operator should understand/feel, one sentence, about THIS feature
OUTPUT:  Remotion 4.0.x; 1080x1920 + 1080x1350 + 1920x1080 compositions; MP4 h264 crf 18
TIME:    seconds x fps = N frames; BPM + frames-per-beat if cut to music
LOOK:    momos palette in hex with ONE accent; brand type face/weights/sizes; texture if any
MOTION:  easings as cubic-bezier, springs as damping ratio, durations in frames (from tokens)
SHOTS:   frame/beat ranges; ONE hero move each; how each shot hands off to the next
COPY:    hook line (problem first), real UI strings, captions, end-card tagline + CTA
DATA:    which numbers are real (source) vs illustrative; anonymisation applied
BANNED:  defaults this piece must not use (start from the house list)
QA:      frames to still (every shot boundary + hit); phone-size check; critic threshold
```

Gate the build on approval. Abubakr Chan's published launch-film brief ends with "Ask me for the inputs, then show me the state list on the beat grid before you write any code." It also carries a `<gotchas>` section that grows with each project ([product-launch-motion](https://github.com/AbubakrChan/product-launch-motion/blob/main/references/prompts.md)). VoMinhKhoii's skill goes further, running a taste interview, measured reference films, 3–5 concepts and a storyboard sign-off: "Nothing renders until you sign off the storyboard" ([motion-graphic-skill](https://github.com/VoMinhKhoii/motion-graphic-skill)). Claude Code cannot ingest video directly. Convert reference films into frame grabs or contact sheets with ffmpeg first. Text descriptions of a reference are weaker than its frames ([Louise de Sadeleer](https://louisedesadeleer.substack.com/p/how-i-make-custom-motion-graphics)).

### A project that makes the right thing the easy thing

The best setups put brand and motion decisions in files the agent must read, and they port the real product UI rather than mock it. claude-video-studio is a good template ([README](https://github.com/rishabhsxn/claude-video-studio)). It keeps a `brand.md` with a claims table, which pairs each claim with proof that it is true. A `frame.md` is mirrored into `theme.ts`, so "scenes never hard-code hex". Motion primitives live in `src/motion/`. Each video moves through a chain of files: brief, script, shot list, a beat-based `timeline.json`, then scenes. A 5-second smoke video tests the pipeline. claude-motion's key trick is "One timeline for everything ... retiming the video retimes the sound and the checks with it" ([claude-motion](https://github.com/whaleyxbt/claude-motion)). For momos, that looks like this:

```
momos-motion/                       # one Remotion repo
├── CLAUDE.md                       # render contract, banned looks, gates, compaction "keep" list
├── .claude/skills/momos-motion/    # house taste skill (next section)
├── .claude/skills/momos-motion-review/
├── .claude/agents/frame-critic.md  # fresh-context critic: reads frames, never code
├── brand/brand.md  brand/frame.md  brand/sound.md
├── src/theme.ts                    # palette, type scale, easing + duration + spring tokens
├── src/motion/                     # reveals, counters, camera, safe-zone + format helpers
├── src/kit/                        # ported momos UI, review cards, logo lockup, grain
├── refs/                           # contact sheets of reference films (local study only)
├── videos/<slug>/brief.md → shotlist.md → timeline.json → scenes/*.tsx
└── remotion.config.ts              # h264, crf 18
```

Remotion's official setup is `npx create-video --yes --blank my-video`, then `npx remotion skills add`, then `npm run dev` in one terminal and `claude` in a second ([Remotion coding-agents docs](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/coding-agents.mdx)). The skill keeps Studio open so a human can watch and steer. It renders only when explicitly asked, and it will not overwrite edits a human made in Studio ([remotion-best-practices](https://github.com/remotion-dev/skills/blob/main/skills/remotion-best-practices/SKILL.md)). CLAUDE.md should also hold the determinism rules from claude-video-studio's file: no `Date`, no `Math.random`, no timers, and no `will-change` on anything the camera scales. Charts get `isAnimationActive={false}` ([CLAUDE.md](https://github.com/rishabhsxn/claude-video-studio/blob/main/CLAUDE.md)). `interpolate()` needs `extrapolateRight: "clamp"`, because it doesn't clamp by default ([timing.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/timing.md)).

### Render stills, tile them, and critique numerically

Agents cannot watch video, but they can read frames, so every serious workflow renders stills. Remotion renders any frames with `npx remotion render <id> out/frames --frames=0,30,90 --image-format=png` ([remotion-render](https://github.com/remotion-dev/skills/blob/main/skills/remotion-render/SKILL.md)). claude-motion's loop runs in four steps. First, render a half-resolution draft. Then take one frame 0.3 s after each timeline beat and tile the frames 4×2 with timestamps. Then check them against a checklist covering focal point, collisions during transitions, nothing within about 60 px of an edge, frame 0 working as a thumbnail, and exits faster than entrances. Finally, scrub the risky transitions at 0.2 s intervals. Its rule is "Don't claim a fix you haven't re-rendered and looked at" ([review-loop](https://github.com/whaleyxbt/claude-motion/blob/main/.claude/skills/review-loop/SKILL.md)). That loop caught a regression the agent introduced itself when retiming: "the prompt bar hitting the outgoing title at 3.7 s" ([example](https://github.com/whaleyxbt/claude-motion/blob/main/examples/01-effort/README.md)). Notes must be numeric and few: "`frame 84: <what is wrong>: <the number that changes>`. Apply one or two per round ... 'it feels off' is not a note" ([motion-lab](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/SKILL.md)).

**A fresh-context critic is the most cited quality lever.** claude-video-studio's `frame-critic` subagent opens with "You are reviewing a video you did not make ... Do not read source code." It reviews contact sheets, a 360 px "phone" sheet, frame strips around cuts and a 9:16 safe-zone overlay. It scores eight criteria from 1 to 10 with automatic caps: any fade used as an enter or exit maxes out at 6, as does invented UI or a second accent color. It outputs the "three worst problems" with testable fixes, and it approves only when every score is at least 8 ([frame-critic.md](https://github.com/rishabhsxn/claude-video-studio/blob/main/.claude/agents/frame-critic.md)). Every runs four critics in parallel instead (design, readability at 720p, narrative/pacing, brand), because "after 50 renders, you lose the ability to see the video" ([EveryInc](https://github.com/EveryInc/product-launch-video/blob/main/.claude/skills/product-launch-video/SKILL.md)). This loop has a real cost. The polished 30-second film took 14 hours and 7 rounds, and each final render took 18–19 minutes per format on an M1 Pro. The author's advice is to set the stopping rule before round 1, for example "3 rounds, or every score ≥ 8", because "the critic will always find something" ([claude-video-studio](https://github.com/rishabhsxn/claude-video-studio)). Simple pieces are far cheaper: one shot-list prompt produced a 12-second 1080p clip in about 9 minutes for about $1 of model usage ([wireflow.ai](https://www.wireflow.ai/blog/claude-motion-graphics)). Two limits remain. Claude "can't hear or watch in real time ... You pick the music and the voice by ear, and you watch the drafts on your phone." And no source shows that Claude can judge how timing feels from stills alone ([claude-video-studio](https://github.com/rishabhsxn/claude-video-studio)). The final watch belongs to a human.

### Licensing and permissions to settle before launch

Remotion is free for individuals and for-profit companies with up to three employees. Anyone else "is required to obtain a Company License" ([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)). Search summaries of remotion.pro put "Creators" seats at **$25/seat/month** for teams making their own videos, and "Automators" at **$0.01 per render with a $100/month minimum** for automated pipelines ([remotion.pro](https://www.remotion.pro/license)). A momos marketing team fits Creators. A data-driven variant pipeline would move it to Automators. Confirm current terms, since Remotion 5.0 changes the licence. HyperFrames is Apache-2.0 and GSAP is free, bonus plugins included. ElevenLabs' free plan is non-commercial and requires attribution. Reference films downloaded for study are "local study only ... never commit or publish them" ([claude-video-studio](https://github.com/rishabhsxn/claude-video-studio)). Make "report which data is real vs invented, and which logos need permission" a standing instruction ([product-launch-motion](https://github.com/AbubakrChan/product-launch-motion/blob/main/references/prompts.md)).

## A house momos-motion skill turns one good film into the default

### Structure: a short router, numbers in reference files, scripts that execute

A skill is a folder holding a `SKILL.md` (YAML frontmatter plus a markdown body) and optional `scripts/`, `references/` and `assets/`. Only `name` and `description` stay in context permanently, so the **description is the trigger** ([Agent Skills spec](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx)). Anthropic's best practices set the constraints. Keep the body **under 500 lines**. Keep references one level deep. Write the description in the third person, covering both what the skill does and when to use it. The name cannot contain "claude" or "anthropic" ([best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)). Claude Code adds several details that matter for long video sessions ([Claude Code skills docs](https://code.claude.com/docs/en/skills)). The description is truncated at **1,536 characters** in the skill listing. A `paths:` field limits auto-loading to matching files. After auto-compaction, only **the first 5,000 tokens** of each invoked skill are kept, so put non-negotiables at the top. Any rule that must always hold belongs in a hook rather than in prose. Skill-creator also warns that Claude tends to "undertrigger" skills, so descriptions should be "a little bit 'pushy'" ([skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)).

The strongest existing taste skills share a shape. Remotion's skill is a router that links about 40 topic files, each loaded only "when needing to…" ([remotion-dev/skills](https://github.com/remotion-dev/skills)). Emil Kowalski splits building from critiquing. `animate` builds. `review-animations` is invoked manually (`disable-model-invocation: true`), takes the posture "Default to flagging; approval is earned", and ranks remedies starting with "Delete the animation" ([review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md)). LottieFiles defines a "Brand Motion Identity" as three constants: one signature easing for 80% of animations, a three-duration palette, and one entrance pattern ([LottieFiles SKILL.md](https://github.com/lottiefiles/motion-design-skill/blob/main/skills/motion-design/SKILL.md)). Anthropic's frontend-design shows how to frame taste. It opens with a persona ("design lead at a small studio ... client has already rejected proposals that felt templated"). It grounds choices in the subject's own industry and materials. It lists the clustered AI looks, down to the hex values. It requires a token plan and a check against the brief ("work through a similar prompt to see if you arrive somewhere similar") before any code ([frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)). Its history also matters. Between December 2025 and September 2026 it replaced all-caps "NEVER use Inter" bans with "these are defaults rather than choices ... the brief's own words always win." That suggests momos's ban list should work as calibration, with hard MUSTs reserved for checkable facts: hex values, safe box and fps ([frontend-design history](https://github.com/anthropics/skills/blob/2235be7/skills/frontend-design/SKILL.md)).

```
.claude/skills/momos-motion/
├── SKILL.md                     # persona, non-negotiables, workflow checklist, calibration list (<300 lines)
├── references/
│   ├── motion-tokens.md         # the easing/spring/duration/stagger table; "no approximated values"
│   ├── choreography.md          # one hero per shot, shot-scale changes, cut on motion, allowed enters/exits
│   ├── kinetic-type.md          # mask reveals, split rules, hold formula, caption spec
│   ├── sound-sync.md            # frames-per-beat, whoosh/impact placement, -14 LUFS
│   ├── social-specs.md          # aspect set, composite safe box, type floors, export settings
│   ├── momos-formats.md         # review-card stack, stat counter, UI push-in, customer result
│   ├── feedback-to-numbers.md   # "make it pop" -> scale 1.0→1.08→1.0 over 6 frames, etc.
│   └── gotchas.md               # grows after every project
├── assets/                      # logo SVGs, brand fonts, LUT, approved reference contact sheets
└── scripts/
    ├── render_review.sh         # stills at shot boundaries + labelled contact sheet + 360px sheet
    └── lint_motion.mjs          # flag hex/easing/duration literals not in theme.ts, ease-in entrances, scale(0)
```

```markdown
---
name: momos-motion
description: Directs and builds momos marketing videos and motion graphics in Remotion — social reels,
  LinkedIn/Instagram/TikTok ads, product launch and feature clips, review-card and stat-counter animations,
  logo stings, captions. Use whenever the user asks for a video, reel, animation, promo, teaser or
  explainer, or to "make this move", even if they don't say "motion". Applies momos brand and motion
  tokens, social safe zones, and a render-stills review loop.
paths: "videos/**, src/**"
metadata:
  version: "0.1.0"
---
# momos motion direction
You are the motion director at a small studio whose client, momos, has rejected templated SaaS reels.
Ground every visual choice in the restaurant world momos serves (the pass, the ticket rail, the
review notification), not in generic tech imagery. Spend boldness on one moment per video.

## Non-negotiables (checkable)
- Read src/theme.ts and brand/frame.md first. Never hard-code hex, fonts, easings or durations.
- Timing in seconds x fps or beats from timeline.json; no CSS transitions, timers, Date, Math.random.
- 9:16 safe box x120–888, y288–1248; headline >=84px, must-read >=44px at 1080 wide.
- Real momos UI strings and real or approved data only; anonymise diner names.
- Not done until the review loop passes (step 5).

## Workflow — copy this checklist and tick it off
1. Fill brief.md (all slots). 2. Review the plan against a generic SaaS version; revise and say why.
3. Shot list on the beat grid -> STOP for approval. 4. Build per-aspect compositions.
5. Run scripts/render_review.sh, hand sheets to frame-critic, fix the top 1–3 notes, re-render
   only named frames. Stop at all scores >=8 or 3 rounds; report remaining issues honestly.
6. Final render (h264, crf 18) per aspect + .srt; list which data is real and which logos need permission.

## Calibration: defaults, not choices (use only if the brief asks)
fade+slide-up on every element · uniform durations · identical stagger · scale(0) pops ·
default bouncy springs · purple/blue gradients, glows, particles · centred title on gradient ·
fade-to-black between scenes · word-by-word reveals everywhere · a whoosh on every cut

## References (load when needed)
motion-tokens.md for any curve/duration/spring · choreography.md when planning shots · ...
```

Writing the companion `momos-motion-review` as its own manually invoked skill keeps the critic's strict posture from being diluted by build instructions. Back it with a `frame-critic` subagent that has only Read, Bash and Glob tools and never opens source files ([frame-critic.md](https://github.com/rishabhsxn/claude-video-studio/blob/main/.claude/agents/frame-critic.md)). The `feedback-to-numbers.md` file is worth seeding from motion-lab's table ([numbers.md](https://github.com/NovusEdge/motion-lab/blob/main/skills/directing-motion/references/numbers.md)). "Make it pop" means scale 1.0→1.08→1.0 over 6 frames, peaking on the beat. "More premium" means quint-out entrances, damping ratio 0.8 and no overshoot on text. "It drags" means cutting each hold by one beat. "Too busy" means one hero, with the others 150 ms later at 60% travel. "Looks like AI" means naming each default you see and adding it to BANNED. The same table also warns: "Push key poses 10 to 30% further than feels right: the feed plays everything small."

### Testing: baseline against with-skill, judged blind

Anthropic's first rule is "create evaluations BEFORE writing extensive documentation". Run Claude without the skill to find its gaps. Write at least three scenarios. Test with every model the team uses ([best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)). The skill-creator skill automates much of this. It spawns with-skill and baseline subagents in parallel. It aggregates pass rate, time and tokens. It opens a review viewer for human feedback. It offers blind A/B comparison through a comparator agent. It also optimises the description against 20 trigger queries, split 60/40 into train and held-out sets ([skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)). Skill-creator warns that "subjective skills ... are better evaluated qualitatively", so split the checks. A script can verify the objective ones: hex values in the palette, durations from the token set, text inside the safe box, correct fps and dimensions, and no `ease-in` on entrances. Contact sheets from the baseline and with-skill runs go blind to the marketing team for taste. Good eval briefs for momos would be a 15-second 9:16 review-reply reel, a 4:5 stat-counter post, a 16:9 feature launch and a logo sting. Re-run them on every skill change. No source has published data showing how much a taste skill improves output, so momos's own before/after sheets are the evidence.

### Sharing: repo first, then marketplace, then org provisioning

Start with the skill committed to the video repo's `.claude/skills/`, where changes go through code review. Claude Code picks up edits without a restart ([Claude Code skills docs](https://code.claude.com/docs/en/skills)). Once the skill is stable, wrap it in a plugin inside a private git marketplace repo, defined by `.claude-plugin/marketplace.json` and checked with `claude plugin validate`. Teammates then run `claude plugin marketplace add <owner>/<repo>` and `claude plugin install <plugin>@<marketplace>` ([marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)). Adding `extraKnownMarketplaces` and `enabledPlugins` to the repo's `.claude/settings.json` installs it automatically for anyone who trusts the workspace. Managed settings can require it across the whole organization ([org plugins](https://code.claude.com/docs/en/plugins/org)). On Team or Enterprise plans, admins can also provision skills from claude.ai admin settings, enabled by default for all users. That reaches designers who never open a terminal ([Claude blog](https://claude.com/blog/organization-skills-and-directory)). Version the skill in `metadata` and keep the evals in the same repo.

## Prompts that start from decisions, not adjectives

Remotion's skills respond to one-line prompts such as `/remotion-create Make a promo video for a record store` ([remotion-dev/skills](https://github.com/remotion-dev/skills)). Those prompts produce exactly the median output described above. The prompts below follow the published patterns instead: numbers in place of adjectives, a hard stop before code, honest reporting, and critique by frame number.

**Setting up the project once:**
```
Set up a Remotion project for momos marketing videos. Use the remotion-best-practices skill.
Create brand/frame.md and src/theme.ts from our brand guide (attached) — palette in hex with one
accent, our two fonts loaded from public/fonts, and motion tokens: enter cubic-bezier(0.16,1,0.3,1),
move (0.77,0,0.175,1), exit (0.7,0,0.84,0) at 45% of enter duration, springs damping-ratio 1.0 for
text and 0.8 for shapes, list stagger 60ms. Add 1080x1920, 1080x1350 and 1920x1080 compositions with
a safe-zone overlay toggle (x120–888, y288–1248 on 9:16). Build a 5-second smoke video, render
frames 0, 75, 149 as stills, and show me them.
```

**Briefing a 15-second ad:**
```
Use the momos-motion skill. Make a 15s 9:16 ad (with a 4:5 cut) for "AI review replies".
Goal: a restaurant GM feels the relief of a 1-star review answered well in seconds.
Hook (0–2s): a real-looking 1-star Google review lands on screen — problem first, no logo yet.
Hero move: the momos reply types out inside our real reply UI (screen recording attached;
port the UI, don't invent labels). Stat beat: avg response time from our case study (source attached).
End card ≤2s: tagline from momos.com + "Book a demo". 120 BPM track, cut on beats.
Anonymise all diner names. Fill brief.md and show me the shot list on the beat grid — no code yet.
```

**Running the critic:**
```
Render stills at every shot boundary and every beat hit, build the contact sheet and the 360px
phone sheet, then hand them to the frame-critic agent. It must not read source code. Stop rule:
all scores ≥8 or 3 rounds. Give me the three worst problems as "frame N: problem: number to change".
```

**Giving revision notes:**
```
frame 96: the stat lands while the review card is still exiting — delay the counter 6 frames.
frame 140–180: hold drags — cut one beat. The reply typing feels mechanical: vary per-character
timing ±1 frame and add a 4-frame pause after the first sentence. Only re-render frames 90–190.
```

**Building the skill itself:**
```
Use skill-creator to build a momos-motion skill from CLAUDE.md, brand/, and the gotchas from our
last three videos. Keep SKILL.md under 300 lines with non-negotiables at the top; push numbers into
references/. Write 4 evals (9:16 review reel, 4:5 stat post, 16:9 launch, logo sting), run each with
and without the skill, and give me the paired contact sheets unlabelled so we can judge blind.
```

For HyperFrames, the same brief works through its packaged workflow. Drop in a screen recording and invoke `/product-launch-video`, adding the same token block and ban list, because HyperFrames supplies workflow, not momos's taste ([HyperFrames](https://github.com/heygen-com/hyperframes)).

## Conclusion

The research points somewhere less obvious than "install the Remotion skill". Code-driven video makes taste something momos can version and test. Every judgement a senior motion designer makes by feel can be written as a token, a ban, a checklist line or a critic's score cap, and once written it applies to every later video automatically. The real investment is therefore not the first video. It is the gotchas file and the feedback-to-numbers table that each project leaves behind, which no off-the-shelf skill can supply because they encode momos's brand and its restaurant-world subject matter. Frontend-design's history is a warning here. A ban list rewritten as calibration ages better than one rewritten as hard prohibitions, which the model simply routes around into a new formula.

The limits remain real. Claude cannot hear its soundtrack or feel timing from stills. Platform safe zones are still third-party transcriptions. No one has measured how much a critic agent or a taste skill improves output. That argues for a split of labour. Claude owns drafting, variant generation and the mechanical checks. A human owns the storyboard sign-off, the music and the final watch on a phone. And momos's own blind with-skill and without-skill comparisons become the evidence the published sources lack.
