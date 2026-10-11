"""Erzeugt eine einfache 120-BPM-Beat-Spur (Kick, Clap, Hi-Hat, Whoosh vor jedem Folienwechsel).

Aufruf: python3 beat.py <ausgabe.wav> <dauer_in_sekunden>
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
# Folienwechsel in Beats (muss zu SLIDES in reel.js passen)
SLIDE_STARTS = [8, 12, 20, 24, 32]

out, duration = sys.argv[1], float(sys.argv[2])
n = int(SR * duration)
mix = np.zeros(n)
rng = np.random.default_rng(7)


def add(sig, at):
    i = int(at * SR)
    end = min(n, i + len(sig))
    if i < n:
        mix[i:end] += sig[: end - i]


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    freq = 50 + 110 * np.exp(-t * 30)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-t * 9) * 0.9


def clap():
    t = np.arange(int(0.2 * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    noise = np.diff(noise, prepend=0)  # heller
    return noise * np.exp(-t * 22) * 0.35


def hat():
    t = np.arange(int(0.06 * SR)) / SR
    noise = np.diff(rng.uniform(-1, 1, len(t)), prepend=0)
    return noise * np.exp(-t * 70) * 0.18


def whoosh(length=0.3):
    t = np.arange(int(length * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    env = (t / length) ** 2
    return np.convolve(noise, np.ones(8) / 8, mode="same") * env * 0.35


beats = int(duration / BEAT)
for b in range(beats):
    at = b * BEAT
    add(kick(), at)
    if b % 2 == 1:
        add(clap(), at)
    add(hat(), at + BEAT / 2)

for b in SLIDE_STARTS:
    add(whoosh(), b * BEAT - 0.3)

# sanft ausblenden
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)
mix /= np.max(np.abs(mix)) / 0.89

with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
