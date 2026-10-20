# motion

Programmatic marketing videos for Momos, written in React with [Remotion](https://www.remotion.dev/docs).

## Quick start

```bash
cd motion
npm install
npm run dev          # opens Remotion Studio: live preview + editable props
npm run render       # 1920x1080 -> out/momos-promo.mp4
npm run render:square # 1080x1080 -> out/momos-promo-square.mp4
npm run still        # single frame -> out/thumbnail.png
```

## What's here

- `src/Root.tsx`: registers the compositions (id, size, fps, length, default props).
- `src/brand.ts`: Momos brand tokens for video (colors, Poppins, type scale). Import from here; never hard-code.
- `src/arrowsterr/`: Arrowsterr launch video (16:9 and 9:16) in the Arrowsterr brand system (`brand.ts`). Script in `scripts/arrowsterr-launch.md`; voiceover, timeline and music from `scripts/build-arrowsterr-soundtrack.py`. Render with `npm run render:arrowsterr`.
- `src/alfie/`: Alfie launch video (16:9 and 9:16), one file per scene in `src/alfie/scenes/`. Script in `scripts/alfie-launch.md`. Voiceover, sync timeline and music come from `scripts/build-soundtrack.py` (writes `src/alfie/timeline.json` and `public/audio/alfie-mix.wav`). Render with `npm run render:alfie`.
- `src/alfie3/`: Alfie v3, "The night shift" (16:9 and 9:16). Script in `scripts/alfie-launch-v3.md`. `scripts/build-alfie3-soundtrack.py` speaks the voiceover, writes `src/alfie3/timeline.json` (scene lengths and cue frames) and scores the kitchen-kit anthem into `public/audio/alfie3-mix.wav`. Render with `npm run render:alfie3` and `npm run render:alfie3-vertical`.
- `src/MomosPromo.tsx`: an 8-second promo made of four `<Sequence>` scenes (logo, headline, features, CTA).
  The props (headline, features, CTA, colors) are defined with a zod schema, so you can edit them in the Studio sidebar.

Render with your own copy without changing code:

```bash
npx remotion render MomosPromo out/custom.mp4 \
  --props='{"headline":"Your headline","features":["A","B"],"cta":"Try it","url":"momos.com","brandColor":"#5B3DF5","accentColor":"#FFB547"}'
```

## Sandboxed / offline environments

Remotion downloads its own Chrome Headless Shell on first render. If that is blocked,
point it at an existing Chromium:

```bash
npx remotion render MomosPromo out/momos-promo.mp4 --browser-executable=/path/to/chrome
```

## License note

Remotion is free for individuals and companies with up to 3 employees; larger companies need a
[company license](https://www.remotion.pro/license). Check this before using it in production.

## Agent skills

Claude Code picks these up automatically when working in `motion/`:

- `remotion-*` (from [remotion-dev/skills](https://www.remotion.dev/docs/ai/skills)): correct Remotion APIs, captions, audio, transitions, rendering. Update with `npx remotion skills update`.
- `frontend-design` (from [anthropics/skills](https://github.com/anthropics/skills)): design taste, avoiding templated "AI" looks.
- `motion-style-directions` (ours): a menu of distinct video styles plus a `STYLE_LOG.md` so each new video uses a different direction.

Add more with `npx skills add <owner/repo> --skill <name> -a claude-code`, and read the skill before committing it, because skills run with full agent permissions.
