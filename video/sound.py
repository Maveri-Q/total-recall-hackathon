# Original music and sound effects for the demo video, made from scratch with numpy (no samples, no licences).
# The music follows the scenes: video/build/sections.json (written by render.mts) gives each scene's start.
# Writes 48 kHz WAVs to video/build/audio/.
import json, os, wave
import numpy as np
from scipy.signal import lfilter, butter

SR = 48000
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "build", "audio")
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)

BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT


def save(name, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    with wave.open(os.path.join(out, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def lp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), "low"); return lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), "high"); return lfilter(b, a, x)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ts(sec):
    return np.arange(int(sec * SR)) / SR


# ---------- instruments ----------
def kick():
    t = ts(0.42)
    f = 46 + 95 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.25 * lp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120)


def hat(open_=False):
    t = ts(0.25 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.5


def clap():
    t = ts(0.3)
    env = sum(np.exp(-np.maximum(t - d, 0) * 60) * (t >= d) for d in (0, 0.011, 0.022)) + 0.5 * np.exp(-t * 14)
    n = lfilter(*butter(2, [900 / (SR / 2), 3500 / (SR / 2)], "band"), rng.standard_normal(len(t)))
    return n * env * 0.6


def bass(m, sec):
    t = ts(sec); f = hz(m)
    w = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6))
    env = np.minimum(1, t / 0.008) * np.exp(-t * 3.2)
    return lp(w, 520) * env * 0.5


_pl = {}
def pluck(m, sec=0.7):
    # Karplus-Strong string, cached per note.
    if m in _pl: return _pl[m]
    f = hz(m); n = int(sec * SR); p = max(2, int(SR / f))
    buf = list(rng.uniform(-1, 1, p)); y = np.empty(n)
    for i in range(n):
        j = i % p
        y[i] = buf[j]
        buf[j] = 0.5 * (buf[j] + buf[(j + 1) % p]) * 0.996
    _pl[m] = lp(y, 4200) * 0.45
    return _pl[m]


def pad_chord(notes, sec):
    # Warm pad: three slightly detuned saw voices per note, softened with a low-pass filter.
    t = ts(sec)
    env = np.minimum(1, t / 1.4) * np.minimum(1, np.maximum(0, (sec - t) / 1.2))
    L = np.zeros(len(t)); R = np.zeros(len(t))
    for j, m in enumerate(notes):
        f = hz(m)
        for k, det in enumerate((-0.12, 0.0, 0.12)):
            ph = (f * 2 ** (det / 12)) * t + rng.random()
            saw = 2 * (ph % 1) - 1
            (L if k != 2 else R)[:] += saw * (0.7 if k == 1 else 1)
            if k == 1: R[:] += saw * 0.7
    vib = 1 + 0.0 * t
    return np.stack([lp(L, 1500, 4), lp(R, 1500, 4)], 1) * env[:, None] * 0.045


def riser(sec):
    t = ts(sec); p = t / sec
    noise = rng.standard_normal(len(t))
    y = np.zeros(len(t)); step = int(0.02 * SR)
    for s in range(0, len(t), step):
        c = 300 + 6000 * p[s] ** 2
        y[s:s + step] = lfilter(*butter(1, min(c, 20000) / (SR / 2), "low"), noise[s:s + step])
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * p ** 2) / SR) * 0.15
    return (y * 0.6 + tone) * p ** 2


def impact():
    t = ts(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    crash = hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 3) * 0.25
    return boom * 0.9 + crash


