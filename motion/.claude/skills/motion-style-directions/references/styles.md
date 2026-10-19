# Style library

28 directions in six families. Each entry: what it's for, how it looks, how it moves, which Remotion tools build it, and what to avoid.
**Momos fit** rates how naturally it carries the brand (Poppins, beige/ink/red, hospitality subject): ●●● natural, ●● works with care, ● only for a specific campaign.

Brand still applies to every style (see SKILL.md). Variety comes from layout, scale, motion, texture and subject, not from new fonts or off-brand colors.
"Inverted" means the 60/30/10 color ratio flips: ink base, beige text, red ≤10%.

Toolkit names refer to `references/toolkit.md` (transitions = `@remotion/transitions/<name>`, effects = `@remotion/effects/<name>`).

---

## A. Typography-led

### 1. Kinetic type (beat-cut): Momos fit ●●●
- **For:** launch teasers, event promos, manifestos, 6–15s social.
- **Look:** one or two words per frame, huge (display 140–320px), full-bleed. Hard color swaps between beige and ink frames.
- **Motion:** cut on the beat (120 bpm = every 15 frames at 30fps). Words mask-reveal, scale-punch (1.15→1 in 6 frames), or swap in place. No easing on cuts, expo-out on reveals.
- **Toolkit:** `push-cut`, `none` transitions; `measuring-text` (fitText) so words fill the width; `skew` effect for speed.
- **Avoid:** more than 3 words on screen; motion that makes the final lockup unreadable.

### 2. Swiss grid: Momos fit ●●●
- **For:** feature lists, "how it works", B2B explainers.
- **Look:** visible 12-column grid (border color hairlines), flush-left text, big numerals hung in the margin, lots of beige.
- **Motion:** everything moves on the grid axes only: horizontal/vertical slides of exactly N columns. `Easing.bezier(0.7, 0, 0.3, 1)`, no springs, no rotation.
- **Toolkit:** `wipe` (from-left), `slide`; `gridlines` effect for the grid; `@remotion/layout-utils`.
- **Avoid:** centered text; decorative shadows.

### 3. Editorial / magazine: Momos fit ●●
- **For:** thought leadership, customer stories, reports and year-in-review.
- **Look:** big pull quote, generous margins, a photo with a caption, contrast comes from size (display vs body), not light weights.
- **Motion:** slow. 30–45 frame reveals, line-by-line, sine in-out `Easing.bezier(0.45, 0, 0.55, 1)`. Ken Burns on photos (scale 1→1.06 over the scene).
- **Toolkit:** `fade`, `dissolve`; `paper` effect for texture; `color-correction` on photos.
- **Avoid:** fast cuts; it reads as a magazine, not an ad.

### 4. Typographic poster: Momos fit ●●
- **For:** campaign hero moments, OOH-style social, event key art.
- **Look:** type used as image: cropped off-frame, stacked, outlined (`WebkitTextStroke`), repeated in a pattern, one word filling the frame.
- **Motion:** slow drift and scale of oversized type; a single reveal where the crop opens to show the full word.
- **Toolkit:** `tile`, `mirror`, `pattern` effects; `iris`/`clock-wipe` transitions.
- **Avoid:** cropping so much that the brand word is unreadable at the end.

### 5. Chat-native story: Momos fit ●●●
- **For:** anything about guest conversations (Alfie, replies, recovery). Native-feeling social.
- **Look:** the whole story told in message bubbles, timestamps, typing dots, read receipts. Big bubbles (52–60px text).
- **Motion:** iMessage physics: bubble pops (spring damping 14), typing indicator, auto-scroll as messages stack.
- **Toolkit:** springs; `measuring-text` for bubble sizing; `sfx` (pop/whoosh) when there's sound.
- **Avoid:** tiny UI text; too many messages (max ~5 per scene).

---

## B. Product-led

### 6. Product UI demo: Momos fit ●●●
- **For:** feature launches, how-to, release notes.
- **Look:** real Momos screens rebuilt in React on a beige stage; one region in focus, everything else defocused.
- **Motion:** fake cursor on a curved path, click ripple, zoom-to-region (1→1.6, expo-out), UI state changes in place.
- **Toolkit:** `@remotion/paths` (cursor path), `region-blur` / `radial-progressive-blur` for focus, `drop-shadow`, `zoom-in-out` transition.
- **Avoid:** lorem dashboards and fake numbers; zooming past 2x (text goes soft).

