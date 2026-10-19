"""Build the Alfie soundtrack: voiceover, synced timeline, original music, final mix.

1. Voiceover: every phrase in src/alfie/voiceover.json is spoken by Kokoro (open-source
   TTS, runs locally) and measured.
2. Timeline: phrases are placed on the video (pinned with "at", or following the previous
   phrase), and animation cues that depend on speech are derived from them. Written to
   src/alfie/timeline.json, which the scenes read, so the visuals land on the words.
3. Music: an original stadium-anthem bed (stomp-stomp-clap, power chords, pad, arpeggio)
   synthesized on the video's 120 bpm grid and arranged around the timeline.
4. Mix: music ducked under the voice, written to public/audio/alfie-mix.wav.

Setup (once), from motion/:
  python3 -m venv .venv-tts && .venv-tts/bin/pip install kokoro-onnx soundfile scipy
  Download kokoro-v1.0.int8.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Run:
  .venv-tts/bin/python scripts/build-soundtrack.py --models <dir with the two files>
"""

import argparse
import hashlib
import json
import math
import pathlib

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
VO_CONFIG = ROOT / "src/alfie/voiceover.json"
TIMELINE = ROOT / "src/alfie/timeline.json"
CACHE = ROOT / ".cache/voiceover"
OUT = ROOT / "public/audio"

FPS = 30
BEAT = 15  # frames per beat at 120 bpm
SR = 44100

# Scene order, fixed lengths (proof is derived from speech) and the transition
# overlap after each scene. Keep in sync with src/alfie/AlfieLaunch.tsx.
SCENES = ["hook", "cascade", "reveal", "proof", "reach", "handoff", "cta"]
FIXED = {"hook": 105, "cascade": 150, "reveal": 120, "reach": 105, "handoff": 120, "cta": 180}
TRANSITION_AFTER = {"hook": 0, "cascade": 15, "reveal": 15, "proof": 15, "reach": 15, "handoff": 0}


# ---------------------------------------------------------------- voiceover


def speak(phrases, voice, models):
    """Return {id: mono float32 audio at SR}, cached by text + voice."""
    CACHE.mkdir(parents=True, exist_ok=True)
    kokoro = None
    clips = {}
    for p in phrases:
        key = hashlib.sha1(f"{voice}|{p['text']}".encode()).hexdigest()[:12]
        path = CACHE / f"{p['id']}-{key}.wav"
        if not path.exists():
            if kokoro is None:
                from kokoro_onnx import Kokoro

                kokoro = Kokoro(
                    str(models / "kokoro-v1.0.int8.onnx"), str(models / "voices-v1.0.bin")
                )
            lang = "en-us" if voice.startswith("a") else "en-gb"
            audio, sr = kokoro.create(p["text"], voice=voice, speed=1.0, lang=lang)
            audio = resample_poly(trim(audio, sr), SR, sr).astype(np.float32)
            sf.write(path, audio, SR)
        clips[p["id"]] = sf.read(path, dtype="float32")[0]
    return clips


def trim(audio, sr, threshold=0.01):
    loud = np.where(np.abs(audio) > threshold)[0]
    if len(loud) == 0:
        return audio
    return audio[loud[0] : min(len(audio), loud[-1] + int(sr * 0.04))]


# ---------------------------------------------------------------- timeline


def round_up(frames, step=BEAT):
    return int(math.ceil(frames / step) * step)