# ---------- arrangement ----------
def music(sections):
    total = sections["total"] + 3
    S = sections["start"]
    n = int(total * SR)
    mix = np.zeros((n, 2))
    kicks = []

    def put(x, at, gain=1.0, pan=0.0):
        s = int(at * SR)
        if s >= n or s < 0: return
        if x.ndim == 1:
            x = np.stack([x * (1 - max(0, pan)), x * (1 + min(0, pan))], 1)
        e = min(n, s + len(x)); mix[s:e] += x[:e - s] * gain

    # Fmaj7 - Am7 - Dm9 - Bbmaj9, 2 bars each.
    chords = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 65], [46, 53, 57, 62]]
    roots = [41, 45, 38, 46]
    arps = [[65, 69, 72, 76, 72, 69], [64, 69, 72, 76, 72, 69], [62, 65, 69, 72, 69, 65], [62, 65, 70, 74, 70, 65]]

    def level(t):
        """0 pad only, 1 heartbeat, 2 groove, 3 groove + pluck, 4 full band, -1 breakdown (pad + pluck)."""
        if t < S["problem"]: return 0
        if t < S["read"]: return 1
        if t < S["grade"]: return 2
        if t < S["learn"]: return 3
        if t < S["recall"]: return 4
        if t < S["call"]: return -1
        if t < S["close"]: return 4
        return 0

    for b in range(int(total / BAR) + 1):
        t0 = b * BAR
        ci = (b // 2) % 4
        if b % 2 == 0: put(pad_chord(chords[ci], 2 * BAR + 1.2), t0)
        for beat in range(4):
            tb = t0 + beat * BEAT
            lv = level(tb)
            if lv == 1 and beat in (0, 2):
                put(kick() * 0.55, tb); kicks.append(tb)
            if lv >= 2:
                put(kick() * 0.8, tb); kicks.append(tb)
                put(hat(), tb + BEAT / 2, 0.35, pan=0.3)
                for e in range(2):
                    put(bass(roots[ci] + (12 if (beat * 2 + e) % 4 == 3 else 0), BEAT / 2), tb + e * BEAT / 2, 0.75)
            if lv >= 4 and beat in (1, 3):
                put(clap(), tb, 0.35, pan=-0.1)
            if lv >= 4 and beat == 3:
                put(hat(True), tb + BEAT / 2, 0.18, pan=0.4)
            if lv >= 3 or lv == -1:
                arp = arps[ci]
                for e in range(2):
                    m = arp[(beat * 2 + e + b * 8) % len(arp)]
                    put(pluck(m, 0.8), tb + e * BEAT / 2, 0.28 if lv != -1 else 0.36, pan=0.35 if e else -0.35)

    # Each kick pumps the mix a little, so the groove breathes.
    env = np.ones(n); l = int(0.3 * SR)
    for k in kicks:
        s = int(k * SR); e = min(n, s + l)
        env[s:e] = np.minimum(env[s:e], 0.6 + 0.4 * np.linspace(0, 1, e - s))
    mix *= env[:, None]

    # Riser into the drop at the first app scene, a hush on "Who do you trust?", an impact on the drop.
    drop = S["read"]
    put(riser(3.0) * 0.5, drop - 3.0)
    g0, g1 = int((drop - 0.45) * SR), int(drop * SR)
    mix[g0:g1] *= np.linspace(1, 0.2, g1 - g0)[:, None]
    put(impact() * 0.6, drop - 0.02)
    put(riser(2.0) * 0.35, S["close"] - 2.0)
    put(impact() * 0.45, S["close"] - 0.02)

    # Room: a soft 2.4 s reverb tail, so the music sits in a space instead of sounding dry.
    from scipy.signal import fftconvolve
    rt = ts(2.4)
    ir = rng.standard_normal((len(rt), 2)) * np.exp(-rt * 2.9)[:, None]
    ir[:, 0] = lp(ir[:, 0], 5000); ir[:, 1] = lp(ir[:, 1], 5000)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    wet = np.stack([fftconvolve(mix[:, c], ir[:, c])[:n] for c in range(2)], 1)
    mix = mix + 0.32 * wet
    # Clean up: no rumble, a little air, gentle glue compression.
    mix = np.stack([hp(mix[:, c], 35) for c in range(2)], 1)
    peak = np.abs(mix).max()
    mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4)
    t = np.arange(n) / SR
    mix *= (np.minimum(1, t / 2.0) * np.clip((total - t) / 4.0, 0, 1))[:, None]
    return mix / np.abs(mix).max() * 0.9


def whoosh(sec=0.9):
    r = riser(sec); return (r[::-1] * 0.4 + r * 0.6) * 0.8


def stamp():
    t = ts(0.6)
    thump = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-t * 10)) / SR) * np.exp(-t * 11)
    return (thump + lp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 90) * 0.4) * 0.8


def tick():
    t = ts(0.08)
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 70) * 0.25


def pop():
    t = ts(0.12)
    return np.sin(2 * np.pi * np.cumsum(500 + 900 * t / 0.12) / SR) * np.exp(-t * 40) * 0.3


def chime():
    t = ts(1.6)
    x = sum(np.sin(2 * np.pi * hz(m) * t) * a for m, a in ((84, 0.5), (88, 0.35), (91, 0.3)))
    return x * np.exp(-t * 3.2) * np.minimum(1, t / 0.01) * 0.35


sec_path = os.path.join(here, "build", "sections.json")
if os.path.exists(sec_path):
    save("music.wav", music(json.load(open(sec_path))))
save("whoosh.wav", whoosh())
save("stamp.wav", stamp())
save("tick.wav", tick())
save("pop.wav", pop())
save("chime.wav", chime())
print("ok")
