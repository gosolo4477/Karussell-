"""Erzeugt eine 120-BPM-Beat-Spur, die auch über Handy-Lautsprecher gut hörbar ist.

Kick mit Klick, Snare, Hi-Hats, Synth-Akkorde und ein Whoosh vor jedem Folienwechsel.

Aufruf: python3 beat.py <ausgabe.wav> <dauer_in_sekunden> [wechsel_in_sekunden,kommagetrennt] [stil]
Stile: "pop" (Standard) oder "deep" (edler Deep-House mit Offbeat-Bass und Plucks)
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM

out, duration = sys.argv[1], float(sys.argv[2])
# Folienwechsel in Sekunden (kommt aus reel.js)
SLIDE_STARTS = [float(x) for x in sys.argv[3].split(",") if x] if len(sys.argv) > 3 else []
STYLE = sys.argv[4] if len(sys.argv) > 4 else "pop"

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


def pop_pattern():
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



# --- Deep House: weicher Kick, Clap, Shaker, Offbeat-Bass, Plucks mit Echo ---------
def deep_kick():
    t, e = env(0.45, 6)
    freq = 48 + 90 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * e
    click = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 300) * 0.25
    return np.tanh(body * 1.8) * 0.75 + click


def clap():
    t, e = env(0.3, 14)
    noise = np.diff(rng.uniform(-1, 1, len(t)), prepend=0)
    burst = np.zeros(len(t))
    for d in (0, 0.012, 0.024):  # drei kurze Anschläge wie Handklatschen
        i = int(d * SR)
        burst[i:] += np.exp(-np.arange(len(t) - i) / SR * 60)
    return noise * (burst * 0.5 + e * 0.6) * 0.8


def shaker(accent):
    t, e = env(0.05, 90)
    noise = np.diff(rng.uniform(-1, 1, len(t)), prepend=0)
    return noise * e * (0.32 if accent else 0.18)


def deep_bass(freq):
    t, e = env(0.2, 9)
    sig = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t)
    return np.tanh(sig * 1.6) * e * 0.55


def pluck(freqs):
    t, e = env(0.45, 9)
    sig = sum(np.sin(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.25 * np.exp(-t * 12) for f in freqs)
    return sig / len(freqs) * e * 0.55


def pad(freqs, length):
    t = np.arange(int(length * SR)) / SR
    sig = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.3 * t)) + np.sin(2 * np.pi * f * 1.004 * t) for f in freqs)
    env_ = np.minimum(1, t / 0.4) * np.minimum(1, (length - t) / 0.4)
    return sig / (2 * len(freqs)) * env_ * 0.12


# Akkorde pro 2 Takte (8 Beats): Fm9 - Dbmaj7 - Abmaj7 - Eb6 (warm, elegant)
DEEP = [
    (87.31, [349.23, 415.30, 523.25, 783.99]),
    (69.30, [349.23, 415.30, 523.25, 698.46]),
    (103.83, [311.13, 392.00, 523.25, 622.25]),
    (77.78, [311.13, 392.00, 466.16, 523.25]),
]


def deep_pattern():
    for b in range(beats):
        at = b * BEAT
        bass_f, chord = DEEP[(b // 8) % len(DEEP)]
        add(deep_kick(), at)
        if b % 2 == 1:
            add(clap(), at, pan=0.1)
        for k in range(4):  # Sechzehntel-Shaker
            add(shaker(k == 2), at + k * BEAT / 4, pan=0.35 if k % 2 else -0.35)
        add(hat(open_=True), at + BEAT / 2, pan=-0.2)  # Offbeat-Hi-Hat
        add(deep_bass(bass_f), at + BEAT / 2)
        if b % 8 == 0:
            add(pad(chord, 8 * BEAT), at)
        # Pluck-Melodie mit Echo (punktierte Achtel)
        if b % 2 == 0 or b % 8 == 7:
            notes = chord[(b // 2) % len(chord):] + chord
            p = pluck([notes[0]])
            off = 0.75 * BEAT if b % 4 == 2 else 0
            add(p, at + off, pan=0.3)
            add(p * 0.45, at + off + 0.75 * BEAT, pan=-0.3)
            add(p * 0.2, at + off + 1.5 * BEAT, pan=0.3)

    for at in SLIDE_STARTS:
        add(whoosh(0.5) * 0.8, at - 0.5)


(deep_pattern if STYLE == "deep" else pop_pattern)()

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
