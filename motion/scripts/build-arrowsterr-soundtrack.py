"""Build the Arrowsterr v3 soundtrack: voiceover, synced timeline, original music, mix.

Voiceover is the master clock (see build-soundtrack.py for the pipeline). The score is
an original big-room build on the 120 bpm grid: a quiet techie intro, a snare-roll
build into a drop on "Meet Arrowsterr", a driving groove under the product stations,
a second drop on "Recommended", and a final chord. Sound effects (keystrokes, card
snaps, sonar pings, stamps, glass, whooshes, sonic boom, split-flap clacks, chime) are
placed from the same cue sheet the animation reads.

Run from motion/ (setup in build-soundtrack.py's header):
  .venv-tts/bin/python scripts/build-arrowsterr-soundtrack.py --models <dir>
"""

import argparse
import importlib.util
import json
import math
import pathlib

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("alfie_soundtrack", HERE / "build-soundtrack.py")
base = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(base)
SR, FPS, BEAT = base.SR, base.FPS, base.BEAT
env, filt, noise = base.env, base.filt, base.noise

ROOT = HERE.parent
VO_CONFIG = ROOT / "src/arrowsterr/voiceover.json"
TIMELINE = ROOT / "src/arrowsterr/timeline.json"
OUT = ROOT / "public/audio"

# Scenes play back to back (the camera "pans" between them inside each scene's own
# first and last frames). Keep in sync with src/arrowsterr/ArrowsterrLaunch.tsx.
SCENES = ["ask", "shortlist", "engines", "invisible", "navigator", "meet", "see",
          "find", "plan", "create", "ship", "land", "close"]
MIN_LEN = {"ask": 120, "shortlist": 150, "engines": 150, "invisible": 105, "navigator": 90,
           "meet": 210, "see": 165, "find": 135, "plan": 150, "create": 165, "ship": 45,
           "land": 120, "close": 150}
TAIL = {"ship": 30, "close": 66, "invisible": 24, "navigator": 12}

# Visual beats the score hits. The scenes compute the same frames from the cues.
CARD_LAND = lambda cues: [cues["list-recommends"]["at"] + 10 + i * 8 for i in range(3)]


def build_timeline(phrases, clips, default_gap):
    frames_of = {pid: int(math.ceil(len(a) / SR * FPS)) for pid, a in clips.items()}
    cues, lengths = {}, {}
    for scene in SCENES:
        prev_end = 0
        for p in [p for p in phrases if p["scene"] == scene]:
            at = p["at"] if "at" in p else prev_end + p.get("gap", default_gap)
            cues[p["id"]] = {"scene": scene, "at": at, "frames": frames_of[p["id"]]}
            prev_end = at + frames_of[p["id"]]
        need = prev_end + TAIL.get(scene, 18)
        lengths[scene] = int(math.ceil(max(MIN_LEN[scene], need) / BEAT) * BEAT)

    starts, t = {}, 0
    for scene in SCENES:
        starts[scene] = t
        t += lengths[scene]
    for pid, c in cues.items():
        print(f"  {pid:<16} {c['scene']:<10} @{c['at']:>4}  {c['frames']:>3}f")
    return {
        "fps": FPS,
        "beat": BEAT,
        "total": t,
        "scenes": {s: {"start": starts[s], "length": lengths[s]} for s in SCENES},
        "cues": cues,
    }


# ---------------------------------------------------------------- instruments

rng = np.random.default_rng(11)
NOTE = {"C#": -8, "D": -7, "E": -5, "F#": -3, "G#": -1, "A": 0, "B": 2}


def hz(name, octave):
    return 440 * 2 ** ((NOTE[name] + 12 * (octave - 4)) / 12)


# F# minor anthem: i–VI–III–VII (F#m, D, A, E), one chord per bar.
CHORDS = [("F#", "A", "C#"), ("D", "F#", "A"), ("A", "C#", "E"), ("E", "G#", "B")]
HOOK = [("C#", 5), ("C#", 5), ("A", 4), ("B", 4), ("C#", 5), ("E", 5), ("C#", 5), ("B", 4)]


