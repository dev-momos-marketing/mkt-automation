# momos-motion

Remotion project for momos marketing videos. Two skill sets live in `.claude/skills/`:
the official Remotion skills (API rules, vendored from remotion-dev/skills 4.0.536) and
the house `momos-motion` skill (taste, tokens, workflow). Use `momos-motion` for any
video work; it tells you when to load the Remotion ones.

## Render contract

- Every frame is a pure function of the frame number. No CSS transitions or animations,
  timers, `Date`, `Math.random`, or `will-change`.
- Colours, type, easings, durations and safe zones come from `src/brand/theme.ts`.
  `npm run lint:motion` enforces it.
- Fonts load from `public/fonts/` through `src/brand/fonts.ts`; import it in every scene.
- One composition per aspect ratio; never crop between them.

## Gates

1. Brief (`videos/<slug>/brief.md`) and shot list approved by a person before code.
2. `npm run lint` and `npm run lint:motion` pass.
3. Review loop (`momos-motion-review`): critic scores all ≥ 8, or 3 rounds and open
   issues reported.
4. A person watches the final MP4 on a phone and picks the music.

## Commands

- `npm run dev`: Remotion Studio
- `npm run review -- <CompositionId> <frames> [--safe]`: stills + contact sheets
- `npx remotion render <CompositionId> out/<name>.mp4`: final render (only when asked)

In cloud sessions set
`REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
and pass `--browser-executable=$REMOTION_BROWSER_EXECUTABLE` to `remotion render`.

## Licensing

Remotion is free only for companies of up to 3 people. momos needs a Remotion Company
License (remotion.pro) before this is used for real campaigns.

## Keep after compaction

The non-negotiables in `momos-motion/SKILL.md`, the safe box (x 120–888, y 288–1248),
and the current round's critic notes.
