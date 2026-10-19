# Sound sync

Claude cannot hear. A person picks the music and the voice by ear; Claude handles the
arithmetic and placement.

- **Frames per beat = fps × 60 / BPM.** 120 BPM @30fps = 15 frames; 100 BPM = 18;
  128 BPM = 14.06. Use `beat(n, fps, bpm)` from `theme.ts`: compute every cut from its
  beat index; never add up rounded durations (they drift).
- At 120 BPM a beat is 0.5s, so whole and half seconds are already on the grid.
- Cuts land on beats; the big reveal lands on a downbeat (beat 1 of a bar).
- A whoosh peaks on the cut frame (starts 6–10 frames before). Impacts land exactly on
  the hit; 50ms early reads as sloppy. Clicks and ticks 1 frame after the picture event.
- SFX sit 3–6 dB over the music bed. Don't put a whoosh on every cut.
- Master to −14 LUFS integrated, true peak ≤ −1 dBFS.
- Put audio in `public/audio/` and add it with `<Audio>` from `@remotion/media`
  (see the `remotion-markup` skill's `audio.md` and `sfx.md`).
- Music and voice need a commercial licence. ElevenLabs' free plan is non-commercial.
