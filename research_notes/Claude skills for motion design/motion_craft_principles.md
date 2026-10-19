# Motion Craft Principles: Professional vs. Generic / "AI Slop" Motion (encodable rules for an AI coding agent)

> Research method note: direct page fetching was blocked in this environment (egress proxy refused m3.material.io, remotion.dev, emilkowal.ski, carbondesignsystem.com, etc.). Primary-source numbers were therefore pulled from the **source code / token files on GitHub** (raw.githubusercontent.com was reachable): Flutter's Material 3 motion tokens, androidx Compose M3 Expressive spring tokens, IBM Carbon's DTCG motion tokens, Remotion docs + official Remotion agent skills, Motion (Framer Motion) spring source, Emil Kowalski's official skills repo, Anthropic's frontend-design skill and the Impeccable skill. Everything else comes from web-search snippets; those are flagged as secondary where relevant. Spring overshoot percentages and frame conversions labeled "computed" are my own arithmetic (standard damped-oscillator formula: overshoot = exp(-πζ/√(1-ζ²)), ζ = c / (2√(k·m))).

---

## 1. Timing & spacing: durations for UI vs. video, thinking in frames, holds and reading time

### Takeaway
UI motion lives in roughly 100–500 ms (most pros cap routine UI at ~300 ms; exits shorter than entrances), and token systems top out around 700–1000 ms for the largest moves. On-screen text in video must hold long enough to be read (≈13 characters/second minimum, or "read it twice"), and subtitle-style text should never be shorter than 5/6 s. Translate everything to frames from the composition fps rather than hard-coding.

