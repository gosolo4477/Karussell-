"""Erzeugt eine 120-BPM-Beat-Spur, die auch über Handy-Lautsprecher gut hörbar ist.

Kick mit Klick, Snare, Hi-Hats, Synth-Akkorde und ein Whoosh vor jedem Folienwechsel.

Aufruf: python3 beat.py <ausgabe.wav> <dauer_in_sekunden> [wechsel_in_sekunden,kommagetrennt]
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM

out, duration = sys.argv[1], float(sys.argv[2])
# Folienwechsel in Sekunden (kommt aus reel.js)
SLIDE_STARTS = [float(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else []

n = int(SR * duration)
left = np.zeros(n)
right = np.zeros(n)
rng = np.random.default_rng(7)


def add(sig, at, pan=0.0):
    """pan: -1 = links, 0 = Mitte, 1 = rechts"""
    i = int(at * SR)
    if i >= n:
        return
    end = min(n, i + len(sig))
    part = sig[: end - i]
    left[i:end] += part * (1 - max(0.0, pan))
    right[i:end] += part * (1 + min(0.0, pan))


def env(length, decay):
    t = np.arange(int(length * SR)) / SR
    return t, np.exp(-t * decay)


def kick():
    t, e = env(0.4, 8)
    freq = 55 + 140 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * e
    body = np.tanh(body * 2.5)  # Sättigung -> Obertöne, auf kleinen Boxen hörbar
    click = rng.uniform(-1, 1, len(t)) * np.exp(-t * 400) * 0.6
    return body * 0.6 + click


def snare():
    t, e = env(0.25, 18)
    noise = np.diff(rng.uniform(-1, 1, len(t)), prepend=0) * e
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return noise * 1.1 + tone * 0.6


def hat(open_=False):
    t, e = env(0.18 if open_ else 0.06, 18 if open_ else 80)
    noise = np.diff(np.diff(rng.uniform(-1, 1, len(t)), prepend=0), prepend=0)
    return noise * e * 0.5


def saw(freq, t):
    return 2 * ((t * freq) % 1.0) - 1


def stab(freqs):
    t, e = env(0.22, 14)
    sig = sum(saw(f, t) + saw(f * 1.006, t) for f in freqs) / (2 * len(freqs))
    sig = np.convolve(sig, np.ones(6) / 6, mode="same")  # etwas weicher
    return sig * e * 0.95


def whoosh(length=0.35):
    t = np.arange(int(length * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    return np.convolve(noise, np.ones(10) / 10, mode="same") * (t / length) ** 2 * 0.6


# Akkordfolge pro Takt (4 Beats): Am - F - C - G
CHORDS = [
    [220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63],
    [196.00, 261.63, 329.63],
    [196.00, 246.94, 293.66],
]

beats = int(duration / BEAT)
for b in range(beats):
    at = b * BEAT
    add(kick(), at)
    if b % 2 == 1:
        add(snare(), at)
    add(hat(), at, pan=-0.4)
    add(hat(open_=(b % 4 == 3)), at + BEAT / 2, pan=0.4)
    chord = CHORDS[(b // 4) % len(CHORDS)]
    add(stab(chord), at + BEAT / 2, pan=0.25 if b % 2 else -0.25)

for at in SLIDE_STARTS:
    add(whoosh(), at - 0.35)

mix = np.stack([left, right], axis=1)
fade = int(0.5 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6)  # sanfter Limiter -> lauter
mix /= np.max(np.abs(mix)) / 0.95

with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
