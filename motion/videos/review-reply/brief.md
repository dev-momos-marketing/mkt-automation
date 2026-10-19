# Brief: review-reply (sample)

```
GOAL:     A restaurant GM feels the relief of a bad review answered well, fast, in their voice.
AUDIENCE: GMs and owners on Instagram Reels and LinkedIn mobile; sound off.
OUTPUT:   ReviewReply-9x16 (1080×1920). 4:5 and 16:9 cuts not built yet. 13s, 30fps, H.264 CRF 18.
TIME:     390 frames. 120 BPM grid: 15 frames per beat, 26 beats. Hard cuts on beats 16 and 22.
LOOK:     cream stage, ink type, momos red as the only accent, white cards with warm shadows.
          Layout on column916 (x 180–828, y 348–1188).
MOTION:   enter / move / exit / settle / premium tokens only. Constant drift 1.00→1.02–1.06 per shot.
SHOTS:    0–8s (beats 0–16)   Review: headline masks in (f0 mid-reveal), card lands b2, red star
                              pops b3, headline exits 2.75s, camera lifts the card and it steps
                              back to 0.88 (b6), reply box grows in, reply types from 4s (hero),
                              Send wakes when the text is done, pressed b14 → Sent.
          8–11s (beats 16–22) Scale: hard cut wide. Headline mid-reveal on f0, rows land 60ms
                              apart, "Replied" tags land on half-beats.
          11–13s (beats 22–26) End card: wordmark masks in on f0, CTA lands +2f, URL +6f, drift.
COPY:     "A 1-star review / just landed." → "So sorry, Alex. / Friday got away from us. /
          Dessert’s on the house." → "Every review, / answered." → momos / Book a demo / momos.com
DATA:     All reviews and the diner "Alex M." are ILLUSTRATIVE. No metrics shown.
          "momos drafted a reply" label: confirm it matches the product's real wording.
BANNED:   calibration list in momos-motion/SKILL.md.
GENERIC:  The default would be a centred "AI review replies" title on a purple gradient, three
          feature cards fading up, a bouncy logo. This instead shows one real moment (a bad
          review answered) in product UI, cut on a grid, with one accent.
QA:       frames 0,45,110,186,190,194,210,239,240,244,250,262,300,329,330,360,389; --safe.
```

## Review log

| Round | Critic verdict | Main notes | Changes |
|---|---|---|---|
| 1 | ITERATE (scores 3–6) | drift pushed cards outside the safe box; mismatched card widths; bright Send beside an empty box; empty reserved space and faded rows in the inbox scene; coral outside the CTA | 648px content column, camera push-in on typing, Send wakes when ready and is flat red, rows snap in, headline swaps in place |
| 2 | ITERATE (4–8) | push-in made the stack touch the box top and bottom; headline too high; swapped headline over an unchanged list | no push-in; lifted review card steps back to 0.88; column top 348; one two-line headline over 3 rows; trimmed to 14s |
| 3 | ITERATE (6–8; readability 8) | inbox scene static ~3s; drift pushed end card into the 60px margin; Send crossfaded through coral; straight apostrophe; review card narrower than reply card | stop rule reached. Applied the objective fixes (button snaps, curly apostrophe, gentler drift, rows stagger in, inbox scene 4s→3s, total 13s). Left open: card width mismatch is a deliberate step-back (taste call); top-heavy f45 |

## Open items

- Music: none yet. Pick a licensed 120 BPM track and add hits: card land (f30), star pop
  (f45), send (f210), cuts (f240, f360).
- Real reply UI: currently a recreation. Swap in ported product UI when available.
- Logo SVG for the end card.
- 4:5 and 16:9 compositions.
