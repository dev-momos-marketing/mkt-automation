# momos-motion

momos marketing videos built with [Remotion](https://remotion.dev) and directed by Claude Code.

## Start

```bash
cd motion
npm install
npm run dev            # Remotion Studio in the browser
claude                 # in a second terminal
```

Then ask Claude for a video. The house skill (`.claude/skills/momos-motion`) runs the brief →
shot list → build → review loop. Example:

> Use the momos-motion skill. Make a 15s 9:16 ad for AI review replies. Goal: a restaurant GM
> feels the relief of a 1-star review answered well in seconds. Fill brief.md and show me the
> shot list on the beat grid. No code yet.

## What's here

| Path | What |
|---|---|
| `src/brand/theme.ts` | colours, type, easing, durations, beat grid, safe zones: the only place values live |
| `src/brand/fonts.ts` | Poppins, loaded locally from `public/fonts/` |
| `src/kit/` | reusable pieces: `MaskLine`, `ReviewCard`, `ReplyComposer`, `InboxRow`, `Stars`, `SafeZoneOverlay` |
| `src/videos/review-reply/` | sample 13s 9:16 ad (rendered: `samples/review-reply-9x16.mp4`) |
| `videos/<slug>/brief.md` | the brief for each video |
| `brand/brand.md` | brand values for video, open items, claims table |
| `.claude/skills/momos-motion/` | house taste skill: tokens, choreography, specs, formats, gotchas |
| `.claude/skills/momos-motion-review/` | `/momos-motion-review <CompositionId>`: blind critic loop |
| `.claude/agents/frame-critic.md` | the critic: scores frames, never reads code |
| `.claude/skills/remotion-*` | official Remotion skills (vendored, `skills-lock.json`) |
| `scripts/render_review.sh` | stills + labelled contact sheet + phone-size sheet |
| `scripts/lint_motion.mjs` | fails on hard-coded colours, easings, CSS animation, randomness |

## Review a video

```bash
npm run review -- ReviewReply-9x16 0,45,90,210,270,390,449 --safe
# → out/review/ReviewReply-9x16/sheet.png and phone.png
```

## Render

```bash
npx remotion render ReviewReply-9x16 out/review-reply-9x16.mp4
```

In a Claude Code cloud session, Remotion can't download its Chrome. Use the preinstalled one:
`export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
and add `--browser-executable=$REMOTION_BROWSER_EXECUTABLE` to `remotion render`.

## Before real campaigns

- **Remotion Company License**: Remotion is free only for companies of up to 3 people.
- Logo SVG at `public/brand/logo.svg`, official brand guide, licensed music.
- Real product UI (port it into `src/kit/`) and an approved claims table in `brand/brand.md`.
