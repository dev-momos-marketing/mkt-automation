# Arrowsterr v2: "You need a navigator"

**Format:** ~52s, 16:9 and 9:16, 30fps. Works muted (on-screen text carries every beat).
**Tone:** a friend talking you through it. Short lines, questions, a little wit. Brand voice rules hold: "you", digits, no em dashes, no emoji, no "not X, Y", no lists of three.
**Concept:** Arrowsterr is the Navigator (arrow for direction, star for arrival). The film is **one continuous shot** across a giant flight grid. A Signal Blue **route line** with a glowing arrowhead flies from station to station, and the camera rides with it. Each station is one step from invisible to visible. The route ends where the star is: your name on the AI shortlist.
**Sources:** product claims, step names and sample data come from the arrowsterr.com homepage. The 0% to 60% climb, the engine scores and the final shortlist are illustrative.

## The through-line

- **The route:** a 6px `signal` line that draws itself between stations, with a comet-trail arrowhead (motion-blurred copies) and a soft blue wake. It never points down or left.
- **The camera:** one virtual camera over a 3x-size world. It glides, banks and dives between stations instead of cutting.
- **Your brand chip:** `tablely.com` starts as a dashed ghost, gets "decoded" as the platform works, and arrives solid on the shortlist.
- **The meter:** a rolling odometer (digits spin like a flight board) that climbs from 0% to 60% along the way.

## Script

| # | Time | Voiceover | Picture | WOW moment |
|---|------|-----------|---------|------------|
| 1 | 0:00 | "Quick question." | Black-to-grid fade. A single blinking cursor in the middle of an empty flight grid. | Cursor blink is the only thing moving: a calm, techie cold open. |
| 2 | 0:02 | "When your buyers need new software, what do they do?" | The cursor types the buyer's prompt into an AI chat bar: *"best review software for small cafes"*. | Each word **decodes** in from scrambled mono glyphs, like a terminal. |
| 3 | 0:06 | "They ask AI. And AI hands them a shortlist." | The answer streams in. Three brand cards (Revora, Guestly, Plateful) **deal** onto the table one by one, like cards with a snap. | Card-deal motion with a sharp snap on each landing, synced to the beat. |
| 4 | 0:10 | "So. Are you on it?" | Camera pushes in on an empty fourth slot. A dashed ghost of `tablely.com` flickers inside. Target ticks lock on. | Ghost **flicker**: the chip glitches in and out like a dropped signal. |
| 5 | 0:13 | "Let's check. ChatGPT. Claude. Gemini. Perplexity. Google's AI." | Camera pulls back fast. The prompt fires out as 6 beams to 6 engine nodes arranged in an arc. Each node lights up as it's named. | **Radar sweep**: a scanning arc passes over the nodes, each one pinging with sonar rings. |
| 6 | 0:18 | "Not a single mention. You're invisible." | Every node returns a red "Not named". The ghost chip dissolves into drifting dots. Odometer rolls to **0%**. | **Pixel dissolve** of the chip into the dot grid itself. |
| 7 | 0:21 | "Good news. You just need a navigator." | Silence for a beat. A Signal Blue arrowhead appears at the left edge and the route line starts to draw. | The route's first stroke: the moment the film's "engine" switches on. |
| 8 | 0:24 | "Meet Arrowsterr." | The route sweeps up into the logo: two chevrons climb out of the line and the sparkle lands on top. | **Logo build from the route itself**, then a single clean shockwave ring. |
| 9 | 0:26 | "The end-to-end agentic SEO and GEO platform that takes you from invisible to visible." | Headline types in with the payoff in blue. The route races ahead and drops 4 waypoint pins: See, Find, Plan, Create. | Waypoints **pin-drop** onto the grid; the camera banks to follow the route. |
| 10 | 0:32 | "First, it shows where AI names your rivals instead of you." | **Station 01 See.** The engine arc returns as live bars. Gap rows peel off the answers. **14 gaps found**. | Gap rows **peel up** like stickers and hang in the air. |
| 11 | 0:36 | "Then it turns every gap into keywords people really search." | **Station 02 Find.** One gap row is pulled into a funnel and comes out the other side as keyword rows with volumes. | **Funnel morph**: the row compresses into a stream of particles that re-form as a table. |
| 12 | 0:40 | "Its AI agent ranks them by revenue and plans your month." | **Station 03 Plan.** Topic cards shuffle themselves into value order, then fly into a Mon to Fri calendar. **$8.4k/mo**. | **Auto-sort shuffle** with cards swapping places in mid-air; odometer rolls the dollar total. |
| 13 | 0:44 | "And the Agentic Writer drafts the pages. Built for Google. Built for AI." | **Station 04 Create.** A page writes itself line by line. Scores fill to **92** and **88**. | **Page fold**: the finished page folds itself into a paper arrow. |
| 14 | 0:48 | "Ship it." | The paper arrow launches along the route, back toward the AI chat. | **Launch**: a whip-pan with motion blur as the camera chases the arrow. |
| 15 | 0:49 | "Next morning, ask again. There you are." | The arrow hits the fourth slot. `tablely.com` locks in, solid, at #2. The odometer lands on **60%**. | **The Spark**: one gold four-point star bursts with light rays and a warm light leak. The only gold in the film. |
| 16 | 0:52 | "Arrowsterr. Get named in AI answers. Start free today." | The camera rises off the grid into the Night panel. The Climb watermark rises behind the headline and the notched **Start free trial** button. | **Chevron wipe**: a giant Climb mark sweeps up the frame to reveal the Night close. |

