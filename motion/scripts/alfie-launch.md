# Alfie launch video v2: script

**Format:** 35.5s, 16:9 (`AlfieLaunch`) and 9:16 (`AlfieLaunchVertical`). Cut to a 120 bpm grid (one beat = 15 frames), so a music track drops straight in. Works muted.
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

- [x] Logos in `public/brand/` (`momos-logo.png`, `alfie.png`).
- [ ] Confirm CTA URL and button copy.

## Soundtrack

Built by `scripts/build-soundtrack.py` (setup in its header):

1. **Voiceover**: each phrase in `src/alfie/voiceover.json` is spoken by Kokoro (open-source TTS, voice `af_heart`) and measured.
2. **Sync**: phrases are placed on the timeline and the animation beats that depend on speech are derived from them (`src/alfie/timeline.json`). The order / policy / points layers land as each is named, cascade cards pulse on "Reviews / Surveys / Chats", cards vanish on "Nobody answers", the hand-off draws on "Alfie hands over". Edit a phrase and the animation follows.
3. **Music**: an original stadium-anthem bed composed in code on the 120 bpm grid: stomp-stomp-clap, distorted power chords (D minor, i–VI–III–VII), a clean pad and a tech arpeggio for the corporate side. Riser into the reveal, a big hit as the iris opens, one hit per CTA word, and a D major lift on the end card.
4. **Mix**: music ducked under every line, written to `public/audio/alfie-mix.wav`.

| Time | Scene | Spoken |
|---|---|---|
|  0.1s | hook | Nine forty-seven. |
|  1.0s | hook | No fries. |
|  2.1s | hook | Again. |
|  3.6s | cascade | Every night, it piles up. |
|  5.2s | cascade | Reviews. |
|  6.0s | cascade | Surveys. |
|  6.8s | cascade | Chats. |
|  7.5s | cascade | Nobody answers. |
|  8.9s | reveal | Meet Alfie. |
|  9.8s | reveal | The Experience Agent from Momos. |
| 13.1s | proof | While it types, |
| 14.1s | proof | Alfie checks the order, |
| 15.4s | proof | applies your recovery policy, |
| 17.1s | proof | and adds the points. |
| 19.4s | proof | Before the guest has even closed the app. |
| 22.8s | reach | On every channel your guests use. |
| 25.6s | handoff | And when your team steps in, |
| 27.0s | handoff | Alfie hands over the full story. |
| 29.5s | cta | Resolve. |
| 30.5s | cta | Recover. |
| 31.5s | cta | Bring them back. |
| 32.7s | cta | Book a demo at momos dot com slash Alfie. |

Deliver with loudness normalized for social (-14 LUFS):

```bash
ffmpeg -i out/alfie-launch.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k out/alfie-launch-final.mp4
```