### 7. Device in 3D space: Momos fit ●●
- **For:** app launches, premium "hero" shots.
- **Look:** a phone or laptop with the real UI as its screen texture, floating on beige with a soft shadow.
- **Motion:** slow orbit (10–20° over the scene), one push-in to the screen, then a cut to flat UI.
- **Toolkit:** `@remotion/three` (ThreeCanvas, frame-driven rotation only), `corner-pin` effect for 2D screen replacement.
- **Avoid:** spinning; anything not driven by `useCurrentFrame()` (flickers).

### 8. Exploded UI / 2.5D layers: Momos fit ●●●
- **For:** showing what's inside a product: "reviews + surveys + chat in one place".
- **Look:** the UI split into floating cards at different depths, with perspective, then snapping back together.
- **Motion:** CSS `perspective` + `translateZ`; parallax by depth (far layers move 0.3x). Explode with springs, reassemble with expo-out.
- **Toolkit:** CSS 3D transforms, `flip` transition, `drop-shadow`, `linear-progressive-blur` for depth of field.
- **Avoid:** more than 5 layers; uniform card styling (see frontend-design's SaaS-card tell).

### 9. Isometric system: Momos fit ●●
- **For:** workflow and integration explainers (POS → Momos → loyalty → guest).
- **Look:** 30° isometric tiles for each system, connected by animated paths carrying small tokens.
- **Motion:** paths draw on, tokens travel along them, tiles lift when active.
- **Toolkit:** `@remotion/paths` (`evolvePath`, `getPointAtLength`), `@remotion/shapes`.
- **Avoid:** detailed illustration you can't maintain; label every node instead.

### 10. Notification cascade: Momos fit ●●●
- **For:** the "overwhelm" problem beat: reviews, surveys and cases piling up.
- **Look:** cards and toasts stacking and overflowing the frame, then collapsing into one calm view.
- **Motion:** staggered drops with slight random rotation (`random()` seeded), accelerating rhythm, then a single satisfying collapse.
- **Toolkit:** `random()` from remotion, springs; `zoom-blur` transition into the calm state.
- **Avoid:** making the chaos so busy it's unreadable for more than ~2 seconds.

---

## C. Data-led

### 11. Data story: Momos fit ●●●
- **For:** monthly recaps, ROI stories, benchmark reports.
- **Look:** one chart per scene, one annotated insight, accent family as data colors (light fills, dark strokes).
- **Motion:** bars grow, lines draw (`evolvePath`), the key point gets a callout last.
- **Toolkit:** `@remotion/paths`, `@remotion/rough-notation` (circle/underline the insight), dataviz skill for colors.
- **Avoid:** more than one message per chart; animating axes for fun.

### 12. Big number hero: Momos fit ●●●
- **For:** stats, milestones, social proof. Only with verified numbers.
- **Look:** one number at display size filling 60% of the frame, a small sentence of context.
- **Motion:** count-up with tabular figures (`fontVariantNumeric: 'tabular-nums'`), ease-out so it settles; the unit lands last.
- **Toolkit:** `interpolate` + `Math.round`; `starburst`/`rings` effect sparingly behind the number.
- **Avoid:** unsourced numbers; several numbers fighting for attention.

### 13. Map story: Momos fit ●●
- **For:** footprint and expansion stories, regional launches, "every location".
- **Look:** a muted map, locations lighting up as dots, region labels.
- **Motion:** camera fly-to between regions, dots pop in a wave.
- **Toolkit:** `remotion-maps` skill (MapTiler / Cesium techniques), `@remotion/shapes`.
- **Avoid:** real customer locations without permission.

---

## D. Graphic / illustrative

### 14. Geometric shapes: Momos fit ●●
- **For:** abstract concepts (speed, connection, growth), intros and outros.
- **Look:** circles, pills and triangles in the accent family, composing and recomposing into icons.
- **Motion:** shape morphs (`@remotion/paths` `interpolatePath`), orbiting, stacking.
- **Toolkit:** `@remotion/shapes` (Circle, Rect, Pie, Star, Polygon), `@remotion/paths`.
- **Avoid:** shapes with no meaning; every shape should become something.

### 15. Line draw-on: Momos fit ●●●
- **For:** explainers, onboarding, "how it works" in a calm voice.
- **Look:** single-weight ink line drawings (store, phone, receipt) on beige, red used for one stroke.
- **Motion:** strokes draw on (`strokeDasharray`), then fill fades in.
- **Toolkit:** `@remotion/paths` (`evolvePath`), `outline` / `contour-lines` effects for traced photos.
- **Avoid:** inconsistent stroke widths.

### 16. Hand-annotated: Momos fit ●●●
- **For:** testimonials, review highlights, "here's what matters".
- **Look:** real text (a review, a screenshot) with marker circles, underlines and arrows drawn over it.
- **Motion:** annotation draws in after the reader has had ~1s with the text.
- **Toolkit:** `@remotion/rough-notation` (Highlight, Circle, Underline, Bracket), `@remotion/shapes` Arrow.
- **Avoid:** annotating everything; one or two marks per frame.

### 17. Paper / collage: Momos fit ●●
- **For:** brand campaigns, culture and hiring, playful social.
- **Look:** torn paper shapes, cut-out photos with white borders, kraft and beige textures.
- **Motion:** stop-motion on twos or threes (`Math.floor(frame / 3) * 3`), slight rotation jitter per hold.
- **Toolkit:** `paper`, `roughen-edges`, `burlap`, `drop-shadow` effects.
- **Avoid:** smooth easing; it breaks the handmade illusion.

### 18. Risograph / halftone print: Momos fit ●
- **For:** event posters, a limited campaign, zines.
- **Look:** two-ink print (brand red + ink, or red + purple), halftone photos, slight misregistration.
- **Motion:** layers shift a few px out of register and back; stepped motion.
- **Toolkit:** `halftone`, `duotone`, `dot-grid`, `noise` effects.
- **Avoid:** using it for product explainers; it hides the UI.

### 19. Neo-brutalist: Momos fit ●
- **For:** loud social, recruitment, contrarian takes.
- **Look:** flat color blocks, thick ink borders, hard offset shadows (8px 8px 0 ink), no radius.
- **Motion:** elements slam in with no easing, hard cuts, shake on impact (2–3 frames).
- **Toolkit:** `push-cut`, `none`; CSS only.
- **Avoid:** using all of it at once; it fights the warm hospitality tone.

### 20. Sticker / scrapbook: Momos fit ●●
- **For:** community, events, recap reels, UGC-adjacent content.
- **Look:** cut-out stickers with white outlines, emoji-like icons (SVG, not system emoji), tape strips.
- **Motion:** stickers slap on (scale 1.3→1 with overshoot, slight rotation), wobble once.
- **Toolkit:** springs (damping 10), `outline` effect, `drop-shadow`.
- **Avoid:** system emoji (they don't render in headless Chrome; draw SVGs).

---

## E. Atmospheric / cinematic

### 21. Cinematic premium: Momos fit ●● (inverted)
- **For:** flagship launches, keynote openers, investor moments.
- **Look:** ink background, one product element lit, lots of negative space, slow reveals.
- **Motion:** slow push-ins, motion blur on fast moves, light leaks over cuts. Long holds.
- **Toolkit:** `@remotion/motion-blur` (`HtmlInCanvasMotionBlur`), `light-leak` overlay, `vignette`, `dreamy-zoom` / `linear-blur` transitions.
- **Avoid:** dark mode for its own sake; it's a moment, not the whole video.

### 22. Lo-fi film: Momos fit ●●
- **For:** brand storytelling, founder notes, "behind the kitchen" content.
- **Look:** footage or photos with grain, warm grade, soft vignette, handheld feel.
- **Motion:** subtle camera shake (noise-driven, 1–2px), film-burn transitions.
- **Toolkit:** `@remotion/noise` (`noise2D` for shake), `noise` / `white-noise` effects, `film-burn` transition, `color-correction` (temperature +0.1).
- **Avoid:** heavy grain over UI text.

### 23. Retro tech / CRT: Momos fit ●
- **For:** "the old way" segments, nostalgia jokes, before/after.
- **Look:** scanlines, RGB split, pixelation, old-monitor framing.
- **Motion:** signal drop-outs, tear and glitch bursts (≤6 frames), then a clean cut to modern.
- **Toolkit:** `scanlines`, `chromatic-aberration`, `tear`, `tv-signal-off`, `pixelate`, `pixel-dissolve` effects.
- **Avoid:** using it for the product itself; the contrast is the point.

### 24. Liquid / organic: Momos fit ●●
- **For:** transitions between ideas, AI or "intelligence" metaphors, ambient loops.
- **Look:** soft blobs in brand-bg / olive / blue light shades drifting behind type.
- **Motion:** noise-driven morphing (`noise3D(x, y, frame * 0.01)`), slow and continuous.
- **Toolkit:** `@remotion/noise`, `liquid-contours`, `wave`, `noise-displacement` effects, `ripple` / `crosswarp` transitions.
- **Avoid:** fast loops; organic motion should feel like breathing.

### 25. Soft 3D / clay: Momos fit ●●
- **For:** friendly explainers, mascot-like Alfie moments, icon sets.
- **Look:** rounded 3D objects (food, phone, chat bubble) in pastel accent shades, soft studio light.
- **Motion:** squash and stretch on landing, floating idle bob, gentle camera orbit.
- **Toolkit:** `@remotion/three`, or pre-made Lottie/Rive (`@remotion/lottie`, `@remotion/rive`).
- **Avoid:** building complex models in code; source models or Lottie files instead.

---

## F. Footage-led

### 26. Footage + type: Momos fit ●●●
- **For:** customer stories, events, anything with real restaurants.
- **Look:** restaurant B-roll (kitchens, counters, guests) graded warm, type locked to a grid on top, lower thirds.
- **Motion:** cuts on action, type enters with the footage's own motion direction.
- **Toolkit:** `@remotion/media` `<Video>`, `color-correction` / `lut`, `video-editing` reference, `text-highlights`.
- **Avoid:** stock footage that looks like stock; text over busy areas (add a `linear-gradient` scrim).

### 27. Testimonial / UGC: Momos fit ●●●
- **For:** customer voice, operator quotes, vertical social.
- **Look:** a person on camera (vertical), word-by-word captions with the current word highlighted, name lower third.
- **Motion:** captions pop per word, punch-in zoom (1→1.08) on key lines.
- **Toolkit:** `remotion-captions` skill (Whisper transcription, TikTok-style pages), `@remotion/media`.
- **Avoid:** captions in the bottom 400px of 9:16 (app UI covers them).

### 28. Audiogram: Momos fit ●●
- **For:** podcast and webinar clips, founder voice notes.
- **Look:** speaker photo or logo, waveform or spectrum bars, captions.
- **Motion:** bars react to audio; everything else still.
- **Toolkit:** `audio-visualization` reference (`visualizeAudio`, `visualizeAudioWaveform`), captions.
- **Avoid:** visualizers louder than the words.

---

## Picking by video type

| Video type | First choice | Contrast option |
|---|---|---|
| Product launch (30s) | 6 Product UI demo + 1 Kinetic type | 21 Cinematic premium, 8 Exploded UI |
| Feature explainer (60s) | 2 Swiss grid, 15 Line draw-on | 9 Isometric system |
| Social teaser (6–15s) | 1 Kinetic type, 5 Chat-native | 4 Typographic poster, 20 Sticker |
| Stats / recap | 12 Big number, 11 Data story | 13 Map story |
| Customer story | 26 Footage + type, 27 Testimonial | 3 Editorial, 16 Hand-annotated |
| Problem → solution | 10 Notification cascade → 6 UI demo | 23 Retro tech → modern |
| Event / webinar promo | 4 Typographic poster, 1 Kinetic | 18 Risograph |
| Hiring / culture | 17 Paper collage, 20 Sticker | 22 Lo-fi film |
| Podcast / webinar clip | 28 Audiogram, 27 Testimonial | 3 Editorial |

Mixing: a video may use **one primary style plus one bookend style** (like Alfie: UI demo with kinetic-type open and close). More than two reads as a template sampler.