def build_timeline(phrases, clips, gap):
    frames_of = {pid: int(math.ceil(len(a) / SR * FPS)) for pid, a in clips.items()}
    cues = {}
    proof = {}

    def place(scene):
        prev_end = 0
        for p in [p for p in phrases if p["scene"] == scene]:
            at = p.get("at")
            if at == "reply":
                at = proof["reply"] + 2
            elif at is None:
                at = prev_end + gap
            cues[p["id"]] = {"scene": scene, "at": at, "frames": frames_of[p["id"]]}
            prev_end = at + frames_of[p["id"]]
            if scene == "proof" and p["id"] == "proof-points":
                derive_proof()

    def end(pid):
        return cues[pid]["at"] + cues[pid]["frames"]

    def derive_proof():
        # The exploded layers arrive as each action is named.
        cards = [cues[k]["at"] for k in ("proof-order", "proof-policy", "proof-points")]
        collapse = max(cards[2] + 40, end("proof-points") + 6)
        proof.update(
            explode=cues["proof-while"]["at"],
            cards=cards,
            collapse=[collapse, collapse + 8, collapse + 16],
            reply=collapse + 26,
        )

    lengths = dict(FIXED)
    for scene in SCENES:
        place(scene)
        if scene == "proof":
            proof["thanks"] = max(proof["reply"] + 66, end("proof-before") + 4)
            proof["resolved"] = proof["thanks"] + 12
            lengths["proof"] = round_up(proof["resolved"] + 30)

    starts, t = {}, 0
    for scene in SCENES:
        starts[scene] = t
        t += lengths[scene] - TRANSITION_AFTER.get(scene, 0)
    total = t

    # Report speech that runs past its scene (into the next one's start).
    for pid, c in cues.items():
        nxt = SCENES.index(c["scene"]) + 1
        limit = (starts[SCENES[nxt]] if nxt < len(SCENES) else total) - starts[c["scene"]]
        over = c["at"] + c["frames"] - limit
        flag = f"  runs {over} frames into the next scene" if over > 0 else ""
        print(f"  {pid:<16} {c['scene']:<8} @{c['at']:>4}  {c['frames']:>3}f{flag}")

    return {
        "fps": FPS,
        "beat": BEAT,
        "total": total,
        "scenes": {s: {"start": starts[s], "length": lengths[s]} for s in SCENES},
        "cues": cues,
        "proof": proof,
    }


# ---------------------------------------------------------------- synthesis

rng = np.random.default_rng(7)


def sec(frames):
    return frames / FPS


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def filt(x, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)


def noise(n):
    return rng.standard_normal(n)


def place_into(bus, clip, t, gain=1.0):
    i = int(t * SR)
    if i >= len(bus):
        return
    j = min(len(bus), i + len(clip))
    bus[i:j] += clip[: j - i] * gain


def stomp():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    thud = filt(noise(n), "bandpass", [120, 600]) * env(n, 0.001, 0.05) * 0.9
    return body + thud


def clap():
    n = int(0.45 * SR)
    out = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.023, 0.034]):
        burst = filt(noise(n), "bandpass", [900, 3200]) * env(n, 0.0005, 0.007 if k < 3 else 0.11)
        out += np.roll(burst, int(off * SR)) * (0.8 if k < 3 else 1.0)
    return out * 1.4


def hat(decay=0.03):
    n = int(0.15 * SR)
    return filt(noise(n), "highpass", 7000) * env(n, 0.0005, decay) * 0.5


def impact(size=1.0):
    n = int(2.8 * SR)
    t = np.arange(n) / SR
    f = 34 + 60 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.9 * size)) * 1.3
    crash = filt(noise(n), "highpass", 3500) * env(n, 0.002, 0.9 * size) * 0.55
    return boom + crash


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    p = t / length
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 1400 * p**2) / SR) * p**2 * 0.25
    hiss = filt(noise(n), "highpass", 2500) * p**3 * 0.6
    return sweep + hiss


NOTE = {"C": -9, "D": -7, "E": -5, "F": -4, "F#": -3, "G": -2, "A": 0, "Bb": 1, "B": 2}


def hz(name, octave):
    return 440 * 2 ** ((NOTE[name] + 12 * (octave - 4)) / 12)


# Anthem progression i–VI–III–VII in D minor, one chord per 4 beats.
PROGRESSION = [("D", "F", "A"), ("Bb", "D", "F"), ("F", "A", "C"), ("C", "E", "G")]


def saw(freq, n, detune=0.0):
    ph = np.cumsum(np.full(n, freq * 2 ** (detune / 12))) / SR
    return 2 * (ph % 1) - 1


