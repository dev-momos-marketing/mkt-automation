# Brief: review-reply (sample)

```
GOAL:     A restaurant GM feels the relief of a bad review answered well, fast, in their voice.
AUDIENCE: GMs and owners on Instagram Reels and LinkedIn mobile; sound off.
OUTPUT:   ReviewReply-9x16 (1080×1920). 4:5 and 16:9 cuts not built yet. 14s, 30fps, H.264 CRF 18.
TIME:     420 frames. 120 BPM grid: 15 frames per beat, 28 beats. Hard cuts on beats 16 and 24.
LOOK:     cream stage, ink type, momos red as the only accent, white cards with warm shadows.
          Layout on column916 (x 180–828, y 348–1188).
MOTION:   enter / move / exit / settle / premium tokens only. Constant drift 1.00→1.02–1.06 per shot.
SHOTS:    0–8s (beats 0–16)   Review: headline masks in (f0 mid-reveal), card lands b2, red star
                              pops b3, headline exits 2.75s, camera lifts the card and it steps
                              back to 0.88 (b6), reply box grows in, reply types from 4s (hero),
                              Send wakes when the text is done, pressed b14 → Sent.
          8–12s (beats 16–24) Scale: hard cut wide. Inbox rows already landing on f0; "Replied"
                              tags land on half-beats; "Every review, / answered." masks in.
          12–14s (beats 24–28) End card: wordmark masks in on f0, CTA lands +2f, URL +6f, drift.
COPY:     "A 1-star review / just landed." → "So sorry, Alex. / Friday got away from us. /
          Dessert's on the house." → "Every review, / answered." → momos / Book a demo / momos.com
DATA:     All reviews and the diner "Alex M." are ILLUSTRATIVE. No metrics shown.
          "momos drafted a reply" label: confirm it matches the product's real wording.
BANNED:   calibration list in momos-motion/SKILL.md.
GENERIC:  The default would be a centred "AI review replies" title on a purple gradient, three
          feature cards fading up, a bouncy logo. This instead shows one real moment (a bad
          review answered) in product UI, cut on a grid, with one accent.
QA:       frames 0,20,30,45,80,88,96,110,125,150,190,210,232,239,240,255,270,300,330,359,360,375,400,419; --safe.
```

## Review log

| Round | Critic verdict | Main notes | Changes |
|---|---|---|---|
| 1 | ITERATE (scores 3–6) | drift pushed cards outside the safe box; mismatched card widths; bright Send beside an empty box; empty reserved space and faded rows in the inbox scene; coral outside the CTA | 648px content column, camera push-in on typing, Send wakes when ready and is flat red, rows snap in, headline swaps in place |
| 2 | ITERATE (4–8) | push-in made the stack touch the box top and bottom; headline too high; swapped headline over an unchanged list | no push-in; lifted review card steps back to 0.88; column top 348; one two-line headline over 3 rows; trimmed to 14s |
| 3 | see final review in the hand-off | | |

## Open items

- Music: none yet. Pick a licensed 120 BPM track and add hits: card land (f30), star pop
  (f45), send (f210), cuts (f240, f360).
- Real reply UI: currently a recreation. Swap in ported product UI when available.
- Logo SVG for the end card.
- 4:5 and 16:9 compositions.
