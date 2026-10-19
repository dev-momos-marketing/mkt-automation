# Existing Claude Skills, Plugins and MCP Servers for Motion Design / Programmatic Video (state as of Oct 2026)

Method note: the GitHub API (`gh`) was blocked in this session, and remotion.dev, motion.dev, quickleap.io and rescroll.ai would not resolve through the fetch tool. Star counts therefore come from GitHub HTML pages fetched on 2026-10-19 where marked "(GitHub page)". Otherwise they come from aggregators and are marked as such. Exact last-commit dates were not visible on the fetched GitHub pages.

## Q1. Does Remotion publish official Claude/Agent Skills, what do they contain, how are they installed, and how well do they work?

### Takeaway
Yes. `remotion-dev/skills` is the official, most-adopted path for Claude Code video (5.3k stars). It has grown from the single "remotion-best-practices" skill shipped in January 2026 into 12 skills. The skills work mainly as guardrails: they stop Claude from using CSS animations that don't render and from misusing interpolate, audio or composition APIs. They do not supply taste. Results look fine with little effort and good only with strong art direction and iteration.

### Cited Findings
- **Official repo and install:** the official repo is `remotion-dev/skills`, installed with `npx skills add remotion-dev/skills`. Projects scaffolded with `bun create video` also get the skills. The README targets Claude Code, Codex, Kimi Code and Cursor. — [GitHub remotion-dev/skills](https://github.com/remotion-dev/skills)
- **Repo signals (GitHub page, 2026-10-19):** 5.3k stars, 592 forks, 90 commits on main, 10 open issues, 11 open PRs. No GitHub releases. — [GitHub remotion-dev/skills](https://github.com/remotion-dev/skills)
- **Current 12 skills:** `remotion-best-practices` (umbrella/fallback), `remotion-create`, `remotion-markup` (animation, layout, typography, media, effects, audio, fonts, timing), `remotion-studio`, `remotion-render`, `remotion-maps` (routes, markers, CesiumJS 3D flyovers), `remotion-captions`, `remotion-saas` (apps built on Remotion), `remotion-interactivity` (Studio-editable elements), `remotion-docs` (searches the docs and fetches them as Markdown), `remotion-upgrade`, `remotion-multimedia` (Mediabunny). — [GitHub remotion-dev/skills/skills](https://github.com/remotion-dev/skills/tree/main/skills)
- **`remotion-markup` SKILL.md:** its frontmatter has `version: 4.0.536`, so the skills are versioned in lockstep with Remotion 4.0.x. — [raw SKILL.md](https://raw.githubusercontent.com/remotion-dev/skills/main/skills/remotion-markup/SKILL.md)
- **`remotion-markup` rule files:**
  - Timing and structure: timing-props.md, sequencing.md, timing.md, multi-scene-video.md, connected-compositions.md, video-editing.md, transitions.md.
  - Effects and look: text-highlights.md, motion-blur.md, effects.md, html-in-canvas.md, color-correction.md (`lut()` .cube grades), 3d.md (Three.js / React Three Fiber), cropping.md.
  - Audio: voiceover.md (ElevenLabs TTS), sfx.md, audio.md, audio-visualization.md, silence-detection.md, ffmpeg.md.
  - Fonts and assets: google-fonts.md, local-fonts.md, gifs.md, images.md, lottie.md, embedding-videos.md.
  - Layout and data: measuring-dom-nodes.md, measuring-text.md, parameters.md (Zod-parametrized compositions), calculate-metadata.md, compositions.md.
  - Source: [raw SKILL.md](https://raw.githubusercontent.com/remotion-dev/skills/main/skills/remotion-markup/SKILL.md)
- **Key hard rules in `remotion-markup`:**
  - No CSS `transition`/`animation`; Tailwind animation classes count too. Drive everything from `useCurrentFrame()` + `interpolate()`, with `Easing.bezier()`/`Easing.spring()`.
  - Read fps from `useVideoConfig()`. Keep keyframes inline so Studio can edit them.
  - Put assets in `public/` and load them via `staticFile()`. Install packages with `npx remotion add`.
  - Don't overwrite user edits made outside the conversation.
  - Source: [raw SKILL.md](https://raw.githubusercontent.com/remotion-dev/skills/main/skills/remotion-markup/SKILL.md)
- **Launch and adoption:** Remotion launched Agent Skills for Claude Code on Jan 20, 2026, and the demo reportedly hit about 6M views on X within 48h. Another source claims about 13M in a week (unverified and inconsistent). Reported installs: 150k on skills.sh about 8 weeks after launch, and over 440k as of Aug 5, 2026 (aggregator claims, not verified on skills.sh). — [startuphub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/make-videos-with-claude-code-remotion-ai-video-makes-production-code-from-plain-prompts), [ngram.com](https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation), via [search summary](https://quickleap.io/blog/remotion-claude-code-skill-review)
- **Riley Brown:** "Claude Code for Video Animations? ... In 4 prompts. This was my first test of remotion." — [X / Riley Brown](https://x.com/rileybrown/status/2013868186807242855)
- **Critical review ("Hype vs Reality"):** the skill is "more guardrails than magic". It prevents mistakes such as CSS animations that don't render, but "if you need precise control over timing, easing curves, and visual polish, you'll be fighting Claude". This is a secondhand search snippet; the page could not be fetched. — [Quickleap review](https://quickleap.io/blog/remotion-claude-code-skill-review)
- **Firecrawl roundup:** without the skill, Claude "frequently gets interpolation curves, audio trimming, and composition patterns wrong". — [Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills)
- **Sabrina Ramonov's workflow:** start every prompt by explicitly invoking the Remotion best-practices skill, and add mobile safe-zone and font-size rules. One user made a branded announcement video in 2 prompts, about 15 minutes and about 15,000 Opus 4.6 tokens. They called it "not beautiful but fairly good". — [sabrina.dev](https://www.sabrina.dev/p/5-insane-claude-code-video-prompts), [Substack note](https://substack.com/@techysurgeon/note/c-231237268)
- **Outdated install command:** a community list gives `npx skills add remotion` and links remotion.dev/docs/ai/claude-code. The primary README form is `npx skills add remotion-dev/skills`. — [wilwaldon/Claude-Code-Video-Toolkit](https://github.com/wilwaldon/Claude-Code-Video-Toolkit) vs [remotion-dev/skills](https://github.com/remotion-dev/skills)

### Inferences
- The skill was restructured from one skill with a rules folder into 12 task-scoped skills; the `rules/*.md` layout in older blog posts is now spread across skills. Tutorials that say "use remotion-best-practices" still work, because that skill remains as the umbrella.
- **New Studio-editability conventions:** inline keyframes, `Interactive.create()`, Track and "each node individually editable" are designed so a human motion designer can polish in Remotion Studio after Claude drafts. That makes a "Claude drafts, human polishes" workflow viable for a marketing team.
- **Licensing:** Remotion requires a paid company license for for-profit companies above a size threshold. This is from general knowledge and could not be verified here because remotion.dev was unreachable.

### Gaps
- Could not fetch remotion.dev/docs/ai/* (skills, claude-code, MCP, system prompt pages) because of DNS failure. Cannot confirm whether the Remotion docs MCP server or the "system prompt for LLMs" page are still current.
- No exact last-commit date for remotion-dev/skills. The SKILL.md version 4.0.536 suggests it is actively maintained.
- No verified skills.sh install count.

## Q2. Other skills, plugins and MCP servers (GSAP, Motion, Lottie, Manim, HyperFrames, After Effects, Anthropic's own, etc.)

### Takeaway
Besides Remotion, the official vendor offerings are HeyGen HyperFrames (HTML/GSAP→MP4, very high stars), GreenSock's gsap-skills and Motion's (motion.dev) AI Kit. Lottie, Manim and After Effects are covered by community projects of varying quality. In anthropics/skills, frontend-design is a taste skill and slack-gif-creator is the only motion-output skill. I could not verify any skills or MCP servers for Rive, Jitter, Motion Canvas, Revideo or Theatre.js.

### Cited Findings

**HeyGen HyperFrames (official, Apache-2.0): `heygen-com/hyperframes`**
- Positioning: "Write HTML. Render video. Built for agents." Renders HTML/CSS plus seekable animations to deterministic MP4 via headless Chrome and FFmpeg. Needs Node 22+ and FFmpeg. — [GitHub heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- Signals (GitHub page, 2026-10-19): 66.9k stars, 6.1k forks. An aggregator reported 47.9k stars in Sept 2026, so it is growing fast. — [GitHub](https://github.com/heygen-com/hyperframes); [search summary of onewave-ai / andrew.ooo](https://www.onewave-ai.com/blog/hyperframes-video-as-code)
- Install in Claude Code:
  - `claude plugin marketplace add heygen-com/hyperframes`, then `claude plugin install hyperframes@hyperframes`, then `/hyperframes:hyperframes`.
  - Or `npx skills add heygen-com/hyperframes`.
  - Or `npx hyperframes skills update`, recommended because the skills.sh registry "can lag main by hours".
  - CLI: `npx hyperframes init|preview|render`.
  - Source: [GitHub](https://github.com/heygen-com/hyperframes)
- 21 skills:
  - Router: `/hyperframes`.
  - Workflows: `/product-launch-video`, `/faceless-explainer`, `/pr-to-video`, `/embedded-captions`, `/talking-head-recut`, `/motion-graphics`, `/music-to-video`, `/slideshow`, `/general-video`, `/remotion-to-hyperframes`.
  - Domain skills: hyperframes-core, -animation, -keyframes, -creative, media-use, -cli, -audio, -registry, `/figma`.
  - Animation runtimes: GSAP, Lottie, Three.js, Anime.js, CSS, WAAPI, TypeGPU.
  - Source: [GitHub](https://github.com/heygen-com/hyperframes)
- Limitations:
  - Studio is "available, evolving".
  - The README itself calls Remotion Lambda the "mature cloud renderer" by contrast.
  - A reviewer found the template catalog thin and single-machine render throughput unimpressive.
  - No per-render fees. HeyGen cloud rendering is optional and paid.
  - Sources: [GitHub](https://github.com/heygen-com/hyperframes), [andrew.ooo review](https://andrew.ooo/posts/hyperframes-heygen-html-video-agents-review/)
- Third-party guide: [moelueker.com](https://moelueker.com/blog/claude-skill-that-makes-videos-hyperframes-heygen)

**GSAP (official, MIT): `greensock/gsap-skills`**
- Signals (GitHub page): 16.6k stars, 995 forks, 24 commits. — [GitHub greensock/gsap-skills](https://github.com/greensock/gsap-skills)
- Install: `npx skills add https://github.com/greensock/gsap-skills`, or in Claude Code `/plugin marketplace add greensock/gsap-skills`. Manual copy into `~/.claude/skills/` also works. — [GitHub](https://github.com/greensock/gsap-skills)
- 8 skills: gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-plugins (Flip, Draggable, SplitText, GSDevTools…), gsap-utils, gsap-react (useGSAP, cleanup, SSR), gsap-performance, gsap-frameworks (Vue/Svelte). All GSAP plugins are now free. — [GitHub](https://github.com/greensock/gsap-skills)
- Aggregators disagree on the count (8 vs 10 skills). — [officialskills.sh](https://officialskills.sh/greensock/skills), [atskills.one](https://atskills.one/greensock)

**Motion (motion.dev, formerly Framer Motion): Motion AI Kit**
- `npx motion-ai` installs the `/motion` skill and sets up Motion's MCP servers for Claude Code, Cursor, Amp, OpenCode, Gemini CLI and Copilot. The MCP endpoint is mcp.motion.dev. — [GitHub motiondivision/motion (via search summary)](https://github.com/motiondivision/motion)
- **Pricing conflict:** the README reportedly calls the skill free/MIT and the MCP free without an account. The AI Kit page says the one-command install is included in Motion+ (paid) and adds "MotionScore". — [motion.dev/ai-kit](https://motion.dev/ai-kit) (page not fetchable, search snippet only)
- A separate `motion-studio-mcp` needs a Motion+ token. This comes from a third-party write-up only. — [Medium](https://medium.com/@karthikmulugu/the-ai-design-pipeline-nobody-told-you-about-motion-studio-mcp-google-stitch-claude-code-9ce15aef45b2)
- Community Motion/Framer Motion skills:
  - `affaan-m/ecc` motion-ui/motion-patterns: `npx -y skills add affaan-m/ecc --skill motion-ui --agent claude-code`.
  - `pproenca/dot-skills` framer-motion (42 perf rules).
  - `dylantarre/animation-principles` (Disney principles).
  - Source: [claudemarketplaces.com listings](https://claudemarketplaces.com/skills/affaan-m/ecc/motion-ui)
- Beware of name collisions: several "Motion MCP" servers are for usemotion.com (a calendar app), not motion.dev. — [RF-D/motion-mcp](https://github.com/RF-D/motion-mcp)

**Lottie**
- `diffusionstudio/lottie` text-to-lottie skill (a single markdown file): `npx skills add diffusionstudio/lottie`. — [mcp.directory guide, June 2026](https://mcp.directory/blog/claude-text-to-lottie-skill-guide)
- `freshtechbro/claudedesignskills` lottie-animations is aimed at integrating mobile apps, not generation. — [claudemarketplaces](https://claudemarketplaces.com/skills/freshtechbro/claudedesignskills/lottie-animations)
- Both Remotion (`lottie.md` rule) and HyperFrames can embed Lottie. — [Remotion SKILL.md](https://raw.githubusercontent.com/remotion-dev/skills/main/skills/remotion-markup/SKILL.md), [HyperFrames](https://github.com/heygen-com/hyperframes)

**Manim (math/explainer style)**
- `Yusuke710/manim-skill`: plans, writes, renders and refines 3Blue1Brown-style scenes (~112 stars per an aggregator). Install with `/plugin marketplace add Yusuke710/manim-skill`, then `/plugin install manim-skill/manim-skill`. Needs cairo, ffmpeg and `uv tool install manim`. — [wilwaldon toolkit list](https://github.com/wilwaldon/Claude-Code-Video-Toolkit), [skillsllm](https://skillsllm.com/skill/manim-skill)
- `HarleyCoops/Math-To-Manim`: `claude --plugin-dir ./Math-To-Manim/skill`, 55+ examples. — [wilwaldon list](https://github.com/wilwaldon/Claude-Code-Video-Toolkit)
- `adithya-s-k/manim_skill` (manimce-best-practices) and `affaan-m/ecc` manim-video ("precision explanations, not cinematic flair"). — [crossaitools](https://crossaitools.com/skills/adithya-s-k/manim_skill/manimce-best-practices), [claudemarketplaces](https://claudemarketplaces.com/skills/affaan-m/ecc/manim-video)

**After Effects MCP (all community, all bridge through a CEP panel + ExtendScript)**
- Dakkshin/after-effects-mcp is the original; one user reported it was Windows-focused and failed on macOS.
- Brandkick/after-effects-mcp uses a WebSocket bridge and needs AE 2021+.
- p10q/ae-mcp uses a file-based bridge.
- a-y-ibrahim/after-effects-mcp is an "enhanced" fork with arbitrary ExtendScript and RTL support.
- Sources: [glama.ai](https://glama.ai/mcp/servers/p10q/ae-mcp), [mcpservers.org](https://mcpservers.org/servers/p10q/ae-mcp)
- A directory listing points at "github.com/anthropics/ae-mcp". This is **unverified and likely mislabeled**: anthropics/ae-mcp does not appear in the anthropics/skills listing, and I could not confirm it exists. — [glama.ai listing (search result)](https://glama.ai/mcp/servers/kq2n1g3cr5)

**Anthropic's own (`anthropics/skills`, 182k stars)**
- 19 skill folders: academy-guide, algorithmic-art, brand-guidelines, canvas-design, claude-api, discernment-nudge, doc-coauthoring, docx, frontend-design, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx. None is a video/Remotion skill; slack-gif-creator is the only motion-output skill. — [GitHub anthropics/skills/skills](https://github.com/anthropics/skills/tree/main/skills)
- Install: `/plugin marketplace add anthropics/skills`, then `/plugin install example-skills@anthropic-agent-skills`. — [GitHub anthropics/skills](https://github.com/anthropics/skills)
- **frontend-design** is an anti-"AI slop" taste skill:
  - Motion should be used "sparingly and deliberately". Prefer one orchestrated moment over scattered effects; per-section fade-and-slide and hover-on-every-card are called generic defaults.
  - Use 1–2 deliberate font families and a 4–6 hex base palette.
  - It names tells to avoid: cream+terracotta and near-black+single-accent palettes, rounded SaaS cards with soft shadow and gradient washes, tracked uppercase eyebrow labels, 01/02/03 markers, and a gradient big-number hero.
  - Source: [raw frontend-design SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md)
- brand-guidelines and theme-factory are relevant for keeping brand consistency across videos. — [GitHub anthropics/skills/skills](https://github.com/anthropics/skills/tree/main/skills)

**Community Remotion-based kits**
- **`digitalsamba/claude-code-video-toolkit`** (2.3k stars, 294 commits, MIT; newest showcase 2026-06-09):
  - Skills: Remotion, ElevenLabs, FFmpeg, Playwright recording, frontend design, LTX-2, moviepy, RunPod.
  - Commands: `/video`, `/scene-review`, `/brand`, `/record-demo`, `/generate-voiceover`.
  - Templates: sprint-review, product-demo, and a 9:16 concept-explainer-short.
  - `brands/` profiles hold colors, fonts and voice.
  - 7 custom transitions (glitch, rgbSplit, lightLeak…).
  - Install: clone the repo, then `/setup`, then `/video`.
  - The author calls autonomous video "a lofty ideal for such a subjective field".
  - Source: [GitHub](https://github.com/digitalsamba/claude-code-video-toolkit)
- **`Vincentwei1021/video-shotcraft`** (Claude Code and Codex): cinematic product videos with Remotion, 152 shot recipe cards, 209 motion previews and a production template. — [GitHub](https://github.com/Vincentwei1021/video-shotcraft)
- **`haidrrrry/claude-remotion-skill`**: motion graphics, captions, B-roll and sound design. — [GitHub](https://github.com/haidrrrry/claude-remotion-skill)
- **`wilwaldon/Claude-Code-Video-Toolkit`** (94 stars, Feb 2026) is a curated list covering Remotion, Manim, Playwright MCP `--save-video=1920x1080` screen recording, `op7418/Youtube-clipper-skill` and an FFmpeg skill. — [GitHub](https://github.com/wilwaldon/Claude-Code-Video-Toolkit)

### Inferences
- For a marketing team, the officially maintained options are Remotion skills, HyperFrames, gsap-skills and the Motion AI Kit. Everything else is single-maintainer community work, which should be pinned or vendored and reviewed before use.
- HyperFrames and Remotion both offer full agent-first MP4 pipelines and compete directly. HyperFrames ships ready-made workflows (`/product-launch-video`, `/pr-to-video`) that map closely to B2B SaaS marketing, plus a `/remotion-to-hyperframes` migration skill. The `/figma` skill is relevant if brand assets live in Figma.
- The After Effects MCPs are fragile bridges and unsuitable as a primary pipeline. They might fit a team that already has AE templates and wants scripted variant generation.

### Gaps
- No verified Claude skills or MCP servers found for Rive, Jitter, Motion Canvas, Revideo or Theatre.js (time and tool budget were limited; searches were not exhaustive). Revideo and Motion Canvas likely have no official skills.
- Could not resolve whether the Motion AI Kit is free or Motion+-only.
- Could not fetch skills.sh directly for install counts or leaderboards. No verified last-update dates for most repos.

## Q3. Which are best for B2B SaaS social/marketing MP4s vs. web UI animation?

### Takeaway
For MP4 marketing videos (LinkedIn, Instagram, TikTok), use Remotion skills or HyperFrames, optionally with digitalsamba's toolkit or video-shotcraft for templates and brand profiles. Add frontend-design or brand-guidelines for taste. For web UI animation, use gsap-skills or the Motion AI Kit. Use Manim only for math or diagram explainers.

### Cited Findings
- **Remotion:**
  - Renders React compositions to MP4.
  - Zod-parametrized compositions suit templated variants such as per-customer or per-feature versions.
  - Supports captions, ElevenLabs voiceover, SFX, LUT color grading and 3D.
  - Source: [remotion-markup SKILL.md](https://raw.githubusercontent.com/remotion-dev/skills/main/skills/remotion-markup/SKILL.md)
- **Remotion `remotion-saas`** covers embedding Remotion into products, which fits SaaS teams that want in-app video generation. — [remotion-dev/skills](https://github.com/remotion-dev/skills)
- **HyperFrames** ships product-launch, PR-to-video, faceless-explainer, embedded-captions and slideshow workflows. — [GitHub](https://github.com/heygen-com/hyperframes)
- **Mobile output** needs extra prompt rules for 9:16 safe zones and minimum font sizes, which the official skill does not enforce. — [sabrina.dev](https://www.sabrina.dev/p/5-insane-claude-code-video-prompts)
- **Web UI animation:**
  - gsap-skills covers ScrollTrigger, React and performance. — [GitHub](https://github.com/greensock/gsap-skills)
  - The Motion AI Kit targets React/JS UI animation. — [motion.dev/ai-kit](https://motion.dev/ai-kit)
- **Manim** skills produce "precision explanations, not cinematic flair". — [claudemarketplaces](https://claudemarketplaces.com/skills/affaan-m/ecc/manim-video)

### Inferences
- GSAP knowledge carries over to HyperFrames, which supports GSAP as a runtime. A team that adopts HyperFrames could install gsap-skills alongside it, but should not use it with Remotion because Remotion forbids non-frame-driven animation.
- Recommended starter stack for B2B SaaS social video:
  - `npx skills add remotion-dev/skills`
  - plus `anthropics/skills` frontend-design and brand-guidelines,
  - plus a project-level brand file (colors, fonts, logo, safe zones),
  - with HyperFrames evaluated as the alternative.

### Gaps
- No head-to-head quality comparison of Remotion skills vs. HyperFrames from an independent source was found.

## Q4. Notable showcases and case studies, and what made results good or bad

### Takeaway
There is plenty of viral proof that Claude Code + Remotion can produce passable animated videos in minutes to an hour with 2–5 prompts. Independent reviewers consistently say polish (easing, timing, visual taste) still needs human direction or iteration.

### Cited Findings
- **Remotion launch demo** (Jan 20, 2026): a full animated video from a prompt, reportedly about 6M views on X in 48h. — [startuphub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/make-videos-with-claude-code-remotion-ai-video-makes-production-code-from-plain-prompts)
- **Riley Brown:** built an app with the Claude Agent SDK that creates and edits animated videos "in 4 prompts". — [X](https://x.com/rileybrown/status/2013868186807242855)
- **Zoli Honig:** "I used remotion + claude code to make this animation in ten minutes. This used to take days and thousands of dollars." — [X](https://x.com/zolihonig/status/2033911539913167145)
- **Other community results:** a Polymarket video in 30 minutes with 4–5 prompts, and a Reddit user's 30-second product promo in about an hour. These are secondhand via aggregator summaries. — [Quickleap](https://quickleap.io/blog/remotion-claude-code-skill-review), [startuphub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/make-videos-with-claude-code-remotion-ai-video-makes-production-code-from-plain-prompts)
- **YouTube walkthroughs:**
  - "This Claude Code + Remotion SKILL Workflow Changes Everything!" — [YouTube](https://www.youtube.com/watch?v=hbYz-yu9qdE)
  - "Remotion + Claude Skills: The Future of Video Creation" — [YouTube](https://www.youtube.com/watch?v=50Cy3EiMSKs)
  - "I Made This Viral Reel Using ONLY Remotion & Claude Code" — [YouTube](https://www.youtube.com/watch?v=xOhh274Ayac)
- **Good-result factors cited:**
  - Explicitly invoking the skill.
  - Detailed style prompts with mobile safe-zone and font rules. — [sabrina.dev](https://www.sabrina.dev/p/5-insane-claude-code-video-prompts)
  - Brand profiles and scene-review loops. — [digitalsamba toolkit](https://github.com/digitalsamba/claude-code-video-toolkit)
  - Shot-recipe libraries instead of open-ended prompting. — [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
- **Bad-result factors cited:**
  - Fighting Claude over precise timing and easing. — [Quickleap](https://quickleap.io/blog/remotion-claude-code-skill-review)
  - Output that is "not beautiful but fairly good". — [Substack note](https://substack.com/@techysurgeon/note/c-231237268)
  - Skeptics call the hype a relabeling of existing Claude Code ability. — [Quickleap, quoting r/ChatGPTCoding](https://quickleap.io/blog/remotion-claude-code-skill-review)

### Inferences
- The quality ceiling is set by art direction, not the skill. Teams that supply references, a brand system, shot recipes and a review loop (render stills, critique, revise) get markedly better results than one-shot prompting. The frontend-design skill's anti-slop list carries over directly to video frames.

### Gaps
- Could not fetch the rescroll.ai article "Claude Code + Remotion for Motion Graphics: What It's Great At, and What It Actually Takes" (DNS failure). It is likely relevant. — [rescroll.ai](https://www.rescroll.ai/blog/claude-code-remotion-motion-graphics-2026)
- No direct Reddit or Hacker News threads were read, so community sentiment is secondhand. I did not verify the Remotion launch tweet URL or its view counts on X.
