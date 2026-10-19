"""Build the Arrowsterr soundtrack: voiceover, synced timeline, original music, mix.

Same pipeline as build-soundtrack.py (Alfie), with Arrowsterr's scenes and a calm,
precise electronic score: soft four-on-the-floor kick, ticking hats, sub pulse,
pluck arpeggio, one chime on the Spark.

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
env, filt, noise, hz, saw, pluck, pad, reverb_ir, place_into, hat, clap = (
    base.env, base.filt, base.noise, base.hz, base.saw, base.pluck, base.pad,
    base.reverb_ir, base.place_into, base.hat, base.clap,
)

ROOT = HERE.parent
VO_CONFIG = ROOT / "src/arrowsterr/voiceover.json"
TIMELINE = ROOT / "src/arrowsterr/timeline.json"
OUT = ROOT / "public/audio"

# Scene order, minimum lengths, tail after the last line, and the transition
# overlap after each scene. Keep in sync with src/arrowsterr/ArrowsterrLaunch.tsx.
SCENES = ["question", "invisible", "meet", "see", "find", "plan", "create", "visible", "close"]
MIN_LEN = {"question": 180, "invisible": 120, "meet": 150, "see": 150, "find": 120,
           "plan": 150, "create": 165, "visible": 135, "close": 135}
TAIL = {"close": 48}
TRANSITION_AFTER = {"question": 0, "invisible": 0, "meet": 12, "see": 12, "find": 12,
                    "plan": 12, "create": 12, "visible": 15}


def build_timeline(phrases, clips, gap):
    frames_of = {pid: int(math.ceil(len(a) / SR * FPS)) for pid, a in clips.items()}
    cues, lengths = {}, {}
    for scene in SCENES:
        prev_end = 0
        for p in [p for p in phrases if p["scene"] == scene]:
            at = p.get("at", prev_end + gap)
            cues[p["id"]] = {"scene": scene, "at": at, "frames": frames_of[p["id"]]}
            prev_end = at + frames_of[p["id"]]
        need = prev_end + TAIL.get(scene, 24)
        lengths[scene] = int(math.ceil(max(MIN_LEN[scene], need) / BEAT) * BEAT)

    starts, t = {}, 0
    for scene in SCENES:
        starts[scene] = t
        t += lengths[scene] - TRANSITION_AFTER.get(scene, 0)

    for pid, c in cues.items():
        end = c["at"] + c["frames"]
        room = lengths[c["scene"]] - TRANSITION_AFTER.get(c["scene"], 0)
        flag = f"  runs {end - room}f into the transition" if end > room else ""
        print(f"  {pid:<8} {c['scene']:<9} @{c['at']:>4}  {c['frames']:>3}f{flag}")

    return {
        "fps": FPS,
        "beat": BEAT,
        "total": t,
        "transitions": TRANSITION_AFTER,
        "scenes": {s: {"start": starts[s], "length": lengths[s]} for s in SCENES},
        "cues": cues,
    }


# ---------------------------------------------------------------- score

# F# minor, calm and forward: i–VI–III–VII (F#m, D, A, E).
NOTE = {"C#": -8, "D": -7, "E": -5, "F#": -3, "G#": -1, "A": 0, "B": 2}
CHORDS = [("F#", "A", "C#"), ("D", "F#", "A"), ("A", "C#", "E"), ("E", "G#", "B")]
base.NOTE.update(NOTE)  # base.pad() looks notes up in the shared table


def nhz(name, octave):
    return 440 * 2 ** ((NOTE[name] + 12 * (octave - 4)) / 12)


def soft_kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14) * 0.9


def sub(freq, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.25) * 0.35


def tick():
    n = int(0.05 * SR)
    return filt(noise(n), "highpass", 9000) * env(n, 0.0003, 0.006) * 0.35


def chime(freq):
    """Bell: inharmonic sine partials with long decay. The Spark sound."""
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / d)
            for r, a, d in [(1, 1.0, 1.2), (2.76, 0.45, 0.6), (5.4, 0.25, 0.3), (8.93, 0.1, 0.15)])
    return x * 0.3


def soft_pluck(freq):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    x = saw(freq, n) * 0.5 + np.sin(2 * np.pi * freq * t) * 0.5
    return filt(x, "lowpass", 2400) * env(n, 0.002, 0.09) * 0.16


def compose(tl):
    total = tl["total"] / FPS + 2.5
    n = int(total * SR)
    st = {s: v["start"] / FPS for s, v in tl["scenes"].items()}
    beat = BEAT / FPS
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))

    def add(clip, t, gain=1.0, wet=0.25, pan=0.0):
        stereo = clip if clip.ndim == 2 else np.stack([clip * (1 - pan), clip * (1 + pan)], 1)
        for bus, g in ((dry, gain), (send, gain * wet)):
            i = int(t * SR)
            if 0 <= i < n:
                j = min(n, i + len(stereo))
                bus[i:j] += stereo[: j - i] * g

    def chord_at(t):
        return CHORDS[int(t / (4 * beat)) % 4]

    def loop(a, b, step, fn):
        t = a
        while t < b - 1e-6:
            fn(t)
            t += step

    meet, visible, close = st["meet"], st["visible"], st["close"]
    end = tl["total"] / FPS

    # Intro (question + invisible): ticking clock and a low pulse. Tension, no kick.
    loop(0, meet, beat / 2, lambda t: add(tick(), t, 0.5 if round(t / (beat / 2)) % 2 else 0.8, wet=0.1, pan=0.2))
    loop(0, meet, 2 * beat, lambda t: add(sub(nhz("F#", 1), 2 * beat), t, 0.8, wet=0.05))
    loop(st["invisible"], meet, 4 * beat, lambda t: add(pad(("F#", "A", "C#"), 4 * beat + 0.2), t, 0.6, wet=0.4))

    # Riser into "Meet Arrowsterr", then a clean downbeat.
    rise = base.riser(2.0)
    add(rise, meet - len(rise) / SR, 0.5, wet=0.4)
    add(chime(nhz("C#", 6)), meet, 0.45, wet=0.6)

    # Main groove from the reveal to the close: kick on every beat, hats on offbeats,
    # light clap on 2 and 4, sub following the chords, pluck arp in 16ths.
    def groove(t):
        k = round(t / beat)
        add(soft_kick(), t, 0.85, wet=0.05)
        add(hat(0.025), t + beat / 2, 0.35, wet=0.1, pan=0.25)
        if k % 2 == 1:
            add(clap(), t, 0.18, wet=0.35)
        add(sub(nhz(chord_at(t)[0], 1), beat), t, 0.6, wet=0.0)

    loop(meet, visible + 0.001, beat, groove)
    loop(meet, close, 4 * beat, lambda t: add(pad(chord_at(t), 4 * beat + 0.2), t, 0.55, wet=0.4))

    def arp(t):
        k = round(t / (beat / 4))
        ch = chord_at(t)
        note = ch[k % 3]
        octave = 5 if (k // 3) % 2 == 0 else 4
        add(soft_pluck(nhz(note, octave)), t, 0.9, wet=0.3, pan=0.3 if k % 2 else -0.3)

    loop(st["see"], visible, beat / 4, arp)

    # The Spark: one chime as you land on the shortlist.
    spark_t = visible + tl["cues"]["aw-v2"]["at"] / FPS
    add(chime(nhz("A", 5)), spark_t, 0.8, wet=0.6)
    add(chime(nhz("E", 6)), spark_t + beat / 2, 0.5, wet=0.6)

    # Visible: groove drops to kick and pad, letting the payoff breathe.
    loop(visible, close, 4 * beat, lambda t: add(pad(("A", "C#", "E"), 4 * beat + 0.2), t, 0.6, wet=0.45))

    # Close: resolve on A major, kick pulse under the end card, then ring out.
    add(pad(("A", "C#", "E"), end - close + 2.0), close, 0.9, wet=0.5)
    add(sub(nhz("A", 1), 1.5), close, 0.9, wet=0.0)
    loop(close, end - 2 * beat, beat, lambda t: add(soft_kick(), t, 0.6, wet=0.05))
    add(chime(nhz("A", 5)), close, 0.4, wet=0.7)

    ir = reverb_ir(2.0)
    wet = np.stack([fftconvolve(send[:, c], ir[c])[:n] for c in range(2)], 1)
    music = filt((dry + wet * 0.5).T, "highpass", 28).T
    return music / np.max(np.abs(music)) * 0.9


def mix(tl, clips, music):
    n = len(music)
    vo = np.zeros(n)
    duck = np.ones(n)
    for pid, c in tl["cues"].items():
        t = (tl["scenes"][c["scene"]]["start"] + c["at"]) / FPS
        place_into(vo, clips[pid], t)
        a, b = int(t * SR), int((t + len(clips[pid]) / SR) * SR)
        duck[max(0, a - int(0.05 * SR)) : min(n, b + int(0.15 * SR))] = 0.42
    k = int(0.08 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode="same")
    vo = vo / max(1e-6, np.max(np.abs(vo))) * 0.9
    out = np.tanh((music * 0.55 * duck[:, None] + vo[:, None]) * 1.05) * 0.95
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

    music = compose(timeline)
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(OUT / "arrowsterr-mix.wav", mix(timeline, clips, music), SR, subtype="PCM_16")
    print("Wrote public/audio/arrowsterr-mix.wav")


if __name__ == "__main__":
    main()
