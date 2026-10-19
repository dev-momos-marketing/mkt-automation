---
name: motion-style-directions
description: Pick a distinct visual and motion style before building any Remotion video in motion/. Use whenever creating a new composition, restyling an existing one, or when asked for "a different look", "more variety", or "more taste". Works alongside frontend-design (taste) and remotion-best-practices (Remotion APIs).
---

# Motion style directions

Every new video gets its own deliberate style. Don't default to "gradient background + centered white text + spring-in pills" (that's `MomosPromo`, the starter).

## Process

1. Read `STYLE_LOG.md` in this folder. Do not reuse the direction used by the last two videos unless the user asks.
2. Pick a direction below (or invent one grounded in the brief's subject) and write a 5-line plan: palette (4–6 hex), typefaces, layout, motion signature, the one memorable moment.
3. Load fonts with `@remotion/google-fonts` (never rely on system fonts) and put tokens in a `tokens.ts` next to the composition.
4. Build, then render 3–4 stills (`npx remotion still <id> out/f.png --frame=N`) and critique them before rendering the full video.
5. Append one line to `STYLE_LOG.md`: date, composition id, direction, what worked / what didn't.

## Momos brand (always applies)

Import everything from `src/brand.ts`: never hard-code hex values or font names. Brand overrides each direction's palette and type; layout and motion still vary per direction.

- **Font:** Poppins only (700 headlines, 500 subheads/labels, 400 body). No 300 weight: thin strokes shimmer after compression.
- **Color ratio:** ~60% beige/white/cream base, ~30% ink `#14181D`, ≤10% brand red `#D73E33`. Red marks the one thing that matters in a scene (key word, CTA, the number that moved), never decoration or full-frame fills.
- **Accents:** pick at most one accent family (purple / olive / ochre / blue) per video, used for data or categories. Light shades for fills, dark shades for text or strokes.
- **Contrast:** `brandFg #FF787A` is for dark backgrounds only (2.4:1 on beige). Red on beige is 4.3:1, so use it for large text (≥56px) only. Ink on beige is 16.8:1, so use it for all body text.
- **Small red text** blurs under H.264 chroma subsampling. Keep red text ≥56px and bold, or put white text on a red block (4.5:1).
- **Type scale:** use `type.*` from brand.ts. 32px is the floor at 1080p.
- **Beige + red is close to a generic "AI cream + terracotta" look** (see frontend-design). Make it distinctive through motion, real product UI, real restaurant/guest content and layout, not by changing brand colors.

## Directions

| Direction | Type | Palette | Motion signature |
|---|---|---|---|
| Kinetic type | One heavy grotesk or condensed face, huge sizes, tight tracking | 2 colors, high contrast | Words snap, scale, and mask-reveal on the beat; text *is* the visual |
| Swiss grid | Neutral sans, strict scale | White, black, one primary | Elements slide along a visible 12-col grid; linear/eased, no bounce |
| Editorial | Serif display + sans body | Paper tones, ink, one muted accent | Slow crossfades, line-by-line reveals, generous whitespace |
| Product UI demo | The product's own UI font | Product UI colors | Fake cursor, clicks, zoom-to-region on a mocked screen; real UI copy |
| Data story | Tabular figures, mono or grotesk numerals | Sequential/diverging scale | Numbers count up, bars/lines draw in, one annotated insight |
| Paper / collage | Hand-drawn or quirky display | Kraft, cutout colors, grain overlay | Stop-motion feel: steps of 2–3 frames, slight rotation jitter |
| Neo-brutalist | Mono or bold grotesk | Flat saturated blocks, thick black borders | Hard cuts, offset shadows, elements slam in with no easing |
| Soft 3D / clay | Rounded sans | Pastels with soft shadows | Squash-and-stretch springs, floating objects, depth parallax |
| Restaurant / hospitality | Warm humanist sans or serif | Food photography + 1–2 accents | Ken Burns on photos, review cards stacking like receipts or tickets |

## Motion craft rules

- One orchestrated moment per scene beats many small effects.
- Vary easing per direction: springs for playful, `Easing.bezier` for editorial, steps for collage, none for brutalist.
- Use `<TransitionSeries>` from `@remotion/transitions` for scene changes instead of fading everything to 0.
- Hold important text on screen for at least ~1.5s (45 frames at 30fps) so it can be read.
- Keep safe margins (≥5% of width) and test both 16:9 and 1:1 compositions.