def t_axis(length):
    return np.arange(int(length * SR)) / SR


def kick(punch=1.0):
    t = t_axis(0.45)
    f = 45 + 160 * np.exp(-t / 0.022)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    click = filt(noise(len(t)), "highpass", 3000) * np.exp(-t / 0.003) * 0.35
    return np.tanh((body + click) * 1.8 * punch) * 0.9


def snare(bright=1.0):
    t = t_axis(0.3)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    hiss = filt(noise(len(t)), "bandpass", [1500, 9000]) * np.exp(-t / (0.09 * bright))
    return (tone + hiss) * 0.8


def clap():
    return base.clap()


def open_hat():
    t = t_axis(0.25)
    return filt(noise(len(t)), "highpass", 7500) * np.exp(-t / 0.08) * 0.35


def supersaw(freqs, length, cutoff=5200, voices=7, spread=0.22):
    """Stack of detuned saws per note, spread across the stereo field."""
    n = int(length * SR)
    left, right = np.zeros(n), np.zeros(n)
    for f in freqs:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            ph = (np.cumsum(np.full(n, f * 2 ** (d / 12))) / SR + rng.random()) % 1
            w = 2 * ph - 1
            pan = (v / (voices - 1)) * 2 - 1
            left += w * (1 - pan) * 0.5
            right += w * (1 + pan) * 0.5
    out = np.stack([filt(left, "lowpass", cutoff, 4), filt(right, "lowpass", cutoff, 4)], 1)
    shape = np.minimum(1, t_axis(length)[:, None] / 0.01) * np.clip((length - t_axis(length))[:, None] / 0.08, 0, 1)
    return out * shape / (len(freqs) * voices) * 2.2


def chord_notes(chord, octave=4):
    root = hz(chord[0], octave - 1)
    return [root] + [hz(n, octave) for n in chord] + [hz(chord[0], octave + 1)]


def bass(root, length):
    t = t_axis(length)
    f = hz(root, 1)
    sub = np.sin(2 * np.pi * f * t)
    grit = filt(base.saw(f * 2, len(t)), "lowpass", 600) * 0.35
    return (sub + grit) * np.clip((length - t) / 0.05, 0, 1) * np.minimum(1, t / 0.005) * 0.6


def lead(freq, length):
    x = supersaw([freq], length, cutoff=7000, voices=5, spread=0.12)
    return x * 1.6


def pluck(freq):
    t = t_axis(0.3)
    x = base.saw(freq, len(t)) * 0.5 + np.sin(2 * np.pi * freq * t) * 0.5
    return filt(x, "lowpass", 2600) * env(len(t), 0.002, 0.08) * 0.22


def chime(freq):
    t = t_axis(2.5)
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / d)
               for r, a, d in [(1, 1.0, 1.2), (2.76, 0.45, 0.6), (5.4, 0.25, 0.3), (8.93, 0.1, 0.15)]) * 0.3


# Sound effects
def keyclick():
    t = t_axis(0.03)
    return filt(noise(len(t)), "bandpass", [2000, 7000]) * np.exp(-t / 0.004) * 0.5


def card_snap():
    t = t_axis(0.12)
    return (filt(noise(len(t)), "bandpass", [800, 5000]) * np.exp(-t / 0.012) +
            np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.03) * 0.6) * 0.7


def sonar(freq=1320):
    t = t_axis(1.2)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.35) * 0.35


def stamp():
    t = t_axis(0.4)
    return (np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.12) +
            filt(noise(len(t)), "lowpass", 1200) * np.exp(-t / 0.03) * 0.6) * 0.8


def glass():
    t = t_axis(1.2)
    crash = filt(noise(len(t)), "highpass", 2500) * np.exp(-t / 0.25) * 0.6
    tinkles = sum(np.sin(2 * np.pi * f * t) * np.exp(-np.clip(t - o, 0, None) / 0.08) * (t > o) * 0.12
                  for f, o in zip(rng.uniform(2500, 7000, 14), rng.uniform(0.02, 0.6, 14)))
    return crash + tinkles


