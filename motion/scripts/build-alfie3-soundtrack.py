"""Build the Momos Alfie v3 soundtrack ("The night shift").

Voiceover is the master clock (pipeline in build-soundtrack.py). The score is original
and composed in code on the 120 bpm grid, and the kitchen is the drum kit: ticket-printer
chatter for hats, knife chops for the snare, the order bell for accents, sizzle as a
shaker. Everything stops dead on the freeze, the steamer-lid pop drops the anthem on
"Meet Alfie", the agent trace runs half-time, the tile wall runs double-time, and the
closing "Resolve. Recover. Bring them back." drops again a key higher.

Run from motion/ (setup in build-soundtrack.py's header):
  .venv-tts/bin/python scripts/build-alfie3-soundtrack.py --models <dir>
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


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


base = _load("alfie_soundtrack", "build-soundtrack.py")  # stomp, clap, pad, riser, impact, speak
aw = _load("arrowsterr_soundtrack", "build-arrowsterr-soundtrack.py")  # supersaw, kick, lead, sfx
SR, FPS, BEAT = base.SR, base.FPS, base.BEAT
env, filt, noise, t_axis = base.env, base.filt, base.noise, aw.t_axis

ROOT = HERE.parent
VO_CONFIG = ROOT / "src/alfie3/voiceover.json"
TIMELINE = ROOT / "src/alfie3/timeline.json"
OUT = ROOT / "public/audio"

SCENES = ["printer", "rail", "bag", "flood", "freeze", "reveal", "fix", "wall", "lanes",
          "night", "handoff", "morning", "beats", "end"]
MIN_LEN = {"printer": 75, "rail": 60, "bag": 120, "flood": 75, "freeze": 60, "reveal": 135,
           "fix": 300, "wall": 90, "lanes": 105, "night": 75, "handoff": 105, "morning": 120,
           "beats": 90, "end": 135}
TAIL = {"freeze": 4, "beats": 0, "end": 40, "fix": 20, "night": 30, "flood": 8}

rng = np.random.default_rng(23)


def build_timeline(phrases, clips, default_gap):
    frames_of = {pid: int(math.ceil(len(a) / SR * FPS)) for pid, a in clips.items()}
    cues, lengths = {}, {}
    for scene in SCENES:
        prev_end = 0
        for p in [p for p in phrases if p["scene"] == scene]:
            at = p["at"] if "at" in p else prev_end + p.get("gap", default_gap)
            cues[p["id"]] = {"scene": scene, "at": at, "frames": frames_of[p["id"]]}
            prev_end = at + frames_of[p["id"]]
        need = prev_end + TAIL.get(scene, 16)
        lengths[scene] = int(math.ceil(max(MIN_LEN[scene], need) / BEAT) * BEAT)
    starts, t = {}, 0
    for scene in SCENES:
        starts[scene] = t
        t += lengths[scene]
    for pid, c in cues.items():
        print(f"  {pid:<16} {c['scene']:<8} @{c['at']:>4}  {c['frames']:>3}f")
    return {"fps": FPS, "beat": BEAT, "total": t,
            "scenes": {s: {"start": starts[s], "length": lengths[s]} for s in SCENES}, "cues": cues}


# ---------------------------------------------------------------- the kitchen kit

def printer(length=0.25):
    """Thermal ticket printer: fast stepper clicks over a motor whine."""
    t = t_axis(length)
    clicks = np.zeros(len(t))
    for k in np.arange(0, length, 1 / 60):
        i = int(k * SR)
        c = filt(noise(160), "bandpass", [2500, 8000]) * np.exp(-np.arange(160) / 30)
        clicks[i:i + 160] += c[: len(clicks) - i] * rng.uniform(0.5, 1)
    motor = filt(base.saw(220, len(t)), "bandpass", [300, 1200]) * 0.15
    return (clicks * 0.5 + motor) * np.minimum(1, t / 0.01) * np.clip((length - t) / 0.02, 0, 1)


def bell(freq=2350, decay=1.1):
    """Counter service bell."""
    t = t_axis(2.0)
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (decay * d))
               for r, a, d in [(1, 1.0, 1), (2.41, 0.5, 0.6), (4.07, 0.25, 0.35), (5.9, 0.1, 0.2)]) * 0.28


def chop():
    """Knife through onion onto a board: the snare."""
    t = t_axis(0.18)
    body = np.sin(2 * np.pi * np.cumsum(260 * np.exp(-t / 0.02) + 120) / SR) * np.exp(-t / 0.04)
    crack = filt(noise(len(t)), "bandpass", [1800, 7000]) * np.exp(-t / 0.012)
    return (body * 0.8 + crack * 0.9) * 0.8


def sizzle(length):
    t = t_axis(length)
    hiss = filt(noise(len(t)), "bandpass", [3000, 10000])
    crackle = (rng.random(len(t)) > 0.9985) * rng.uniform(0.5, 1.5, len(t))
    crackle = filt(crackle, "highpass", 2000)
    return (hiss * 0.12 + crackle * 0.5) * np.minimum(1, t / 0.05) * np.clip((length - t) / 0.1, 0, 1)


def steam(length=1.4, swell=True):
    t = t_axis(length)
    shape = np.sin(np.pi * t / length) ** (0.6 if swell else 2)
    return filt(noise(len(t)), "highpass", 1800) * shape * 0.35


def lid_pop():
    t = t_axis(0.8)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 160 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.15)
    air = filt(noise(len(t)), "bandpass", [600, 5000]) * np.exp(-t / 0.08)
    return (thump * 1.1 + air * 0.7) * 0.9


def buzz(length=0.5):
    t = t_axis(length)
    x = np.sign(np.sin(2 * np.pi * 165 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * t)))
    return filt(x, "lowpass", 900) * 0.25 * np.clip((length - t) / 0.03, 0, 1)


def scratch():
    t = t_axis(0.35)
    strokes = (np.sin(np.pi * np.clip(t / 0.15, 0, 1)) * (t < 0.15) + np.sin(np.pi * np.clip((t - 0.18) / 0.15, 0, 1)) * (t >= 0.18))
    return filt(noise(len(t)), "bandpass", [1500, 5000]) * strokes * 0.5


def tick():
    t = t_axis(0.06)
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t / 0.012) * 0.4


def coins(n=10):
    out = np.zeros(int(0.9 * SR))
    for k in range(n):
        c = aw.chime(rng.uniform(2200, 4200)) * 0.18
        i = int(k * 0.06 * SR)
        out[i:] += c[: len(out) - i]
    return out


# ---------------------------------------------------------------- arrangement

CHORDS = [("D", "F", "A"), ("A#", "D", "F"), ("F", "A", "C"), ("C", "E", "G")]
NOTE = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "A#": 1}
HOOK = [("A", 4), ("A", 4), ("F", 4), ("G", 4), ("A", 4), ("C", 5), ("A", 4), ("G", 4)]


def hz(name, octave):
    return 440 * 2 ** ((NOTE[name] + 12 * (octave - 4)) / 12)


def compose(tl):
    end = tl["total"] / FPS
    n = int((end + 3) * SR)
    beat = BEAT / FPS
    bar = 4 * beat
    sc = {s: v["start"] / FPS for s, v in tl["scenes"].items()}
    cues = tl["cues"]

    def at(cue, off=0):
        c = cues[cue]
        return sc[c["scene"]] + (c["at"] + off) / FPS

    buses = {k: np.zeros((n, 2)) for k in ("drums", "pumped", "fx", "send")}

    def add(bus, clip, t, gain=1.0, wet=0.2, pan=0.0):
        stereo = clip if clip.ndim == 2 else np.stack([clip * (1 - pan), clip * (1 + pan)], 1)
        i = int(t * SR)
        if not 0 <= i < n:
            return
        j = min(n, i + len(stereo))
        buses[bus][i:j] += stereo[: j - i] * gain
        buses["send"][i:j] += stereo[: j - i] * gain * wet

    def grid(a, b, step):
        k = math.ceil(a / step - 1e-6)
        while k * step < b - 1e-6:
            yield k * step
            k += 1

    def chord_at(t):
        return CHORDS[int(t / bar) % 4]

    def notes(ch, octave=4, semis=0):
        k = 2 ** (semis / 12)
        return [hz(ch[0], octave - 1) * k] + [hz(x, octave) * k for x in ch] + [hz(ch[0], octave + 1) * k]

    freeze = sc["freeze"]
    pop = sc["reveal"] + 8 / FPS  # the steamer lid
    drop2 = sc["beats"]

    # --- Act 1: the kitchen kit, building scene by scene.
    for t in grid(0, freeze, beat / 4):  # printer chatter = hats
        k = round(t / (beat / 4))
        if k % 2 == 1 or t > sc["bag"]:
            add("drums", printer(0.06), t, 0.35, wet=0.05, pan=0.3 if k % 4 == 1 else -0.2)
    add("fx", printer(1.6), at("open-1") - 0.6, 0.8, wet=0.1)
    for t in grid(sc["rail"], freeze, beat):  # stomp on every beat, chop on 2 and 4
        add("drums", base.stomp(), t, 0.6, wet=0.15)
        if round(t / beat) % 2 == 1:
            add("drums", chop(), t, 0.7, wet=0.2)
    for t in grid(sc["bag"], freeze, bar):  # the bell on the last beat of each bar
        add("drums", bell(), t + 3 * beat, 0.45, wet=0.4, pan=0.2)
    for t in grid(sc["rail"], freeze, bar):
        add("fx", sizzle(bar), t, 0.7, wet=0.1)
    for t in grid(0, freeze, bar):
        add("fx", base.pad(("D", "F", "A"), bar + 0.3), t, 0.9, wet=0.4)
    add("fx", aw.whoosh(0.6), sc["bag"], 0.8, wet=0.3)
    add("fx", scratch(), at("bag-fries", 4), 0.9, wet=0.2)
    add("fx", buzz(0.5), at("bag-again"), 1.0, wet=0.1)
    for t in grid(sc["flood"], freeze, beat / 2):  # tension: low pulse
        add("fx", aw.bass("D", beat / 2 * 0.8), t, 0.6, wet=0.0)
    for k in range(14):
        add("fx", aw.card_snap(), sc["flood"] + (k ** 0.8) * 0.12 + 0.1, 0.35, wet=0.2, pan=rng.uniform(-0.5, 0.5))

    # --- Freeze: dead stop. Steam hiss, then a reverse swell into the lid pop.
    for b in ("drums", "fx", "send"):
        i0 = int(freeze * SR)
        fade = int(0.02 * SR)
        buses[b][i0:i0 + fade] *= np.linspace(1, 0, fade)[:, None]
        buses[b][i0 + fade:int(pop * SR)] = 0
    add("fx", steam(pop - freeze, swell=True), freeze, 0.7, wet=0.3)
    sw = aw.reverse_swell(1.2)
    add("fx", sw, pop - len(sw) / SR, 0.8, wet=0.2)

    # --- Drop 1 on the lid pop: stomp-stomp-clap anthem with supersaws and a hook.
    add("fx", lid_pop(), pop, 1.1, wet=0.4)
    add("fx", steam(1.6, swell=False), pop, 0.9, wet=0.4)
    add("fx", base.impact(1.6), pop, 0.9, wet=0.6)

    def anthem(a, b, energy=1.0, semis=0, hook=True, half=False):
        step = 2 * beat if half else beat
        for t in grid(a, b, step):
            add("drums", base.stomp(), t, 0.9 * energy, wet=0.2)
            if not half:
                add("drums", base.stomp(), t + beat / 2, 0.55 * energy, wet=0.2)
            if round(t / beat) % 2 == 1 or half:
                add("drums", base.clap(), t + (beat if half else 0), 0.45 * energy, wet=0.45)
            add("drums", base.hat(0.03), t + beat / 2, 0.3 * energy, wet=0.1, pan=0.25)
        for t in grid(a, b, bar):
            ch = chord_at(t)
            length = min(bar, b - t)
            add("pumped", aw.supersaw(notes(ch, semis=semis), length), t, 0.7 * energy, wet=0.35)
            bt = t_axis(length)
            f0 = hz(ch[0], 1) * 2 ** (semis / 12)
            add("pumped", np.sin(2 * np.pi * f0 * bt) * np.clip((length - bt) / 0.05, 0, 1) * 0.55, t, energy, wet=0.0)
        if hook:
            for k, t in enumerate(grid(a, min(b, a + 3 * bar), beat / 2)):
                note, octave = HOOK[k % len(HOOK)]
                add("pumped", aw.lead(hz(note, octave) * 2 ** (semis / 12), beat / 2 * 0.9), t, 0.65 * energy, wet=0.4)

    anthem(pop, sc["fix"])
    # --- Fix: half-time under the agent trace, UI ticks, coins, the stamp.
    anthem(sc["fix"], sc["wall"], energy=0.6, hook=False, half=True)
    for cue in ("fix-order", "fix-policy", "fix-right"):
        add("fx", tick(), at(cue, 10), 0.9, wet=0.2)
    add("fx", tick(), at("fix-right", 18), 0.9, wet=0.2)
    add("fx", coins(12), at("fix-right", 14), 0.9, wet=0.4)
    add("fx", aw.stamp(), at("fix-closed"), 1.0, wet=0.3)
    add("fx", bell(2600), at("fix-closed", 2), 0.6, wet=0.5)
    # --- Wall: double-time energy and a sweep for the wave.
    anthem(sc["wall"], sc["night"], energy=0.85, hook=False)
    for t in grid(sc["wall"], sc["night"], beat / 4):
        add("drums", printer(0.05), t, 0.25, wet=0.05, pan=rng.uniform(-0.4, 0.4))
    add("fx", aw.whoosh(1.4), at("wall-1"), 0.9, wet=0.3)
    for i, cue in enumerate(["lanes-web", "lanes-app", "lanes-surveys", "lanes-delivery"]):
        add("fx", aw.sonar(1200 + 160 * i), at(cue), 0.7, wet=0.4, pan=-0.45 + 0.3 * i)
    # --- Night: riser through the time-lapse, then breakdown for the handoff.
    add("fx", base.riser(sc["handoff"] - sc["night"]), sc["night"], 0.8, wet=0.4)
    for t in grid(sc["handoff"], sc["morning"], bar):
        add("fx", base.pad(("A#", "D", "F"), bar + 0.3), t, 1.0, wet=0.5)
    add("fx", aw.whoosh(0.8), at("handoff-2"), 0.7, wet=0.3)
    add("fx", buzz(0.35), at("handoff-2", 18), 0.8, wet=0.1)
    # --- Morning: near silence, one bell on "a quiet inbox", a swell into drop 2.
    add("fx", bell(2350, 1.6), at("morning-quiet"), 0.8, wet=0.6)
    sw2 = aw.reverse_swell(1.2)
    add("fx", sw2, drop2 - len(sw2) / SR, 0.8, wet=0.2)
    # --- Drop 2, a key higher: one bell + impact per word, then the anthem.
    for cue in ("beat-resolve", "beat-recover", "beat-back"):
        add("fx", bell(2640), at(cue, -1), 0.8, wet=0.4)
        add("fx", base.impact(0.6), at(cue, -1), 0.6, wet=0.4)
    anthem(drop2, sc["end"] + 2 * bar, semis=1)
    # --- End: a final steamy chord.
    k = 2 ** (1 / 12)
    final = [hz("D", 3) * k, hz("D", 4) * k, hz("F", 4) * 2 ** (2 / 12), hz("A", 4) * k, hz("D", 5) * k]
    add("pumped", aw.supersaw(final, end - (sc["end"] + 2 * bar) + 2.5, cutoff=6000), sc["end"] + 2 * bar, 0.8, wet=0.5)
    add("fx", steam(1.5, swell=False), at("end-2"), 0.7, wet=0.4)
    add("fx", base.impact(1.8), sc["end"] + 2 * bar, 0.8, wet=0.6)

    # Sidechain pump inside the anthem sections.
    pump = np.ones(n)
    ts = np.arange(n) / SR
    for a, b in ((pop, sc["fix"]), (sc["wall"], sc["night"]), (drop2, sc["end"] + 2 * bar)):
        for t in grid(a, b, beat):
            i, j = int(t * SR), min(n, int((t + beat) * SR))
            pump[i:j] = 1 - 0.7 * np.exp(-(ts[i:j] - t) / 0.11)
    pumped = buses["pumped"] * pump[:, None]

    ir = base.reverb_ir(2.2)
    wet = np.stack([fftconvolve(buses["send"][:, c], ir[c])[:n] for c in range(2)], 1)
    i0, i1 = int(freeze * SR), int(pop * SR)
    wet[i0 + int(0.4 * SR):i1] *= 0.15  # let the freeze stay nearly silent
    music = buses["drums"] + pumped + buses["fx"] + wet * 0.45
    music = filt(music.T, "highpass", 28).T
    return np.tanh(music / np.max(np.abs(music)) * 1.6) * 0.9


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True, type=pathlib.Path)
    parser.add_argument("--voice")
    args = parser.parse_args()

    config = json.loads(VO_CONFIG.read_text())
    voice = args.voice or config["voice"]
    base.NOTE.update(NOTE)
    print(f"Voiceover ({voice})")
    clips = base.speak(config["phrases"], voice, args.models)
    timeline = build_timeline(config["phrases"], clips, config["gapFrames"])
    TIMELINE.write_text(json.dumps(timeline, indent=2) + "\n")
    print(f"Timeline: {timeline['total']} frames ({timeline['total'] / FPS:.1f}s)")
    print({s: v["length"] for s, v in timeline["scenes"].items()})

    music = compose(timeline)
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(OUT / "alfie3-music.wav", music, SR, subtype="PCM_16")
    sf.write(OUT / "alfie3-mix.wav", aw.mix(timeline, clips, music), SR, subtype="PCM_16")
    print("Wrote public/audio/alfie3-mix.wav")


if __name__ == "__main__":
    main()
