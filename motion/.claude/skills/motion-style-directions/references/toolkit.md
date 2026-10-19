# Remotion toolkit inventory (v4.0.536)

Checked against the installed packages. For exact props, use the `remotion-docs` skill or https://www.remotion.dev/docs.
Install add-ons with `npx remotion add @remotion/<pkg>` so versions match.

## Rendering caveat: DOM vs canvas

Some tools draw through WebGL / HTML-in-canvas. They need a recent Chrome:
- Rendering: use Remotion's own Chrome Headless Shell (the default download) and `Config.setChromiumOpenGlRenderer("angle")`.
- The cloud sandbox's preinstalled Chromium (`/opt/pw-browsers/...`) is older, so **render a still of any canvas-based transition or effect before relying on it**. If it fails, fall back to the DOM option in the same row.
- Studio preview of HTML-in-canvas needs Chrome 149+ with `chrome://flags/#canvas-draw-element`.

## Transitions (`@remotion/transitions/<name>`)

| Name | Engine | Feel | Good for styles |
|---|---|---|---|
| `fade` | DOM | neutral | everything (default; don't overuse) |
| `slide` | DOM | directional push | 2 Swiss, 6 UI demo |
| `wipe` | DOM | graphic, editorial | 2 Swiss, 3 Editorial |
| `push-cut` | DOM | hard, rhythmic | 1 Kinetic, 19 Brutalist |
| `flip` | DOM | card turn | 8 Exploded UI, 20 Sticker |
| `iris` | DOM | spotlight reveal | 4 Poster, 21 Cinematic |
| `clock-wipe` | DOM | radial, playful | 4 Poster, 14 Shapes |
| `none` | DOM | straight cut | 1 Kinetic (cuts on beat) |
| `dissolve` | canvas | soft, filmic | 3 Editorial, 22 Lo-fi |
| `blur-slide` | canvas | soft directional | 6 UI demo, 21 Cinematic |
| `linear-blur` | canvas | whip pan | 1 Kinetic, 21 Cinematic |
| `zoom-blur` | canvas | speed burst | 10 Cascade → calm, 1 Kinetic |
| `zoom-in-out` | canvas | camera push | 6 UI demo, 12 Big number |
| `cross-zoom` | canvas | energetic | social teasers |
| `dreamy-zoom` | canvas | dreamy, soft | 21 Cinematic, 24 Liquid |
| `crosswarp` | canvas | morphing | 24 Liquid |
| `ripple` | canvas | water, organic | 24 Liquid |
| `film-burn` | canvas | analog film | 22 Lo-fi |
| `book-flip` | canvas | page turn | 3 Editorial, 17 Collage |
| `swap` | canvas | card swap | 8 Exploded UI |
| `cube` | paid | 3D rotate | (needs a paid license) |

Overlays (`<TransitionSeries.Overlay>`) play over a cut without shortening the timeline. Use them for light leaks or a flash frame.

## Effects (`@remotion/effects/<name>`)

Apply via the `effects={[...]}` prop on `<Img>`, `<CanvasImage>`, `<Solid>`, `<Video>`, `@remotion/shapes` components, or wrap HTML in `<HtmlInCanvas>`. They run in order, and all are canvas-based (see the caveat above).

| Group | Effects | Typical use |
|---|---|---|
| Color | `color-correction`, `lut`, `exposure`, `white-balance`, `contrast`, `saturation`, `vibrance`, `levels`, `shadows-highlights`, `hue`, `tint`, `duotone`, `grayscale`, `invert`, `linear-gradient-tint` | grading footage (26), duotone print (18), "old way" desaturation |
| Blur & focus | `blur`, `region-blur`, `linear-progressive-blur`, `radial-progressive-blur`, `zoom-blur`, `drop-shadow`, `glow` | UI focus (6), depth of field (8), cinematic glow (21) |
| Texture | `noise`, `white-noise`, `paper`, `burlap`, `flannel`, `speckle`, `roughen-edges` | grain (22), paper collage (17) |
| Print & pattern | `halftone`, `halftone-linear-gradient`, `dot-grid`, `lines`, `gridlines`, `checkerboard`, `pattern`, `tile`, `mirror` | risograph (18), Swiss grid (2), poster repeats (4) |
| Distort | `wave`, `waves`, `zigzag`, `fisheye`, `barrel-distortion`, `noise-displacement`, `liquid-contours`, `skew`, `corner-pin`, `shrinkwrap`, `translate`, `scale` | liquid (24), screen replacement (7), speed (1) |
| Retro / signal | `scanlines`, `chromatic-aberration`, `tear`, `tv-signal-off`, `pixelate`, `pixel-dissolve`, `linear-progressive-pixelate`, `radial-progressive-pixelate`, `thermal-vision` | CRT / "old way" (23) |
| Light | `light-leak`, `light-trail`, `shine`, `starburst`, `rings`, `vignette`, `evolve` | cinematic (21), big-number accents (12) |
| Line & outline | `outline`, `contour-lines`, `emboss`, `venetian-blinds` | line art (15), sticker outlines (20) |
| Keying | `color-key` | green-screen testimonials (27) |

## Add-on packages

| Package | What it adds | Styles |
|---|---|---|
| `@remotion/shapes` | SVG Circle, Rect, Triangle, Star, Pie, Polygon, Heart, Arrow, Callout, Spark | 9, 14, 16 |
| `@remotion/paths` | `evolvePath` (draw-on), `interpolatePath` (morph), `getPointAtLength` (move along path) | 6 cursor, 9, 11, 14, 15 |
| `@remotion/noise` | `noise2D/3D/4D` for organic, deterministic motion | 22 shake, 24 liquid |
| `@remotion/rough-notation` | hand-drawn highlights, circles, underlines, brackets | 11, 16 |
| `@remotion/motion-blur` | `HtmlInCanvasMotionBlur` (frame-sampled blur) | 1, 21 |
| `@remotion/three` | React Three Fiber in `<ThreeCanvas>` | 7, 25 |
| `@remotion/lottie` / `@remotion/rive` | play designer-made animations frame-accurately | 25, icon animations anywhere |
| `@remotion/gif` / `<AnimatedImage>` | GIF, APNG, WebP | 20 stickers |
| `@remotion/media` | `<Video>`, `<Audio>` with trimming, volume curves | 22, 26, 27 |
| `@remotion/media-utils` | audio data, `visualizeAudio`, waveforms | 28 |
| `@remotion/captions` (+ `openai-whisper`, `elevenlabs`) | transcription, word timing, TikTok-style caption pages, voiceover | 27, 28, any VO |
| `@remotion/layout-utils` | `measureText`, `fitText` | 1, 4, 5 |
| `@remotion/animation-utils` | interpolate CSS strings (colors, transforms) | everywhere |
| `@remotion/skia` | Skia canvas drawing | custom shaders |
| Maps (`remotion-maps` skill) | MapTiler / Cesium map animations | 13 |

## Built into `remotion`

`interpolate`, `spring`, `Easing` (bezier, spring), `interpolateColors`, `random(seed)` (deterministic randomness), `<Sequence>`, `<Series>`, `<Loop>`, `<Freeze>`, `staticFile`, `<Img>`, `<CanvasImage>`, `<Solid>`, `<HtmlInCanvas>`, `delayRender` / `continueRender` for async assets.
Never use CSS `transition` / `animation` or Tailwind animation classes: they don't render frame-accurately.