def whoosh(length=0.8, up=True):
    t = t_axis(length)
    p = t / length
    shape = np.sin(np.pi * p) ** 2
    x = filt(noise(len(t)), "bandpass", [300, 6000]) * shape
    return x * 0.6


def sonic_boom():
    t = t_axis(2.0)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 80 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.7)
    crack = filt(noise(len(t)), "highpass", 1500) * np.exp(-t / 0.05) * 0.8
    return (boom * 1.2 + crack) * 0.8


def flap_burst(length=1.0):
    t = t_axis(length)
    out = np.zeros(len(t))
    for o in np.sort(rng.uniform(0, length * 0.9, 40)):
        c = keyclick() * rng.uniform(0.4, 0.9)
        i = int(o * SR)
        out[i:i + len(c)] += c[: len(out) - i]
    return out


def zap():
    t = t_axis(0.5)
    return np.sin(2 * np.pi * np.cumsum(3000 * np.exp(-t / 0.08) + 200) / SR) * np.exp(-t / 0.15) * 0.3


def thud():
    t = t_axis(0.25)
    return np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.08) * 0.7


# ---------------------------------------------------------------- arrangement


def compose(tl):
    end = tl["total"] / FPS
    n = int((end + 3) * SR)
    beat = BEAT / FPS
    bar = 4 * beat
    sc = {s: v["start"] / FPS for s, v in tl["scenes"].items()}
    cues = tl["cues"]

    def at(cue, offset_frames=0):
        c = cues[cue]
        return sc[c["scene"]] + (c["at"] + offset_frames) / FPS

    buses = {k: np.zeros((n, 2)) for k in ("drums", "pumped", "fx", "send")}

    def add(bus, clip, t, gain=1.0, wet=0.2, pan=0.0):
        stereo = clip if clip.ndim == 2 else np.stack([clip * (1 - pan), clip * (1 + pan)], 1)
        i = int(t * SR)
        if not 0 <= i < n:
            return
        j = min(n, i + len(stereo))
        buses[bus][i:j] += stereo[: j - i] * gain
        buses["send"][i:j] += stereo[: j - i] * gain * wet

    def chord_at(t):
        return CHORDS[int(t / bar) % 4]

    def grid(a, b, step):
        k = math.ceil(a / step - 1e-6)
        while k * step < b - 1e-6:
            yield k * step
            k += 1

    drop1, drop2 = sc["meet"], at("land-rec")
    build_start = sc["navigator"]
    close_hit = at("close-start")

    # --- Intro (ask, shortlist, engines): filtered pluck arp, ticking hats, keystrokes.
    for t in grid(0, sc["invisible"], beat / 4):
        k = round(t / (beat / 4))
        ch = chord_at(t)
        add("fx", pluck(hz(ch[k % 3], 5 if k % 8 < 4 else 4)), t, 1.4 if t < sc["engines"] else 1.6, wet=0.4, pan=0.3 if k % 2 else -0.3)
    base.NOTE.update(NOTE)
    for t in grid(0, sc["invisible"], bar):
        add("fx", base.pad(chord_at(t), bar + 0.3), t, 1.6, wet=0.4)
    for t in grid(sc["shortlist"], sc["invisible"], beat / 2):
        add("drums", base.hat(0.02), t, 0.3, wet=0.05, pan=0.2)
    for t in grid(sc["engines"], sc["invisible"], beat):
        add("drums", kick(0.6), t, 0.55, wet=0.02)
    typing = (at("ask-when") - 0.2, at("ask-when") + 2.2)
    for t in np.arange(*typing, 0.075):
        add("fx", keyclick(), t + rng.uniform(-0.01, 0.01), 0.5, wet=0.05, pan=rng.uniform(-0.3, 0.3))
    for f in CARD_LAND(cues):
        add("fx", card_snap(), sc["shortlist"] + f / FPS, 1.0, wet=0.25)
    for i, cue in enumerate(["eng-chatgpt", "eng-claude", "eng-gemini", "eng-perplexity", "eng-google"]):
        add("fx", sonar(1100 + i * 110), at(cue), 0.9, wet=0.5, pan=-0.4 + i * 0.2)

    # --- Invisible: stamps, glass shatter, a sub drop, then near silence.
    for i in range(5):
        add("fx", stamp(), at("inv-zero", 4 + i * 4), 0.9, wet=0.3, pan=-0.4 + i * 0.2)
    add("fx", glass(), at("inv-you"), 1.0, wet=0.5)
    add("fx", base.impact(1.4), at("inv-you"), 0.8, wet=0.4)

    # --- Navigator: snare roll build (1/4 to 1/32), riser, pitch sweep, comet whoosh.
    build_end = drop1 - beat / 2  # half a beat of silence before the drop
    span = build_end - build_start
    t = build_start
    while t < build_end:
        p = (t - build_start) / span
        step = beat if p < 0.25 else beat / 2 if p < 0.5 else beat / 4 if p < 0.8 else beat / 8
        add("drums", snare(1 + p), t, 0.25 + 0.6 * p, wet=0.3)
        t += step
    rise = base.riser(span)
    add("fx", rise, build_start, 0.9, wet=0.4)
    add("fx", whoosh(1.0), at("nav-need"), 0.8, wet=0.3)
    for t in grid(build_start, build_end, bar / 2):
        add("pumped", supersaw(chord_notes(("F#", "A", "C#")), bar / 2, cutoff=900 + 4000 * (t - build_start) / span), t, 0.5, wet=0.3)

    # --- Drop 1 (meet → create) and drop 2 (land-rec → close): the full anthem.
    def drop(a, b, hook_bars=2, lead_on=True, energy=1.0):
        for t in grid(a, b, beat):
            add("drums", kick(1.1), t, 0.95 * energy, wet=0.02)
            add("drums", open_hat(), t + beat / 2, 0.45 * energy, wet=0.1, pan=0.25)
            if round(t / beat) % 2 == 1:
                add("drums", clap(), t, 0.45 * energy, wet=0.4)
        for t in grid(a, b, bar):
            ch = chord_at(t)
            length = min(bar, b - t)
            add("pumped", supersaw(chord_notes(ch), length), t, 0.75 * energy, wet=0.35)
            add("pumped", bass(ch[0], length), t, 0.9 * energy, wet=0.0)
        if lead_on:
            hook_end = min(b, a + hook_bars * bar)
            for k, t in enumerate(grid(a, hook_end, beat / 2)):
                note, octave = HOOK[k % len(HOOK)]
                add("pumped", lead(hz(note, octave), beat / 2 * 0.9), t, 0.7 * energy, wet=0.4)

    add("fx", base.impact(1.8), drop1, 1.0, wet=0.6)
    drop(drop1, sc["see"], hook_bars=3)
    # Stations: same groove, lead off and chords lower so the voice sits on top.
    drop(sc["see"], sc["ship"], lead_on=False, energy=0.7)
    for t in grid(sc["see"], sc["ship"], beat / 4):
        k = round(t / (beat / 4))
        add("fx", pluck(hz(chord_at(t)[k % 3], 5)), t, 0.5, wet=0.3, pan=0.3 if k % 2 else -0.3)

    # Station sound effects.
    add("fx", flap_burst(1.2), at("see-1"), 0.9, wet=0.1)
    add("fx", whoosh(1.0), at("find-1"), 0.8, wet=0.4)
    add("fx", zap(), at("find-2"), 0.9, wet=0.3)
    for i in range(5):
        add("fx", thud(), at("plan-2", 6 + i * 6), 0.9, wet=0.2)
    add("fx", whoosh(0.6), at("create-ai", 30), 0.6, wet=0.3)

    # Ship: riser into a sonic boom; land: tension, then drop 2 on "Recommended".
    add("fx", base.riser(sc["ship"] - sc["create"] - 4.0 if sc["ship"] - sc["create"] > 5 else 1.0), sc["ship"] - 1.0, 0.6, wet=0.3)
    add("fx", sonic_boom(), at("ship", 10), 1.0, wet=0.5)
    add("fx", whoosh(1.2), at("ship", 8), 0.9, wet=0.3)
    for t in grid(sc["land"], drop2 - beat / 2, beat / 2):
        add("drums", snare(1.4), t, 0.3, wet=0.3)
    add("pumped", supersaw(chord_notes(("E", "G#", "B")), drop2 - sc["land"], cutoff=1400), sc["land"], 0.45, wet=0.4)
    add("fx", base.impact(1.6), drop2, 1.0, wet=0.6)
    add("fx", chime(hz("C#", 6)), drop2, 0.9, wet=0.6)
    add("fx", chime(hz("A", 6)), drop2 + beat / 2, 0.6, wet=0.6)
    drop(drop2, close_hit, hook_bars=4)

    # Close: one huge F# major chord (a lift to finish), crash, ring out.
    final = ("F#", "C#", "A")
    add("pumped", supersaw([hz("F#", 3), hz("F#", 4), hz("A", 4) * 2 ** (1 / 12), hz("C#", 5), hz("F#", 5)], end - close_hit + 2.5, cutoff=6000), close_hit, 0.9, wet=0.5)
    add("pumped", bass("F#", 2.0), close_hit, 1.0, wet=0.0)
    add("drums", kick(1.3), close_hit, 1.0, wet=0.05)
    add("fx", base.impact(2.0), close_hit, 0.9, wet=0.7)
    add("fx", chime(hz("F#", 5)), close_hit, 0.5, wet=0.7)

    # Sidechain pump on chords and bass: duck on every kick inside the drops.
    pump = np.ones(n)
    tt = np.arange(n) / SR
    for a, b in ((drop1, sc["ship"]), (drop2, close_hit)):
        for t in grid(a, b, beat):
            i, j = int(t * SR), min(n, int((t + beat) * SR))
            pump[i:j] = 1 - 0.75 * np.exp(-(tt[i:j] - t) / 0.11)
    pumped = buses["pumped"] * pump[:, None]

    ir = base.reverb_ir(2.4)
    wet = np.stack([fftconvolve(buses["send"][:, c], ir[c])[:n] for c in range(2)], 1)
    music = buses["drums"] + pumped + buses["fx"] + wet * 0.45
    music = filt(music.T, "highpass", 28).T
    return np.tanh(music / np.max(np.abs(music)) * 1.6) * 0.9  # glue + loudness


