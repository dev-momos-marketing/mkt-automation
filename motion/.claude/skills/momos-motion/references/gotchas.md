# Gotchas

Add a line after every video: what went wrong, how you noticed, the fix.

- **Cloud sessions can't download Chrome Headless Shell** (remotion.media is blocked).
  Set `REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
  (or pass `--browser-executable`). `scripts/render_review.sh` honours the variable.
- **Interactive schema number fields need `hiddenFromList: false`** in Remotion 4.0.536,
  or `Interactive.create()` fails to typecheck.
- **Exits must finish before a camera move crosses them.** review-reply round 1: the
  headline was still lifting out at f96 while the card moved up into it. Start the exit
  ≥ 8 frames before the move.
- **Measure, don't estimate, element heights.** The review card was 482px, not the 454px
  estimated, which left a 6px gap to the composer. Read edges from a rendered still
  (PIL row scan) before placing stacked elements.
- `--frames=0,45,100` with `--sequence` renders a list of stills in one bundle; far faster
  than one `remotion still` call per frame.
- **Camera drift and push-ins scale everything outward.** review-reply round 1: content
  placed flush to the safe box (x 120–888) drifted to x 108–898 at scale 1.03. Lay out on
  `column916` (x 180–828), which leaves 60px for drift and a ~1.09 push-in.
- **Disabled-looking buttons until they're useful.** A bright "Send" button beside an
  empty reply box stole the focal point (critic round 1, f110). Keep it blush/muted until
  the text is done, then wake it up.
- **Rows that snap in beat rows that fade in.** Opacity ramps over 4+ frames read as grey,
  half-faded cards on the first frame of a cut. Ramp opacity over 2 frames, or start the
  entrance before frame 0 so the first frame is already solid.
- **Write line breaks into copy** (`"\n"` with `whiteSpace: "pre-line"`). Browser wrapping
  left "on us." alone on a fourth line and pushed the composer toward the safe edge.
- **Reserved empty space reads as a mistake.** A gap kept free for a headline that arrived
  2s later looked like a layout bug. Swap lines in place instead.
- **A push-in can't fit a full-height stack.** Round 2: a 1.07 push-in on a 900px stack
  touched the safe box top and bottom. To give the hero the frame, step the context back
  (scale it to ~0.88) instead of pushing the camera in.
- **A full review loop costs real time.** review-reply took 3 critic rounds; each render of
  ~24 stills is ~15s and the final 14s MP4 renders in ~30s in a cloud session.