def power_chord(root, length, palm=False):
    """Distorted root-fifth-octave stack: the rock-anthem guitar layer."""
    n = int(length * SR)
    f0 = hz(root, 2)
    left = sum(saw(f, n, d) for f, d in [(f0, -0.06), (f0 * 1.5, 0.05), (f0 * 2, -0.03)])
    right = sum(saw(f, n, d) for f, d in [(f0, 0.07), (f0 * 1.5, -0.04), (f0 * 2, 0.04)])
    out = []
    for x in (left, right):
        x = np.tanh(x * 2.6)
        x = filt(x, "lowpass", 1400 if palm else 2600, order=4)
        e = env(n, 0.004, 0.12 if palm else 3.0)
        tail = np.clip((length - np.arange(n) / SR) / 0.15, 0, 1)
        out.append(x * e * tail * 0.32)
    return np.stack(out, 1)


def pad(chord, length):
    n = int(length * SR)
    x = sum(saw(hz(note, 3 if i else 2), n, d) for i, note in enumerate(chord) for d in (-0.08, 0.08))
    x = filt(x, "lowpass", 900, order=2)
    t = np.arange(n) / SR
    shape = np.clip(t / 0.5, 0, 1) * np.clip((length - t) / 0.4, 0, 1)
    return x * shape * 0.07


def pluck(freq):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * freq * t)) * 0.6 + np.sin(4 * np.pi * freq * t) * 0.4
    return filt(x, "lowpass", 3200) * env(n, 0.002, 0.07) * 0.18


def reverb_ir(length=2.4, predelay=0.02):
    n = int(length * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t / (length / 6.9))
    ir = []
    for _ in range(2):
        x = filt(noise(n), "lowpass", 6000) * decay
        x = np.concatenate([np.zeros(int(predelay * SR)), x])
        ir.append(x / np.sqrt(np.sum(x**2)))
    return ir


def compose(tl):
    total = sec(tl["total"]) + 2.5  # let the last chord ring
    n = int(total * SR)
    starts = {s: sec(v["start"]) for s, v in tl["scenes"].items()}
    beat = sec(BEAT)
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))  # reverb send

    def add(clip, t, gain=1.0, wet=0.3, pan=0.0):
        stereo = clip if clip.ndim == 2 else np.stack([clip * (1 - pan), clip * (1 + pan)], 1)
        for bus, g in ((dry, gain), (send, gain * wet)):
            i = int(t * SR)
            if i >= n:
                continue
            j = min(n, i + len(stereo))
            bus[i:j] += stereo[: j - i] * g

    cta, end_card = starts["cta"], starts["cta"] + sec(90)
    reveal_hit = starts["reveal"] + sec(7)
    S, C = stomp(), clap()

    # Stomp-stomp-clap, every two beats, from the first frame until the CTA.
    t = 0.0
    while t < cta - 0.01:
        energy = 0.75 if t < starts["cascade"] else 1.0
        if starts["handoff"] <= t:
            energy = 0.8
        add(S, t, 0.9 * energy, wet=0.25)
        add(S, t + beat / 2, 0.8 * energy, wet=0.25)
        add(C, t + beat, 0.55 * energy, wet=0.5)
        t += 2 * beat

    # Hats: building through the cascade, driving through the reach.
    for a, b, build in ((starts["cascade"], reveal_hit, True), (starts["reach"], starts["handoff"], False)):
        t = a
        while t < b - 0.01:
            g = 0.15 + (0.35 * (t - a) / (b - a) if build else 0.4)
            add(hat(), t, g, wet=0.1, pan=0.3)
            t += beat / 2

    # Riser into the reveal, then the big hit as the iris opens.
    rise = riser(reveal_hit - starts["cascade"] - 1.0)
    add(rise, reveal_hit - len(rise) / SR, 0.9, wet=0.4)
    add(impact(1.2), reveal_hit, 1.0, wet=0.6)
    add(power_chord("D", 3.0), reveal_hit, 1.0, wet=0.4)

    # Pad under cascade, proof and handoff; progression follows the bar grid.
    def chord_at(t):
        return PROGRESSION[int(t / (4 * beat)) % len(PROGRESSION)]

    for a, b in ((starts["cascade"], reveal_hit), (starts["proof"], starts["reach"]), (starts["handoff"], cta)):
        t = a - (a % (4 * beat))
        while t < b - 0.01:
            seg_start = max(t, a)
            seg_end = min(t + 4 * beat, b)
            add(pad(chord_at(t), seg_end - seg_start + 0.3), seg_start, 1.0, wet=0.35)
            t += 4 * beat

    # Arpeggio through the proof: corporate-tech sparkle under the voice.
    t = starts["proof"] + 2 * beat
    k = 0
    while t < starts["reach"] - 0.01:
        chord = chord_at(t)
        note = chord[k % 3]
        octave = 5 if k % 6 < 3 else 4
        add(pluck(hz(note, octave)), t, 1.0, wet=0.3, pan=0.25 if k % 2 else -0.25)
        t += beat / 4
        k += 1

    # Reach: palm-muted power-chord eighths, open chord on each bar.
    t = starts["reach"]
    while t < starts["handoff"] - 0.01:
        root = chord_at(t)[0]
        bar_start = round(t / (beat / 2)) % 8 == 0
        add(power_chord(root, 4 * beat if bar_start else beat / 2, palm=not bar_start), t, 1.2, wet=0.3)
        t += beat / 2

    # CTA: one hit per word, then a triumphant D major to close.
    for i, root in enumerate(["D", "Bb", "C"]):
        hit = cta + sec(30 * i)
        add(impact(0.5), hit, 0.7, wet=0.5)
        add(S, hit, 1.0, wet=0.3)
        add(power_chord(root, 0.9), hit, 1.0, wet=0.4)
    add(impact(1.6), end_card, 1.0, wet=0.7)
    add(power_chord("D", 4.0), end_card, 1.1, wet=0.5)
    add(pad(("D", "F#", "A"), 4.0), end_card, 1.6, wet=0.5)  # major lift to finish
    for k in range(4):  # final stomps under the end card
        add(S, end_card + beat * (2 + k * 2), 0.6, wet=0.4)
        add(C, end_card + beat * (3 + k * 2), 0.4, wet=0.6)

    ir = reverb_ir()
    wet = np.stack([fftconvolve(send[:, c], ir[c])[:n] for c in range(2)], 1)
    music = dry + wet * 0.55
    music = filt(music.T, "highpass", 30).T  # clean up sub rumble
    return music / np.max(np.abs(music)) * 0.9