def mix(tl, clips, music):
    n = len(music)
    vo = np.zeros(n)
    duck = np.ones(n)
    for pid, c in tl["cues"].items():
        t = (tl["scenes"][c["scene"]]["start"] + c["at"]) / FPS
        base.place_into(vo, clips[pid], t)
        a, b = int(t * SR), int((t + len(clips[pid]) / SR) * SR)
        duck[max(0, a - int(0.04 * SR)) : min(n, b + int(0.12 * SR))] = 0.36
    k = int(0.06 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode="same")
    vo = vo / max(1e-6, np.max(np.abs(vo))) * 0.92
    out = np.tanh((music * 0.62 * duck[:, None] + vo[:, None]) * 1.05) * 0.95
    return out[: int(tl["total"] / FPS * SR) + int(0.5 * SR)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True, type=pathlib.Path)
    parser.add_argument("--voice")
    args = parser.parse_args()

    config = json.loads(VO_CONFIG.read_text())
    voice = args.voice or config["voice"]
    print(f"Voiceover ({voice})")
    clips = base.speak(config["phrases"], voice, args.models)
    timeline = build_timeline(config["phrases"], clips, config["gapFrames"])
    TIMELINE.write_text(json.dumps(timeline, indent=2) + "\n")
    print(f"Timeline: {timeline['total']} frames ({timeline['total'] / FPS:.1f}s)")
    print({s: v["length"] for s, v in timeline["scenes"].items()})

    music = compose(timeline)
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(OUT / "arrowsterr-music.wav", music, SR, subtype="PCM_16")
    sf.write(OUT / "arrowsterr-mix.wav", mix(timeline, clips, music), SR, subtype="PCM_16")
    print("Wrote public/audio/arrowsterr-mix.wav (+ arrowsterr-music.wav stem)")


if __name__ == "__main__":
    main()