## The WOW effects and how they're built

All of these are DOM and SVG effects, so they render anywhere, including this cloud sandbox.

| Effect | Build |
|---|---|
| Continuous camera | One "world" layer 3x the frame; camera = `translate` + `scale` + slight `rotate` keyframed per voice cue with the brand ease. |
| Route line + comet arrowhead | `@remotion/paths` `evolvePath` for the line; arrowhead placed with `getPointAtLength` + `getTangentAtLength`; 6 trailing copies with falling opacity as the motion blur. |
| Decode text | Characters cycle through random mono glyphs (seeded `random()`) before settling, left to right. |
| Card deal | Cards fly in from off-frame with rotation that settles to 0 on a hard stop (no bounce), plus a 2-frame scale snap. |
| Radar sweep + sonar pings | A rotating SVG wedge masked over the engine arc; rings expand from each node as the sweep passes. |
| Glitch flicker / pixel dissolve | Chip opacity driven by seeded noise; dissolve splits the chip into a grid of squares that drift and fade into the dot grid. |
| Funnel morph | Row text splits into dots that travel along converging bezier paths, then re-form as the table. |
| Auto-sort shuffle | Cards animate between list positions with a lift (`translateZ` + shadow-free scale) while they cross. |
| Page fold into paper arrow | Page split into triangles with CSS 3D `rotateX/rotateY`, collapsing into a chevron shape. |
| Odometer | Each digit is a vertical strip of 0 to 9 sliding to its value, mono and tabular. |
| Spark burst | Gold star scales in with 8 thin rays; a WebGL `lightLeak` on a `<Solid>` (verified to render here), hue-shifted to gold, screen-blended. |
| Chevron wipe | A custom `TransitionSeries` presentation: the Climb path as a growing mask from bottom to top. |

## Brand notes

- Colour, type and copy rules hold everywhere: greys and the flight grid carry the frame, Signal Blue for the route and payoff words, gold only at the Spark, Night only at the close, every number in Geist Mono.
- **One deliberate bend:** the website's motion rules (no spins, no parallax) are relaxed for the film's camera moves, radar sweep and page fold. Everything still travels up or right, and nothing bounces.

## Sound

- Calm electronic at 120 bpm with a story arc: near silence and a ticking clock for the cold open, card-snap clicks on the deal, sonar pings on the radar, a deep pulse under "You're invisible", then a clean drop on "Meet Arrowsterr".
- Through the stations: a driving groove with a pluck arpeggio. A whoosh on the launch, one bright chime on the Spark, and a resolve on the close.
- Voice: warm, conversational, smiling on "Good news" and "There you are".
