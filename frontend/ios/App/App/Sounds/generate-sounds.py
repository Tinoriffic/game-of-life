#!/usr/bin/env python3
"""Synthesize the two notification sounds for the timers, then convert to CAF.

These mirror the app's in-app Web Audio cues (frontend/src/utils/sound.js and
the WorkoutLogger rest alarm) so the locked-screen sound matches what you hear
in the foreground:

  - meditation-end.caf : three ascending bell strikes (432 / 540 / 648 Hz),
    soft attack + long decay. Calm, matches playEndChime().
  - rest-over.caf      : an urgent two-tone (880 / 1175 Hz) repeated three
    times. Attention-grabbing, matches the workout alertCue().
  - silence.caf        : a short silent loop the plugin plays (at volume 0) to
    keep an AVAudioSession — and thus the app — alive while a timer counts down
    in the background, so the alarm can fire on time. See TimerBridge.swift.

Run:  python3 generate-sounds.py
Requires only the Python stdlib + macOS `afconvert` (for CAF encoding).

Regenerate whenever you want to tweak the sounds; commit the resulting .caf.
"""
import math
import struct
import subprocess
import wave
from pathlib import Path

RATE = 44100
HERE = Path(__file__).resolve().parent


def _write_wav(path, samples):
    """Write mono 16-bit PCM, samples in [-1, 1]."""
    peak = max(1e-9, max(abs(s) for s in samples))
    norm = 0.89 / peak  # leave a little headroom
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = bytearray()
        for s in samples:
            v = int(max(-1.0, min(1.0, s * norm)) * 32767)
            frames += struct.pack("<h", v)
        w.writeframes(bytes(frames))


def _mix(total_seconds):
    return [0.0] * int(RATE * total_seconds)


def _add_bell(buf, freq, start, dur, gain=1.0):
    """A warm bell strike: fundamental + soft 2nd harmonic, exp decay."""
    n0 = int(start * RATE)
    for i in range(int(dur * RATE)):
        idx = n0 + i
        if idx >= len(buf):
            break
        t = i / RATE
        env = math.exp(-t * 3.2)               # long, gentle decay
        attack = min(1.0, t / 0.02)            # 20 ms soft attack
        tone = math.sin(2 * math.pi * freq * t) + 0.28 * math.sin(2 * math.pi * freq * 2 * t)
        buf[idx] += gain * attack * env * tone


def _add_beep(buf, freq, start, dur, gain=1.0):
    """A sharp attention beep: triangle-ish (odd harmonics), fast decay."""
    n0 = int(start * RATE)
    for i in range(int(dur * RATE)):
        idx = n0 + i
        if idx >= len(buf):
            break
        t = i / RATE
        env = min(1.0, t / 0.005) * math.exp(-t * 6.0)   # snappy
        tone = (math.sin(2 * math.pi * freq * t)
                + 0.20 * math.sin(2 * math.pi * freq * 3 * t)
                + 0.08 * math.sin(2 * math.pi * freq * 5 * t))
        buf[idx] += gain * env * tone


def build_meditation():
    buf = _mix(3.4)
    _add_bell(buf, 432, 0.00, 1.8)
    _add_bell(buf, 540, 0.55, 1.8)
    _add_bell(buf, 648, 1.10, 2.3)
    return buf


def build_rest():
    buf = _mix(2.6)
    for k in range(3):                 # three urgent two-tone pulses
        t0 = k * 0.75
        _add_beep(buf, 880, t0, 0.18)
        _add_beep(buf, 1175, t0 + 0.20, 0.24)
    return buf


def build_silence():
    # 0.5 s of true silence; looped by the plugin as a keep-alive track.
    return _mix(0.5)


def convert(wav_path, caf_path):
    # IMA4-in-CAF: a compact, iOS-approved notification sound format.
    subprocess.run(
        ["afconvert", str(wav_path), str(caf_path), "-d", "ima4", "-f", "caff"],
        check=True,
    )


def main():
    builders = (
        ("meditation-end", build_meditation),
        ("rest-over", build_rest),
        ("silence", build_silence),
    )
    for name, builder in builders:
        wav = HERE / f"{name}.wav"
        caf = HERE / f"{name}.caf"
        _write_wav(wav, builder())
        convert(wav, caf)
        wav.unlink()   # keep only the .caf in the repo
        print(f"wrote {caf.name}")


if __name__ == "__main__":
    main()