### Cited Findings
**UI duration scales (primary token sources)**
- Material 3 duration tokens (Flutter implementation): short1–4 = 50/100/150/200 ms; medium1–4 = 250/300/350/400 ms; long1–4 = 450/500/550/600 ms; extralong1–4 = 700/800/900/1000 ms — [Flutter `material/motion.dart`](https://github.com/flutter/flutter/blob/master/packages/flutter/lib/src/material/motion.dart)
- IBM Carbon duration tokens: fast-01 = 70 ms, fast-02 = 110 ms, moderate-01 = 150 ms, moderate-02 = 240 ms, slow-01 = 400 ms, slow-02 = 700 ms — [Carbon `packages/motion/src/dtcg/motion.json`](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/dtcg/motion.json)
- Material (v1) guidance: mobile transitions typically ~300 ms; entering elements 225 ms, leaving elements 195 ms; large full-screen transitions up to 375 ms. MUI encodes these as `enteringScreen: 225`, `leavingScreen: 195`, `shortest: 150`, `shorter: 200` — [Material Design v1 Duration & easing](https://m1.material.io/motion/duration-easing.html); [MUI createTransitions source](https://app.unpkg.com/@mui/material@9.2.0/files/styles/createTransitions.mjs)
- Emil Kowalski's duration table: button press feedback 100–160 ms; tooltips/small popovers 125–200 ms; dropdowns/selects 150–250 ms; modals/drawers 200–500 ms; marketing/explanatory "can be longer". Rule: "UI animations stay under 300ms. A 180ms dropdown feels more responsive than a 400ms one." — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- Emil's "should it animate?" frequency table: 100+ times/day (keyboard shortcuts, command palette) → no animation ever; tens of times/day (hover, list nav) → remove or drastically reduce; occasional (modals, drawers, toasts) → standard animation; rare/first-time (onboarding, celebrations) → can add delight. "Never animate keyboard-initiated actions." — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- NN/g (as quoted on a W3C CSSWG thread): simple feedback animations (checkbox, toggle) ~100 ms; a modal moving into view can justify 200–300 ms — [W3C public-css-archive, Apr 2025](https://lists.w3.org/Archives/Public/public-css-archive/2025Apr/0702.html). Val Head suggests 200–500 ms as a starting range for interface animation — [Val Head, "How fast should your UI animations be?"](https://valhead.com/?p=2978) (secondary: snippet only)
- Third-party heuristic: exits ≈ 75% of the enter duration — [Impeccable motion-design reference, via search snippet](https://git.secluded.site/agent-skills/blob/main/vendor/impeccable/skill/reference/motion-design.md) (unofficial; consistent with Material's 225/195 ms ratio = 0.87)
- Asymmetric timing: "Slow where the user is deciding, fast where the system responds" — e.g. hold-to-confirm press 2 s linear, release 200 ms ease-out — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)

**Video / frames**
- Remotion's official agent skill: get `fps` from `useVideoConfig()` and express all timing as seconds × fps (e.g. `trimBefore={4 * fps}`) so timing stays correct if the frame rate changes; drive animation with `useCurrentFrame()` + `interpolate()`; CSS `transition`/`animation` will not render correctly in Remotion — [remotion-dev/skills remotion-markup SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)
- Remotion's own canonical example fades in over `[0, 2 * fps]` (2 s) with `Easing.bezier(0.16, 1, 0.3, 1)` — [remotion-dev/skills remotion-markup SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)
- Typical icon/logo animation durations (vendor table): simple-shape scale entrances 0.5–1 s; multi-element logo assembly 2–3 s — [advids blog](https://advids.co/blog/30-creative-animation-motion-graphics-explainer-video-examples-) (secondary/vendor)
- 30 fps "looks a little cleaner and more direct" and suits explainers, product videos; 24 fps is the cinematic baseline — [CapCut frame-rate guide](https://www.capcut.com/create/video-frame-rates-guide) (secondary)

**Text holds / reading time**
- Minimum dwell ≈ 1 second per 13 characters (e.g. ≥2.3 s for a 30-char line); more complex animation or faster cutting needs longer holds — [legibility.info, Rules for text in videos](https://legibility.info/rules-for-text-in-videos)
- "A viewer should be able to fully read through your on-screen text twice before it is removed" — [Reflection Software, Talking Text](https://www.reflectionsoftware.com/blog/talking-text-design-tips)
- Hold text ~2 s longer than normal reading time — [Typito on Medium](https://medium.com/typito/4-common-mistakes-you-should-avoid-when-adding-text-on-videos-52e8ab4dc9af); base ≈ 3 s + 0.5–0.7 s per word (author admits no industry standard) — [Quora](https://www.quora.com/How-much-screen-time-should-be-given-to-a-text-card-in-a-video)
- Netflix timed-text: minimum 5/6 s per subtitle event (20 frames @24fps), maximum 7 s, max two lines; 2-frame minimum gap between events — [Netflix Timed Text Style Guide: General Requirements](https://backlothelp.netflix.com/hc/en-us/articles/215758617); [Netflix Supplementals & Marketing Assets guide](https://backlothelp.netflix.com/hc/en-us/articles/115000239632-Timed-Text-Style-Guide-Supplementals-Marketing-Assets). Reading speed of 20 characters/second (adult) / 17 cps (children), 42 chars/line is reported by third parties — [bookwriter.vip reading-speed checker](https://www.bookwriter.vip/subtitle-reading-speed-checker) (secondary; not confirmed on Netflix's page in my results)
- Kinetic-type energy comes from cuts and rhythm, not long tweens; replace crossfades between lines with hard cuts and shorten each hold — [snapcn, Remotion kinetic typography](https://snapcn.dev/remotion-kinetic-typography) (practitioner blog). Note the tension with readability sources above: short holds only work for very short phrases.

### Inferences
- Encodable UI duration ladder (ms): micro-feedback 100–160; small popover 150–200; dropdown 180–250; modal/drawer/page 250–400; hero/marketing reveal 400–800; never >1000 for a single move. Exit = 0.75–0.85 × enter.
- Frame conversions (computed): 100 ms = 2.4f@24 / 3f@30 / 6f@60; 200 ms = 4.8f / 6f / 12f; 300 ms = 7.2f / 9f / 18f; 500 ms = 12f / 15f / 30f; 1 s = 24 / 30 / 60 frames. Video motion graphics entrances in practice tend to be 10–20 frames @30fps (0.33–0.67 s), but I found no authoritative source for that range (see Gaps).
- Reading-time rule for an agent: `holdSeconds = max(1.5, chars / 13) (+ 0.5–1.0 s if animated in/out)`, then convert with fps; never hold any text block < 20 frames @24 (5/6 s).

### Gaps
- No primary School of Motion / Ben Marriott / Jake in Motion page with frame-count conventions for video entrances could be fetched (domains blocked; search snippets didn't contain numbers). The "10–20 frames @30fps" convention is unverified.
- NN/g original article (nngroup.com/articles/animation-duration) not read directly.
- Material's "larger screens" scaling (tablet +30%, desktop faster) could not be verified.

---

## 2. Easing: why linear/default ease looks cheap; named curves; asymmetric easing; graph editor; design-system tokens; springs vs. curves

### Takeaway
Pros use strong, asymmetric custom curves (expo/quint-out–like decelerations for entrances, accelerations for exits, strong ease-in-out for on-screen moves) and tokenize them; the CSS built-ins are "too weak", `ease-in` on UI feels laggy, and linear reads as robotic except for constant motion. Springs are for interruptible/gesture/"alive" motion and should be critically damped or near it (overshoot ≤ ~5%) unless playfulness is intended.

### Cited Findings
**Named curves / tokens (primary)**
- Material 3 easing (Flutter): emphasizedDecelerate `cubic-bezier(0.05, 0.7, 0.1, 1.0)`; emphasizedAccelerate `(0.3, 0.0, 0.8, 0.15)`; standard `(0.2, 0.0, 0.0, 1.0)`; standardDecelerate `(0.0, 0.0, 0.0, 1.0)`; standardAccelerate `(0.3, 0.0, 1.0, 1.0)`; legacy `(0.4, 0.0, 0.2, 1.0)`; legacyDecelerate `(0.0, 0.0, 0.2, 1.0)`; legacyAccelerate `(0.4, 0.0, 1.0, 1.0)` — [Flutter `material/motion.dart`](https://github.com/flutter/flutter/blob/master/packages/flutter/lib/src/material/motion.dart). (The full M3 "emphasized" curve is a two-segment path, not a single bezier; Flutter only exposes the decel/accel halves as Cubics here.)
- IBM Carbon easing, two modes. Productive (efficient, task UI): standard `(0.2, 0, 0.38, 0.9)`, entrance `(0, 0, 0.38, 0.9)`, exit `(0.2, 0, 1, 0.9)`. Expressive (moments of delight, big moves): standard `(0.4, 0.14, 0.3, 1)`, entrance `(0, 0, 0.3, 1)`, exit `(0.4, 0.14, 1, 1)` — [Carbon motion.json](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/dtcg/motion.json); [Carbon tokens.ts](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/tokens.ts)
- Emil Kowalski: entering/exiting → ease-out; moving/morphing on screen → ease-in-out; hover/color → ease; constant motion (marquee, progress) → linear; default → ease-out. "Never ease-in on UI. It starts slow, delaying the exact moment the user is watching. ease-out at 200ms feels faster than ease-in at 200ms." Built-in CSS easings are too weak; use `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` (iOS-like, from Ionic) — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- Emil's agent rule: "No approximated values… Never invent `cubic-bezier(0.4, 0, 0.2, 1)` because it looks familiar"; "Extend the codebase's tokens, don't fork them"; "Never present motion options as a menu. Make the call." Never-ship table includes: built-in `ease-out` on a deliberate animation → use `cubic-bezier(0.23, 1, 0.32, 1)`; UI duration > 300 ms with no reason → 150–250 ms; everything entering at once → 30–80 ms stagger — [emilkowalski/skills animate SKILL.md](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md)
- Remotion's official skill uses `Easing.bezier(0.16, 1, 0.3, 1)` (the standard "easeOutExpo" curve) for its canonical fade and `Easing.spring({damping: 200})` (no-bounce) for scale/translate/rotate keyframes — [remotion-dev/skills remotion-markup SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)

**Graph editor (After Effects)**
- A straight diagonal on the speed graph = constant speed = "robotic"; an S-curve gives natural ease-in/out — [mtmograph, How to use the Graph Editor](https://mtmograph.com/blogs/tools/how-to-use-the-graph-editor-in-after-effects) (secondary)
- Keyframe position on the Speed Graph sets speed; handles set *influence* — how far the easing reaches toward the neighbouring key; higher influence holds the current direction longer. For stronger starts, raise outgoing influence to ~50–70%. Exact values via right-click → Keyframe Velocity — [designkkashi Graph Editor Masterclass](https://designkkashi.com/en/after-effects-graph-editor-speed-value-influence-guide/); [olafmotion Graph Editor tutorial](https://olafmotion.com/tutorials/how-to-use-graph-editor/) (secondary)
- School of Motion intro: Easy Ease presets (F9) start slow, speed up, decelerate, mirroring real-world motion — [School of Motion, Intro to the Graph Editor](https://schoolofmotion.com/blog/intro-to-the-graph-editor-in-after-effects)

**Springs (primary)**
- Remotion `spring()` defaults: mass 1, damping 10, stiffness 100, overshootClamping false; "To disable the default bounce, increase the damping parameter"; `durationInFrames` stretches the curve to an exact length; `durationRestThreshold` (e.g. 0.001 → 99.9% settled); `delay` in frames; order of ops = stretch → reverse → delay — [Remotion spring() docs (source)](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/spring.mdx)
- Motion (Framer Motion) spring defaults: stiffness 100, damping 10, mass 1; duration-based defaults duration 800 ms, bounce 0.3, visualDuration 0.3 s; `bounce` maps to damping ratio as SwiftUI does (ζ = 1 − bounce; 0 = critically damped) — [motiondivision/motion spring.ts](https://github.com/motiondivision/motion/blob/main/packages/motion-dom/src/animation/generators/spring.ts)
- Emil: Apple-style `{type:"spring", duration: 0.5, bounce: 0.2}` recommended; keep bounce 0.1–0.3, avoid bounce in most UI; springs keep velocity when interrupted, so use them for drag, gestures, "alive" elements, decorative mouse tracking — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- Material 3 Expressive spring tokens (damping = ratio ζ, stiffness k, mass 1): Expressive scheme — DefaultSpatial ζ0.8/k380, FastSpatial ζ0.6/k800, SlowSpatial ζ0.8/k200; DefaultEffects ζ1.0/k1600, FastEffects ζ1.0/k3800, SlowEffects ζ1.0/k800 — [androidx ExpressiveMotionTokens.kt](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt). Standard scheme — DefaultSpatial ζ0.9/k700, FastSpatial ζ0.9/k1400, SlowSpatial ζ0.9/k300; effects identical to Expressive — [androidx StandardMotionTokens.kt](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt)
- M3: "spatial" springs (position, size, rotation, shape) may overshoot; "effects" springs (color, opacity) are critically damped, no bounce — [saglitz, Material 3 & Expressive](https://saglitz.com/design/material-3); tokens defined by damping/stiffness rather than time so they scale across screen sizes — [M3 blog, Expressive motion theming](https://m3.material.io/blog/m3-expressive-motion-theming)
- SwiftUI presets: `.smooth` = predefined duration, no bounce; `.snappy` = small bounce; `.bouncy` = higher bounce; `response` ≈ approximate duration in seconds, `dampingRatio` = fraction of critical damping — [Apple SwiftUI Spring docs](https://developer.apple.com/documentation/swiftui/spring.md); [Apple SwiftUI Animation docs](https://developer.apple.com/documentation/swiftui/animation.md) (exact preset numbers not confirmed)
- "Don't use bounce/elastic easing (feels dated)"; the Impeccable detector flags "bounce easing" as an AI-slop tell — [pbakaus/impeccable README](https://github.com/pbakaus/impeccable)

### Inferences
- Computed overshoot for common configs: Remotion/Motion default (k100, c10, m1) → ζ = 0.5 → **~16% overshoot** (visibly bouncy — this default is a primary source of "boingy" AI motion). Remotion c=15 → ζ0.75 → 2.8%; c=20 → ζ1.0 → 0%; c=200 → heavily overdamped, 0%. Motion bounce 0.1/0.2/0.3 → 0.2%/1.5%/4.6%. M3 Expressive default spatial (ζ0.8) → 1.5%; fast spatial (ζ0.6) → 9.5%; M3 Standard (ζ0.9) → 0.15%. Equivalent Remotion damping coefficient for M3 Expressive default spatial: c ≈ 31 at k=380.
- Encodable defaults: entrances `cubic-bezier(0.16, 1, 0.3, 1)` or `(0.23, 1, 0.32, 1)`; exits `(0.3, 0, 0.8, 0.15)` (M3 emphasized accelerate) or Carbon expressive exit `(0.4, 0.14, 1, 1)`; on-screen moves `(0.77, 0, 0.175, 1)`; opacity/color never springs with overshoot. Springs: default `{damping: 200}` (Remotion) or ζ ≥ 0.8; allow ζ 0.6–0.7 only for one playful accent per scene.
- Rule: linear only for constant motion (tickers, progress, rotations, camera drifts, parallax background loops).

### Gaps
- Official m3.material.io token page and Apple HIG motion page could not be fetched; Apple publishes no numeric HIG easing tokens that I could confirm.

---

## 3. Disney's 12 principles applied to motion graphics / UI / text

### Takeaway
The principles translate into small, concrete moves: anticipation = a tiny counter-move before the main move; overlap/follow-through = children settling a few frames after their container; squash & stretch = subtle scale distortion on press/fast travel; slow-in/slow-out = easing; secondary action = small supporting motion that doesn't compete. Keep them subtle in UI (e.g. press scale 0.95–0.98).

### Cited Findings
- Principles originate with Ollie Johnston & Frank Thomas, *The Illusion of Life* (1981); still used across 2D, 3D, UI animation and product videos — [Motion The Agency](https://www.motiontheagency.com/blog/12-principles-of-animation)
- Anticipation in UI: a card pulls back slightly before swiping away; a button reacts briefly before a panel opens. Follow-through/overlap: a card slides into place first, its text and icons settle a fraction of a second later. Squash & stretch: button compresses on click; icon stretches when moving fast — [Motion The Agency](https://www.motiontheagency.com/blog/12-principles-of-animation)
- Domain split: squash/stretch, anticipation, slow in/out, staging → buttons, toggles, transitions, feedback; secondary action, appeal, exaggeration → logos and icons — [Ellie Motion journal](https://elliemotion.com/journal/the-12-principles-of-animation-the-timeless-blueprint-for-bringing-mo)
- Overlap defined: parts move relative to each other over time (shoulder → arm → elbow lagging); follow-through: parts continue moving after the body stops, then settle. In AE, offset keyframes across parented layers to get follow-through — [GarageFarm, Follow Through and Overlapping Action](https://garagefarm.net/blog/follow-through-and-overlapping-action-in-animation)
- Physicality rules: never `scale(0)` — start from `scale(0.9–0.97)` + opacity 0 ("Nothing in the real world appears from nothing"); origin-aware popovers scale from the trigger (modals exempt, stay centered); press feedback `scale(0.97)` on `:active` with 160 ms ease-out (subtle range 0.95–0.98) — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- Masking an imperfect crossfade: add `filter: blur(2px)` during the transition so two states read as one transformation; keep blur < 20 px — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)

### Inferences
- Encodable parameters (my synthesis, not sourced numbers): anticipation = 3–6 frames @30fps moving 5–10% of the travel distance opposite the main move; overlap = child layers delayed 2–4 frames @30fps (≈60–130 ms) after the parent; follow-through = one small overshoot (≤5%) via a ζ≈0.7 spring on the trailing element only; squash/stretch on shapes = scaleX/scaleY ±5–15% preserving area (scaleX·scaleY≈1); arcs = move along curves, not straight diagonals, for objects traveling > ~25% of frame (animate x and y with different easing to get a natural arc); exaggeration reserved for one hero moment.
- Text: overlap = line 2 starts while line 1 is ~50–70% done; never let text squash-stretch (it hurts legibility).

### Gaps
- No primary School of Motion / Animator's Survival Kit text with numeric frame counts for anticipation/overlap in motion graphics was accessible; numbers above are labeled inferences.

---

## 4. Choreography & hierarchy: stagger, directing the eye, focal point, continuity, transitions, camera, parallax, depth

### Takeaway
Pro motion has one orchestrated moment and one focal point at a time, staggers groups by ~30–80 ms (UI) rather than moving everything at once or in identical lockstep, and builds rhythm through a *sequence of shots with cuts, scale changes and varied shot lengths* — not by tweening properties inside one static centered scene with fade-to-black transitions.

### Cited Findings
- Stagger group entrances 30–80 ms between items; longer feels slow; stagger is decorative — never block interaction; example 300 ms ease-out per item, translateY(8px), delays 0/50/100 ms — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- "Use non-user-triggered motion sparingly and deliberately, only to draw attention. A single orchestrated moment — one page-load sequence or one reveal — lands better than scattered effects; fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated." "Spend your boldness in one place." — [Anthropic frontend-design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Agents "animate properties inside a single scene rather than building a sequence of shots with cuts, which is where rhythm comes from"; fix with a shot list (timings + role per shot), hard cuts, scale changes, real footage — [snapcn, Why Claude Code motion graphics all look the same](https://snapcn.dev/why-ai-motion-graphics-look-the-same)
- Flatness "usually comes from the shot scale never changing and the images never moving" — alternate wide/medium/close — [suno.bi, shot-scale + camera-motion method](https://suno.bi/en/blog/shot-scale-camera-motion-rhythm-method-sunomv-2026); the *pattern* of shot lengths matters more than any single length — [Medium, Optimal shot length for AI-generated motion](https://medium.com/@info_13818/optimal-shot-length-for-ai-generated-motion-based-on-viewer-retention-a7d86e8c8969) (secondary)
- Simple fade-to-black transitions make AI motion graphics feel flat/"like a PowerPoint" — [ChatCut, Seedance prompt principles](https://chatcut.io/blog/ai-motion-graphics-prompts-seedance-2)
- A scene that settles to full rest right before a cut, or starts from rest after it, is a "dead beat" that kills momentum — cut on motion — [aiagentskills.net, HyperFrames motion doctrine](https://aiagentskills.net/blog/skill-heygen-com-hyperframes-motion-doctrine-guide) (secondary)
- Remotion `TransitionSeries`: Transitions (fade/slide/wipe; both scenes overlap, shortening the timeline) vs. Overlays (e.g. light leak on top of a cut, timeline not shortened); timing via `linearTiming()` or `springTiming()` — [remotion-dev/skills transitions.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/transitions.md)
- Valid purposes for motion: spatial consistency, state indication, explanation, feedback, preventing jarring change; "It looks cool" is not valid on a frequently seen element — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- Linear text reading order must be preserved — the order words appear/disappear should follow reading order — [Hackernoon kinetic typography guide](https://medium.com/hackernoon/kinetic-typography-quickstart-guide-for-devs-designers-d5c6b5545ade)

### Inferences
- Encodable choreography rules: (1) one focal element moving at a time; secondary elements start after the focal element is ≥50% through its move; (2) stagger 30–80 ms (UI) / 2–4 frames @30fps (video) per item, cap total stagger so the last item starts < ~400 ms after the first; vary stagger direction to match reading order or the motion vector; (3) cut on action (outgoing scene still moving into the cut; incoming scene already moving); (4) prefer match cuts/shape morphs/element hand-offs (an element from scene A becomes the container for scene B) over generic fades/wipes; (5) change shot scale every 1–3 shots (wide → close-up on a number → wide); (6) camera: slow continuous drift (linear or very gentle ease, e.g. 2–5% scale over the shot) to avoid dead frames; parallax by moving layers at speeds proportional to their depth (e.g. background 0.2–0.5× foreground speed).
- Leave rest frames: after a key message lands, hold it (see §1 reading time) before the next action — the absence of holds is a slop tell.

### Gaps
- No primary-source numeric guidance on parallax ratios or camera move speeds was found; ratios above are inferences.

---

## 5. Kinetic typography

### Takeaway
Animate headlines and short phrases, not body copy; preserve reading order; use word-level reveals for 3–8 word headlines and line-level reveals for longer text; mask/clip reveals (text rising from behind a hard edge) read as more premium than opacity fades; hold long enough to read.

### Cited Findings
- Word split suits headlines of ~3–8 words; line split is subtler and better for longer text; character stagger ~30–50 ms feels fluid, 100 ms+ feels dramatic/deliberate — [StudioMeyer, Kinetic Typography 2026](https://studiomeyer.io/en/blog/kinetische-typografie) (vendor rules of thumb)
- If text moves too fast people won't read it; motion should reduce cognitive load; avoid kinetic type on body copy/long-form text — [Digital Silk, Kinetic Typography in 2026](https://www.digitalsilk.com/digital-trends/kinetic-typography/); [We Design Motion, when and why kinetic typography works](https://wedesignmotion.com/blog/design/kinetic-typography-when-and-why-it-works/)
- Use masks/clipping paths to reveal text (wipe, circle, gradient mask) — [Todaymade, kinetic typography examples](https://www.todaymade.com/blog/kinetic-typography-examples)
- `clip-path: inset(t r b l)` reveal: `inset(0 0 100% 0)` → `inset(0 0 0 0)`; WAAPI example 1000 ms with `cubic-bezier(0.77, 0, 0.175, 1)` — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)
- Avoid flashing above 3 Hz; respect reduced-motion — [Digital Silk](https://www.digitalsilk.com/digital-trends/kinetic-typography/)
- Default font (Inter / system) is a named AI-slop giveaway — [Charlie Hills, 5 fixes for Claude motion graphics that look like AI slop](https://charliehills.substack.com/p/5-fixes-for-claude-motion-graphics); "Don't use overused fonts (Arial, Inter, system defaults)" — [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- Replace crossfades between lines with hard cuts and shorten each hold for energetic kinetic type — [snapcn, Remotion kinetic typography](https://snapcn.dev/remotion-kinetic-typography)

### Inferences
- Encodable kinetic-type rules: per-word reveal = translateY 30–100% of line height inside an `overflow:hidden` / clip mask + opacity, 300–600 ms with expo-out, 40–80 ms word stagger (≈1–3 frames @30fps); per-character only for ≤ ~12-character display words; line breaks set manually by meaning (never let a single orphan word end a reveal line); display sizes with tighter tracking (≈ −1% to −3%) and body/captions with neutral or slightly positive tracking; one typeface family + at most one accent face; emphasis via weight/scale/color on the key word, not via extra motion on every word.

### Gaps
- No authoritative source (e.g. School of Motion) on tracking values or line-break rules for animated type was retrievable; tracking numbers above are inferences from general typographic practice.

---

## 6. Sound design and music sync

### Takeaway
Compute frames-per-beat = fps × 60 / BPM and place key motion hits on beat frames; whooshes should straddle the cut with their *peak* on the cut frame (starting a few frames early), while impacts/pops must land exactly on the hit frame.

### Cited Findings
- Frames per beat = (fps × 60) / BPM; e.g. 120 BPM @24fps = 12 frames/beat; 100 BPM @24fps = 14.4 (alternate 14/15); fractional values drift (128 BPM @24fps over 64 beats accumulates ~16 frames of rounding error) — use absolute beat markers or multi-beat intervals; use the true project rate (29.97 ≠ 30) — [Tap Tempo BPM-to-frames calculator](https://taptempocalculator.com/bpm-to-frames-calculator/); [Tools for Film, BPM and Picture](https://www.toolsforfilm.com/blog/bpm-and-picture-editors-guide); [Sean Bowes BPM to frames](https://www.seanbowes.com/bpmtofps)
- Whoosh: place so the loudest point (usually the middle of the sweep, not the file start) lands on the exact cut frame; start slightly before the picture changes and tail off after ("straddle the cut"); suggested lead ranges from ~10–20 ms to 2–3 frames (sources disagree); impacts should land on the cut frame — even 50 ms early reads as sloppy; length ≈ 400–500 ms for a half-second transition; level ≈ −6 dB relative to speech; reverse risers stop dead at the peak — [Zella, whoosh and impact at cuts](https://zellahq.com/blog/sound-design-at-cuts-whoosh-impact-riser/); [Sonilo whoosh guide](https://sonilo.com/ai-music/whoosh-sound-effect-guide); [Krotos, whoosh sound effects](https://sound.krotosaudio.com/whoosh-sound-effects/) (sound-library blogs; treat numbers as starting points)

### Inferences
- Computed frames per beat: 90 BPM → 16f@24 / 20f@30 / 40f@60; 100 → 14.4 / 18 / 36; 120 → 12 / 15 / 30; 128 → 11.25 / 14.06 / 28.1; 140 → 10.29 / 12.86 / 25.7. Agents should snap scene cuts to `round(n * fps * 60 / bpm)` computed from beat index n (not accumulated rounding).
- Encodable SFX rules: UI clicks/pops sync to the frame where the element reaches full scale (or the press bottom), not its start; whoosh peak = frame of max velocity / the cut; don't put an SFX on every element (pick the focal hits only), mirroring the "one focal point" rule. Cut on downbeats for section changes, on off-beats/8ths for secondary hits; let some bars be quiet (rest frames).

### Gaps
- No primary motion-design source (School of Motion etc.) on SFX lead times was accessible; the lead-time figures conflict.

---

## 7. Color, layout, texture: grain, motion blur, depth, brand tokens

### Takeaway
Pro motion avoids the sterile default look by adding physically motivated texture (motion blur at ~180° shutter, subtle grain/noise, light leaks at cuts, blur-to-mask crossfades), real assets and data, and by locking colors/type/easing/durations to a brand token file the agent must read before animating.

### Cited Findings
- 180° shutter is the baseline (1/48 s at 24 fps); After Effects defaults to 180° and it's the usual choice to match graphics to live footage; narrow shutters (45–90°) look crisp/choppy, wide (270–360°) smear — useful for stylized titles/sports graphics — [In Depth Cine, Shutter angle explained](https://www.indepthcine.com/videos/shutter-angle); [D. Jordan Media, Motion blur in After Effects](https://djordanmedia.com/blogs/news/motion-blur-after-effects); [Tools for Film motion-blur calculator](https://www.toolsforfilm.com/tools/motion-blur) (secondary; attribution of individual claims across these pages was via search summary)
- Remotion ships effect primitives including textures (`noise()`, `paper()`, `halftone()`, `speckle()`, `scanlines()`, `dotGrid()`), blur/trails (`blur()`, `lightTrail()`, `zoomBlur()`, progressive blurs) and color tools (`lut()`, `levels()`, `duotone()`, `vibrance()`) — prefer these over CSS approximations — [remotion-dev/skills remotion-markup SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)
- Light-leak overlay on cut points via `TransitionSeries.Overlay` — [remotion-dev/skills transitions.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/transitions.md)
- Community Claude Remotion skill claims to avoid the generic look with springs, staggered entrances, color grading and grain, and by extracting frames to check the render — [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) (vendor claim, untested)
- AI-default visual tells: "Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds, the rounded-square icon tile above every heading"; also "don't use pure black/gray (always tint)"; detector flags purple gradients, bounce easing, dark glows — [pbakaus/impeccable README](https://github.com/pbakaus/impeccable)
- "SaaS-card kit": identical rounded cards, one border-radius everywhere, the same soft grey shadow `rgba(0,0,0,.1)`, gradient washes as decoration; "a big number with a small label, supporting stats, and a gradient accent is the default treatment" — [Anthropic frontend-design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Brand rules file: Charlie Hills proposes a single "brand design system" rules file Claude reads before animating; Artimind suggests explicit bans/defaults in a project rules file (e.g. no glow effects, no linear easing) — [Charlie Hills Substack](https://charliehills.substack.com/p/5-fixes-for-claude-motion-graphics); [Artimind guide](https://aiartimind.com/how-to-make-motion-graphics-with-claude-opus-5-5/)
- Extend existing motion tokens rather than adding a parallel system — [emilkowalski/skills animate SKILL.md](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md); Carbon/M3 show the token pattern (named durations + named easings per role) — [Carbon motion.json](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/dtcg/motion.json)
- Performance (web): animate only `transform` and `opacity`; Motion's `x`/`y`/`scale` shorthands aren't hardware-accelerated — use full transform strings — [emilkowalski/skills STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md). Note: Remotion's own skill says the opposite for Remotion (prefer `scale`/`translate`/`rotate` CSS properties over `transform`, for Studio editability) — [remotion-markup SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md). These are context-dependent (live browser vs. frame-rendered video), not a true conflict.

### Inferences
- Encodable texture rules: subtle animated grain/noise at low opacity (≈3–8%) over full frame; motion blur on fast-moving elements only (simulate 180° shutter = blur length ≈ half the per-frame displacement); a light leak / flash overlay on at most 1–2 hero cuts; tinted near-blacks and near-whites instead of #000/#fff; depth via soft shadows that move with parallax, not uniform drop shadows.
- Token file should define: palette (with tinted neutrals), 1–2 fonts, duration ladder in frames for the comp fps, 3–4 named easings (enter/exit/move/emphasis), 2 spring presets (no-bounce, gentle), stagger step, and banned patterns.

### Gaps
- No authoritative source with numeric grain opacity/size settings was found; the 3–8% figure is an inference.

---

## 8. What makes AI-generated motion look like slop (practitioner commentary) and how to avoid it

### Takeaway
Practitioners converge on a recognizable "median of tutorials" output: centered headline on a (purple/blue) gradient that fades and slides up; every element animated the same way with uniform timing; bouncy default springs/elastic easing; linear or weak built-in easing; no cuts or shot-scale changes; no rest frames; default fonts (Inter); invented data; poorly drawn icons/emoji; glows; and the agent never watches its own render. The fix is principle-based rules + explicit bans + render-and-review loops — not copying one bold example (which just creates a new formula).

### Cited Findings
- For a vague brief, agents write "the median of every tutorial": simple opacity interpolation, small vertical movement, centered layout, linear gradient; vague style words ("modern and sleek") name no decision so every decision becomes the default; agents animate within one scene instead of cutting between shots; the agent never watches its render — [snapcn, Why Claude Code motion graphics all look the same](https://snapcn.dev/why-ai-motion-graphics-look-the-same); [snapcn, Why AI agents write bad Remotion animations](https://snapcn.dev/why-ai-writes-bad-remotion-code)
- Charlie Hills: Claude output looks generic because it invents numbers for charts, relies on a default font, draws icons/illustrations poorly, plus export problems; his recipe: pick one motion (e.g. a chart that morphs), show a reference and name every state, iterate round by round — [Charlie Hills Substack](https://charliehills.substack.com/p/5-fixes-for-claude-motion-graphics); [Charlie Hills on Threads](https://www.threads.com/@charliehills/post/Ddv7nZgHGt3/claude-opus-can-finally-generate-motion-graphics-motion-graphics-in-claude-code/)
- Overcorrection risk: show Claude one bold example and it copies that pattern, producing a different formula; teach principles, not patterns — [Holen Ventures, Coaching Claude](https://holenventures.substack.com/p/coaching-claude) (via search summary)
- "Fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated" — [Anthropic frontend-design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Bounce/elastic easing "feels dated"; purple gradients, dark glows and bounce easing are among 61 deterministic slop/quality detector rules — [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- Two failure modes for UI motion: animating things that shouldn't animate, and "animating the right thing with the wrong ingredients — ease-in on an entrance, scale(0), keyframes on a toast, a duration that makes a dropdown feel sluggish" — [emilkowalski/skills animate SKILL.md](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md)
- Unguided AI output = "generic, often janky motion" because it guesses library, timing, and constraints; linear motion "reads as an ad but not a good one" — [Shyft, Design Motion Principles skill](https://shyft.ai/skills/design-motion-principles); [CreatorOS, Motionmaxxing skill](https://www.creatoros.ca/blog/motionmaxxing-agent-skill-video/) (vendor pages)
- AI-generated kinetic type "often lacks the intentional rhythm" experienced designers apply — [displaceindex, Will AI replace motion designers?](https://displaceindex.com/occupations/motion-designer/) (secondary)
- Getting poses right is easier than timing: "nailing the timing of those poses is a whole different ballgame" — [Medium, Animation timing in AI-driven motion inbetweening](https://medium.com/@goel.purvi/the-missing-piece-animation-timing-in-ai-driven-motion-inbetweening-779f12eab458)
- Broader AI-video criticism: generic imagery, emotional flatness, "motion without intention" (Coca-Cola 2025 AI holiday ad) — [DocumentaryTube](https://www.documentarytube.com/blog/coca-colas-2025-ai-holiday-ad-is-a-sloppy-eyesore-and-thats-not-the-worst-problem/); characters "standing still or making very slight movements" — [Know Your Meme](https://amp.knowyourmeme.com/news/ai-generated-wes-anderson-star-wars-sparks-more-criticism-in-hollywoodai-discourse)
- Feel-check practice: play at 2–5× duration or step frame-by-frame; look again next day — [emilkowalski/skills animate SKILL.md](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md)

### Inferences — consolidated slop-tell catalog → rule
| Tell | Rule to encode |
|---|---|
| Every element fades + slides up 20–40px identically | Vary entrance by role: hero = mask reveal/scale-from-0.95; data = draw-on/morph; supporting = opacity only. Max one "big" entrance per shot. |
| Uniform durations/delays (everything 0.5 s, 0.1 s apart) | Use a duration ladder by distance/size/importance; non-uniform stagger tied to reading order; overlap entrances. |
| Default/bouncy springs (Remotion default ζ=0.5 → 16% overshoot), elastic easing | Default `damping: 200` or ζ ≥ 0.8; bounce ≤ 0.2 only for one playful accent; never overshoot opacity/color. |
| Linear or `ease`/`ease-in-out` built-ins everywhere | Named custom curves per role (enter expo-out, exit accelerate, move strong in-out); linear only for constant motion. |
| `scale(0)` pop-ins | Start at 0.9–0.97 + opacity 0. |
| Centered headline on purple→blue gradient, Inter, glow | Brand token file; grid-based asymmetric layouts; tinted neutrals; banned list (purple gradients, glows, emoji, Inter default). |
| One long scene with properties tweening, fade-to-black transitions | Shot list with timing & role per shot; hard cuts/match cuts on motion; alternate shot scale; cut on beat. |
| No rest frames / text leaves before readable | Reading-time hold formula (≥13 cps; ≥5/6 s); a hold after each key message. |
| Too much on screen at once | One focal point at a time; ≤ ~7 words per text card for kinetic type; build complexity sequentially. |
| Invented data, clip-art/emoji icons, poorly drawn illustrations | Use real data and real assets/icon sets; don't hand-draw complex illustrations in SVG. |
| Constant motion with no purpose ("it looks cool") | Each animation must name its purpose (spatial continuity, state, explanation, feedback, emphasis). |
| Never reviewed | Render stills/contact sheets at key frames and play at 0.5× before shipping. |

### Gaps
- No Reddit r/MotionDesign / r/AfterEffects threads or X posts from established motion designers (Ben Marriott, Jake in Motion, School of Motion staff) specifically critiquing AI motion were surfaced by search; most "AI slop motion" commentary found is from AI-tool builders and newsletter writers (practitioner opinion, not measured evidence). Snapcn's five specific fixes and Charlie Hills' full five fixes were paywalled/truncated.
