"""Generate the Alfie voiceover with Kokoro (open-source TTS, runs locally).

Setup (once):
  python3 -m venv .venv-tts && .venv-tts/bin/pip install kokoro-onnx soundfile
  Download kokoro-v1.0.int8.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Run from motion/:
  .venv-tts/bin/python scripts/generate-voiceover.py --models <dir with the two files> [--voice am_michael]

Each line is pinned to a frame in src/alfie/voiceover.json. A line that would run
into the next one is regenerated slightly faster (up to 1.25x); anything still too
long is reported so the copy can be shortened.
"""

import argparse
import json
import pathlib

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / "src/alfie/voiceover.json"
OUT = ROOT / "public/voiceover/alfie"
GAP_FRAMES = 3  # breathing room before the next line starts
MAX_SPEED = 1.25


def trim(audio: np.ndarray, sr: int, threshold: float = 0.01) -> np.ndarray:
    """Cut leading/trailing silence, keeping 40ms of tail."""
    loud = np.where(np.abs(audio) > threshold)[0]
    if len(loud) == 0:
        return audio
    return audio[loud[0] : min(len(audio), loud[-1] + int(sr * 0.04))]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True, type=pathlib.Path)
    parser.add_argument("--voice")
    args = parser.parse_args()

    config = json.loads(CONFIG.read_text())
    voice = args.voice or config["voice"]
    lang = "en-us" if voice.startswith("a") else "en-gb"
    fps = config["fps"]
    lines = config["lines"]
    kokoro = Kokoro(
        str(args.models / "kokoro-v1.0.int8.onnx"), str(args.models / "voices-v1.0.bin")
    )
    OUT.mkdir(parents=True, exist_ok=True)

    for i, line in enumerate(lines):
        next_at = lines[i + 1]["at"] if i + 1 < len(lines) else config["end"]
        window = (next_at - line["at"] - GAP_FRAMES) / fps

        speed = 1.0
        audio, sr = kokoro.create(line["text"], voice=voice, speed=speed, lang=lang)
        audio = trim(audio, sr)
        if len(audio) / sr > window:
            speed = min(MAX_SPEED, len(audio) / sr / window * 1.03)
            audio, sr = kokoro.create(line["text"], voice=voice, speed=speed, lang=lang)
            audio = trim(audio, sr)

        # Peak-normalize to -1 dBFS so every line sits at the same level.
        audio = audio / max(1e-6, np.max(np.abs(audio))) * 10 ** (-1 / 20)
        sf.write(OUT / f"{line['id']}.wav", audio, sr)

        duration = len(audio) / sr
        status = "OK" if duration <= window else "TOO LONG, shorten the copy"
        print(f"{line['id']:<14} {duration:5.2f}s / {window:5.2f}s  speed {speed:.2f}  {status}")


if __name__ == "__main__":
    main()
