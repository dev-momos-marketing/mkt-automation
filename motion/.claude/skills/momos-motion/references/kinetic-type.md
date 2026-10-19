# Kinetic type

- Type is Poppins (loaded locally by `src/brand/fonts.ts`; import it in every scene and
  element so connected compositions render on their own). Headlines semibold, tracking
  -0.035em, line height 1.08. Body regular, line height 1.38.
- Animate headlines, not body copy. Headlines of 3–8 words: reveal line by line through a
  mask (`MaskLine`), second line 0.25–0.5s after the first. Word-by-word only when the
  brief calls for it.
- Break lines by meaning, never mid-phrase: "A 1-star review / just landed." Set line
  breaks by hand; do not let the browser wrap a headline.
- Text never moves while it is meant to be read, apart from the shot's constant drift.
- Untyped characters keep their space (render them transparent) so typing never reflows.

## Hold time

Hold every line at least **1s per 13 characters** (or 0.3s per word + 0.5s), counted from
when it is fully on screen to when it starts leaving. Nothing on screen for less than
5/6s. If the hold does not fit the shot, cut words, not time.

## Captions (sound-off is the default viewer)

- Burn captions into social cuts; deliver an `.srt` alongside.
- 25–32 characters per line, max 2 lines, sentence case.
- Place in the lower band of the safe box (above y 1248), never in the bottom 672px.
- White or ink on a plate reaching ≥ 4.5:1 contrast. Size ≥ 44px at 1080 wide.
- Use the `remotion-captions` skill for timing data.
