---
name: motion-style-directions
description: Pick a distinct visual and motion style before building any Remotion video in motion/. Use whenever creating a new composition, restyling an existing one, or when asked for "a different look", "more variety", or "more taste". Works alongside frontend-design (taste) and remotion-best-practices (Remotion APIs).
---

# Motion style directions

Every new video gets its own deliberate style. Don't default to "gradient background + centered white text + spring-in pills" (that's `MomosPromo`, the starter).

## Process

1. Read `STYLE_LOG.md`. Don't reuse the primary style of the last two videos unless the user asks.
2. Pick a primary style (plus at most one bookend style) from `references/styles.md`. Use its "Picking by video type" table, and check the Momos fit rating.
3. Write a 5-line plan: style(s), base and accent, type treatment, easing family (from `references/motion-grammar.md`), and the one signature moment.
4. Look up the transitions, effects and packages for that style in `references/toolkit.md`. If any are canvas-based, render a test still first (see its rendering caveat).
5. Put tokens in code via `src/brand.ts`. Build, render 3–4 stills (`npx remotion still <id> out/f.png --frame=N`), critique them, fix, then render the full video.
6. Append one line to `STYLE_LOG.md`: date, composition, style numbers, what worked and what didn't.

## References

- `references/styles.md`: 28 styles in 6 families (typography, product, data, graphic, cinematic, footage), each with look, motion, toolkit, and what to avoid.
- `references/toolkit.md`: every Remotion transition, effect and add-on package, mapped to styles, with DOM vs canvas rendering notes.
- `references/motion-grammar.md`: easing palette, timing table, camera moves, composition rules, and variety levers.

## Momos brand (always applies)

Import everything from `src/brand.ts`: never hard-code hex values or font names. Brand overrides each direction's palette and type; layout and motion still vary per direction.

- **Font:** Poppins only (700 headlines, 500 subheads/labels, 400 body). No 300 weight: thin strokes shimmer after compression.
- **Color ratio:** ~60% beige/white/cream base, ~30% ink `#14181D`, ≤10% brand red `#D73E33`. Red marks the one thing that matters in a scene (key word, CTA, the number that moved), never decoration or full-frame fills.
- **Inverted scenes** (ink base, beige text, red ≤10%) are allowed for one "turn" or cinematic moment per video.
- **Accents:** pick at most one accent family (purple / olive / ochre / blue) per video, used for data or categories. Light shades for fills, dark shades for text or strokes.
- **Contrast:** `brandFg #FF787A` is for dark backgrounds only (2.4:1 on beige). Red on beige is 4.3:1, so use it for large text (≥56px) only. Ink on beige is 16.8:1, so use it for all body text.
- **Small red text** blurs under H.264 chroma subsampling. Keep red text ≥56px and bold, or put white text on a red block (4.5:1).
- **Type scale:** use `type.*` from brand.ts. 32px is the floor at 1080p.
- **Beige + red is close to a generic "AI cream + terracotta" look** (see frontend-design). Make it distinctive through motion, real product UI, real restaurant/guest content and layout, not by changing brand colors.
