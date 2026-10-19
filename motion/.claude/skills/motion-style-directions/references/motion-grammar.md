# Motion grammar

Shared craft rules that make any style feel intentional. Frames assume 30fps; derive from `fps` in code.

## Easing palette

Pick one primary curve per video, and it should match the style.

| Name | Code | Character | Styles |
|---|---|---|---|
| Calm (default) | `Easing.bezier(0.16, 1, 0.3, 1)` | fast start, long soft settle | 6, 8, 11, 15 |
| Calm spring | `spring({ config: { damping: 200 } })` | same feel, physics-based | 5, 6, 12 |
| Snap | `Easing.bezier(0.7, 0, 0.3, 1)` | decisive, mechanical | 2, 9 |
| Editorial | `Easing.bezier(0.45, 0, 0.55, 1)` | symmetrical, slow | 3, 22 |
| Playful | `spring({ config: { damping: 10, stiffness: 120 } })` | visible overshoot | 14, 20, 25 |
| Impact | none (`push-cut` / instant), then 2–3 frame shake | hard | 1, 19 |
| Stop-motion | `Math.floor(frame / 3) * 3` as the animation frame | handmade steps | 17, 18 |
| Organic | `noise2D(seed, frame * 0.01)` | continuous drift | 22, 24 |

## Timing

| Thing | Frames at 30fps |
|---|---|
| Element entrance | 12–20 |
| Exit | 8–12 (exits are faster than entrances) |
| Stagger between siblings | 3–6 |
| Scene transition | 10–20 |
| Reading hold | 0.3s per word + 1s (min ~1.5s) |
| Hero / reveal hold | 45–90 |
| Beat cut at 120 bpm | every 15 frames (90 bpm: 20, 128 bpm: 14) |

## Camera moves (fake them with transforms)

- **Push-in:** scale 1→1.08 across a scene. Adds tension and focus.
- **Zoom-to-region:** scale and translate so one UI element fills the frame, then return.
- **Parallax:** layers move at 1x / 0.6x / 0.3x by depth.
- **Whip pan:** `linear-blur` transition, or translate 100% in 6 frames with motion blur.
- **Rack focus:** blur the foreground layer and sharpen the background (`blur` effect or CSS filter).
- **Match cut:** end scene A on a shape (a circle, a bubble) and start scene B on the same shape in the same place.

## Composition rules

- One focal point per frame; everything else is quieter (smaller, grayer, blurred or still).
- Consistent direction of travel: content enters from one side and leaves the other for the whole video.
- Motion has a reason: it reveals, connects, transforms or emphasizes. Cut decoration that does none of these.
- One hero moment per scene; one signature move per video that viewers remember.
- Safe areas: ≥5% margins; 9:16 keeps the top ~250px and bottom ~400px clear.
- Explicit line breaks for headlines; never let auto-wrap leave an orphan word.
- Design for muted autoplay first; sound is a bonus layer (`sfx` for UI pops, a music bed at -18 to -24 LUFS under VO).

## Variety levers (when two videos would look alike)

Change at least three:
1. Base: beige / white / cream / inverted ink.
2. Scale: huge type vs. small type in lots of space.
3. Alignment: centered / flush-left / grid-locked / off-frame crop.
4. Easing family (table above).
5. Transition family (DOM graphic vs. canvas filmic vs. straight cuts).
6. Texture: clean / grain / paper / halftone.
7. Subject: UI / people and footage / data / illustration / pure type.
8. Pace: 3 cuts per second vs. one slow continuous shot.
