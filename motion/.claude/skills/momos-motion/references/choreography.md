# Choreography

Rhythm comes from a sequence of shots with cuts, not from animating properties inside
one scene. Flatness comes from shot scale never changing.

## Shots

- One hero per shot. Count the things moving as the main subject on each still; more
  than one is the most common failure.
- Change shot scale at least every other cut: close on UI → wide on the inbox → logo.
- Every 2–4s something new appears. No hold longer than one bar (4 beats) without a
  micro push (scale 1.00 → 1.03–1.04).
- Frame 0 is never empty: start the first reveal at a negative frame (`enterAt={-6}`) so
  the thumbnail already shows the idea.
- The hook (problem first, product second) is readable by 2s.
- End card ≤ 2s, already moving on its first frame, never static.

## Cuts and hand-offs

- Prefer hard cuts on a beat. Cut on motion: the outgoing shot is still moving when it
  cuts, and the incoming shot is already moving on its first frame.
- Continuity: when the same object lives in two shots (the review card), move it with the
  camera instead of cutting.
- Plain fade-to-black or crossfade between scenes reads as a slideshow. Use them only for
  a deliberate time jump.
- Before a camera move, clear what the moving element will cross: exits must finish
  before the move starts (a 0.27s exit needs to start ≥ 8 frames earlier).

## Allowed entrances

- rise through a mask (`kit/MaskLine`), default for type
- grow from a source (a reply grows out of the review it answers)
- type-on with human rhythm (`kit/ReplyComposer`)
- build from skeleton to content (UI loads in)
- land with `premium` spring from 90–180px below, opacity to 1 in the first 4–6 frames

## Allowed exits

- lift through the top of a mask, get covered, get pushed by the next element,
  collapse into the next shot, or a hard cut.
- A pure opacity fade is never an entrance or exit for a hero element.

## Hierarchy

- Decide what the viewer notices first in each shot and build the frame around it.
- Real product UI is the hero; crop hard into the part that matters. A full dashboard is
  unreadable at 9:16.
- The cursor, if used, moves with `move` easing and pauses before a click.
