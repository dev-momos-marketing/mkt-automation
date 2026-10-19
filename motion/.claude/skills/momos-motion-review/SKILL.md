---
name: momos-motion-review
description: Runs the strict review loop on a momos video. Renders stills, builds contact sheets, and has the frame-critic agent score them blind. Invoke manually with the composition id.
disable-model-invocation: true
---

# Review a momos video

Arguments: `<CompositionId>` and optionally a frame list.

1. Pick frames: 0, every shot boundary and boundary ±2, every hit (lands, presses, cuts),
   one mid-hold per shot, and the last frame. Read the scene files only to find those
   frame numbers.
2. Render: `npm run review -- <CompositionId> <frames> --safe` (in a cloud session, set
   `REMOTION_BROWSER_EXECUTABLE` first; see `momos-motion/references/gotchas.md`).
3. Spawn the `frame-critic` agent with only the paths to
   `out/review/<CompositionId>/sheet.png`, `phone.png` and `frames/`. Don't describe the
   video, the intent or the code to it: the critic must judge cold.
4. Report its score table and three worst problems verbatim.
5. If asked to fix: change only what those notes name, re-render only those frames
   (pass just those numbers), and re-run the critic. Stop at all scores ≥ 8 or after 3
   rounds; list what remains open.
6. Add anything new you learned to `momos-motion/references/gotchas.md`.
