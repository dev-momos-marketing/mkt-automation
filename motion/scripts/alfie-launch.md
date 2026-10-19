# Alfie launch video v2: script

**Format:** 34s, 16:9 (`AlfieLaunch`) and 9:16 (`AlfieLaunchVertical`). Cut to a 120 bpm grid (one beat = 15 frames), so a music track drops straight in. Works muted.
**One idea:** Guest problems pile up across every channel. Alfie answers each one and actually fixes it.
**Styles** (from the style library, chosen for energy and Momos fit):

| Scene | Style | Why |
|---|---|---|
| Hook, CTA | 1 Kinetic type (beat-cut) | Stops the scroll; one word per beat |
| Problem | 10 Notification cascade | Shows the volume problem as physical chaos |
| Reveal | 21 Cinematic premium (inverted) + 24 Liquid | The one dark, glowing moment: the product arrives |
| Proof | 5 Chat-native + 8 Exploded UI + 16 Hand-annotated | Shows what Alfie does *behind* the reply |
| Reach | 4 Typographic poster (marquee) | Channels as giant moving type |
| Handoff | 15 Line draw-on | Calm, clear: a path to your team |

Shared motion grammar keeps it one film: everything travels right-to-left, the chat bubble is the recurring motif, calm springs for UI, hard cuts for type.

> Guest name, order, store, points and the "Unanswered" counter are illustrative. No performance stats are claimed.

| # | Time | On screen | Voiceover (optional) |
|---|------|-----------|----------------------|
| 1 | 0:00–0:03 | **Beat cuts:** "9:47 PM" → "Order #4182" → "No fries." Then the guest's bubble slams in with a shake: *"My order just arrived and the fries are missing. Again."* | "Nine forty-seven PM. Order forty-one eighty-two. No fries." |
| 2 | 0:03–0:08 | **Cascade:** messages from every channel rain in faster and faster: a 1-star review, a survey, app chat, a delivery complaint. The counter climbs. **Every night, it piles up.** Then everything gets pulled into one point. | "Every night, it piles up. Reviews, surveys, chats, delivery apps." |
| 3 | 0:08–0:12 | **Reveal:** dark frame, light leak, glowing liquid shapes. Alfie's icon rises. **Meet Alfie.** *The Experience Agent from Momos.* | "Meet Alfie. The Experience Agent from Momos." |
| 4 | 0:12–0:23 | **Proof:** a live chat. As Alfie types, the interface explodes into 3D layers: the **order** (fries crossed out by hand), the **recovery policy** (highlighted), the **loyalty balance** (+200 counting up). Layers snap back; Alfie replies; the guest says thanks; **Resolved** gets circled. | "Alfie checks the order, applies your recovery policy, and adds the points, before the guest has closed the app." |
| 5 | 0:23–0:26 | **Reach:** four giant rows of type slide across the frame: Website chat / Mobile app / Post-visit surveys / Delivery apps. | "On every channel your guests use." |
| 6 | 0:26–0:29 | **Handoff:** a line draws from Alfie to your team and delivers a card: full conversation, order details, suggested next step. | "And when a person should step in, Alfie hands over the full story." |
| 7 | 0:29–0:32 | **Beat cuts:** "Resolve." → "Recover." → "Bring them back." End card: Momos logo, [Book a demo], momos.com/alfie. | "Resolve. Recover. Bring them back." |

## Before publishing

- [ ] Logos in `public/brand/` (`momos-logo.png`, `alfie.png`).
- [ ] Confirm CTA URL and button copy.
- [ ] Optional: a 120 bpm music bed under the voiceover (duck it to about -20 dB while lines play).

## Voiceover

Generated locally with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (open-source TTS), voice `af_heart`. Lines and start times live in `src/alfie/voiceover.json`; the table in the script above is the visual plan, this is what's actually spoken.

| Line | Starts | Spoken |
|---|---|---|
| 01-hook | 0.1s | Nine forty-seven. No fries. Again. |
| 02-cascade | 3.3s | Every night, it piles up. Reviews. Surveys. Chats. And nobody's answering. |
| 03-reveal | 8.4s | Meet Alfie. The Experience Agent from Momos. |
| 04-proof | 12.6s | While it types, Alfie checks the order, applies your recovery policy, and adds the points. |
| 05-proof-end | 20.0s | Before the guest has even closed the app. |
| 06-reach | 21.9s | On every channel your guests use. |
| 07-handoff | 24.7s | And when your team steps in, Alfie hands over the full story. |
| 08-resolve | 28.0s | Resolve. |
| 09-recover | 29.0s | Recover. |
| 10-bring | 30.0s | Bring them back. |
| 11-cta | 31.2s | Book a demo at momos dot com slash Alfie. |

To change a line or the voice: edit `src/alfie/voiceover.json` (or pass `--voice`), run `scripts/generate-voiceover.py` (setup steps in its header), then re-render. The script warns when a line won't fit before the next one.

Deliver with loudness normalized for social (-14 LUFS):

```bash
ffmpeg -i out/alfie-launch.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/alfie-launch-final.mp4
```