def mix(tl, clips, music):
    n = len(music)
    vo = np.zeros(n)
    duck = np.ones(n)
    for pid, c in tl["cues"].items():
        t = sec(tl["scenes"][c["scene"]]["start"] + c["at"])
        place_into(vo, clips[pid], t)
        a, b = int(t * SR), int((t + len(clips[pid]) / SR) * SR)
        duck[max(0, a - int(0.05 * SR)) : min(n, b + int(0.15 * SR))] = 0.38
    # Smooth the ducking envelope (~80 ms) so it breathes instead of clicking.
    k = int(0.08 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode="same")
    vo = vo / max(1e-6, np.max(np.abs(vo))) * 0.9
    out = music * 0.6 * duck[:, None] + vo[:, None]
    out = np.tanh(out * 1.05) * 0.95  # gentle limiter
    return out[: int(sec(tl["total"]) * SR) + int(0.5 * SR)]


# ---------------------------------------------------------------- main


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True, type=pathlib.Path)
    parser.add_argument("--voice")
    args = parser.parse_args()

    config = json.loads(VO_CONFIG.read_text())
    voice = args.voice or config["voice"]
    phrases = config["phrases"]

    print(f"Voiceover ({voice})")
    clips = speak(phrases, voice, args.models)
    timeline = build_timeline(phrases, clips, config["gapFrames"])
    TIMELINE.write_text(json.dumps(timeline, indent=2) + "\n")
    print(f"Timeline: {timeline['total']} frames ({timeline['total'] / FPS:.1f}s) -> {TIMELINE.relative_to(ROOT)}")

    music = compose(timeline)
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(OUT / "alfie-music.wav", music[: int(sec(timeline["total"]) * SR) + int(0.5 * SR)], SR, subtype="PCM_16")
    sf.write(OUT / "alfie-mix.wav", mix(timeline, clips, music), SR, subtype="PCM_16")
    print(f"Wrote {OUT.relative_to(ROOT)}/alfie-music.wav and alfie-mix.wav")


if __name__ == "__main__":
    main()
