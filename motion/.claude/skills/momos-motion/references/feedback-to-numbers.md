# Feedback to numbers

Notes must be numeric and few: `frame N: what is wrong: the number that changes`.
"It feels off" is not a note. Translate vague feedback with this table, apply 1–3 changes
per round, re-render only the frames involved.

| Feedback | Change |
|---|---|
| "Make it pop" | scale 1.0 → 1.08 → 1.0 over 6 frames, peak on the beat (1.15–1.2 for small elements) |
| "More premium" | `enter` easing, `premium` spring (ratio 0.8), no overshoot on text, +20% duration |
| "Snappier" | enter 0.6s → 0.45s, exit 0.27s → 0.2s, stagger 60ms → 40ms |
| "It drags" | cut each hold by one beat; check holds against the 13 chars/s floor first |
| "Too busy" | one hero; others start 150ms later and travel 60% as far, or remove them |
| "Too static" | add constant drift 1.00 → 1.03; make sure frame 0 and the end card move |
| "Looks like AI" | name each default you can see (see the calibration list) and replace it |
| "Feels cheap" | check for fades as entrances, default springs, uniform timing, centred-everything |
| "Hard to read on my phone" | check phone.png; raise type to floors; crop closer to the UI |
| "Doesn't hit the music" | recompute cuts from beat indices with `beat()`; land hits on downbeats |

Push key poses 10–30% further than feels right: the feed plays everything small.
