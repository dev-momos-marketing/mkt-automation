# Motion tokens

No approximated values. Every curve, duration and spring comes from this table, and the
same values live in `src/brand/theme.ts`. If a shot needs a value that is not here, add
it to both files with a one-line reason instead of improvising inline.

## Easing (`ease.*` in theme.ts)

| Token | Value | Use for | Why |
|---|---|---|---|
| `enter` | `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) | anything arriving: text, cards, UI | Fast start puts the change on screen the moment the eye looks; long settle reads as premium. Remotion's own canonical reveal curve. |
| `move` | `cubic-bezier(0.77, 0, 0.175, 1)` | on-screen repositioning, camera moves, mask wipes | Symmetric in-out: an object already on screen should accelerate and decelerate. |
| `exit` | `cubic-bezier(0.7, 0, 0.84, 0)` | leaving | Accelerates away. Exits run at ~45% of the entrance duration. |
| `settle` | `Easing.spring({damping: 200})` | text, opacity, UI state | No overshoot. Text must never wobble. |
| `premium` | `Easing.spring({stiffness: 100, damping: 16})` | cards and shapes landing | Damping ratio 0.8: ≈1.5% overshoot, felt rather than seen. |

Never: CSS `ease`/`ease-in-out` defaults (too weak), `ease-in` on an entrance (delays the
moment the viewer is watching), linear on anything but constant drift (camera push,
tickers, progress bars), Remotion `spring()` with defaults (damping ratio 0.5, ≈16%
overshoot). A playful bounce (damping ratio 0.4–0.6) is allowed for one accent per video
and only when the brief asks.

Damping ratio = `damping / (2 × √(stiffness × mass))`. At stiffness 100, mass 1:
damping 10 → 0.5 (bouncy), 16 → 0.8 (premium), 20 → 1.0 (critical, no overshoot).

## Durations (`dur.*`, seconds)

| Token | Seconds | @30fps | Use |
|---|---|---|---|
| `micro` | 0.2 | 6 | button press, tick, toggle |
| `pop` | 0.2 | 6 | emphasis: scale 1 → 1.08–1.18 → 1 (push further for small elements) |
| `exit` | 0.27 | 8 | leaving |
| `enter` | 0.6 | 18 | standard arrival |
| `move` | 0.7 | 21 | camera and repositioning |
| `hero` | 0.8 | 24 | the one big reveal |

Secondary elements travel 50–70% of the hero's distance and start 100–200ms (3–6
frames) after it. Constant camera drift: scale 1.00 → 1.03 over the whole shot, linear.

## Stagger

| What | Offset | Cap |
|---|---|---|
| letters | 1 frame | only for a single short word |
| words | 60–120ms | headlines of 3–8 words only |
| list items / rows | 40–80ms (`dur.stagger` = 60ms) | whole stagger < 500ms |
| rhythmic ticks | on beats or half-beats (250ms at 120 BPM) | deliberate choreography, not a list entrance |

No more than a third of elements in motion at once. Everything entering together is a
named failure.

## Scale and opacity

- Nothing appears from nothing: start at scale 0.90–0.97 with opacity 0, never `scale(0)`.
- Opacity reaches 1 within the first 25–40% of a movement; never fade slowly while moving.
- Use `output: "perceptual-scale"` in `interpolate()` for scale animations larger than 2×.
