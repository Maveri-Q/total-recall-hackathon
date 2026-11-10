# Generates the voiceover with ElevenLabs, one file per line, with word timings for the captions.
# Reads ELEVENLABS_API_KEY from .env.local (never printed). Writes video/build/voice-11/.
#
#   python video/voice_eleven.py                 the whole script, with VOICE_ID (default: George)
#   python video/voice_eleven.py --samples       one line in a few voices, to pick from
import base64, json, os, sys, time, urllib.request, urllib.error

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)

def key():
    for line in open(os.path.join(root, ".env.local"), encoding="utf-8"):
        if line.strip().startswith("ELEVENLABS_API_KEY="):
            k = line.split("=", 1)[1].strip().strip('"').strip("'")
            if k:
                return k
    sys.exit("ELEVENLABS_API_KEY is not set in .env.local")

KEY = key()
MODEL = os.environ.get("MODEL", "eleven_multilingual_v2")
VOICES = {  # ElevenLabs default voices
    "george": "JBFqnCBsd6RMkjVDRZzb",   # warm British narrator
    "brian": "nPczCjzI2devNBz1zQrb",    # deep American narrator
    "daniel": "onwK4e9ZLuTAKqWW03F9",   # British, news style
    "eric": "cjVigY5qzO86Huf0OWal",     # smooth, friendly
}
VOICE_ID = VOICES.get(os.environ.get("VOICE", "george"), os.environ.get("VOICE", VOICES["george"]))
SETTINGS = {"stability": 0.42, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": 0.96}


def tts(text, path, prev="", nxt="", voice=VOICE_ID):
    body = {"text": text, "model_id": MODEL, "voice_settings": SETTINGS, "previous_text": prev, "next_text": nxt}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"}, method="POST")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                res = json.load(r)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:300]
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(3 * (attempt + 1)); continue
            sys.exit(f"ElevenLabs error {e.code}: {msg}")
    open(path, "wb").write(base64.b64decode(res["audio_base64"]))
    # Character timings -> word timings.
    a = res.get("normalized_alignment") or res["alignment"]
    words, cur, start, end = [], "", None, 0.0
    for ch, s, e in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if ch.isspace():
            if cur: words.append({"w": cur, "t": start, "d": end - start}); cur, start = "", None
            continue
        if start is None: start = s
        cur += ch; end = e
    if cur: words.append({"w": cur, "t": start, "d": end - start})
    return words


if "--samples" in sys.argv:
    out = os.path.join(here, "build", "voice-samples"); os.makedirs(out, exist_ok=True)
    line = "Every reading is stamped on Sui Mainnet, through Tatum. Nobody can change it later. Not even us."
    for name, vid in VOICES.items():
        tts(line, os.path.join(out, f"{name}.mp3"), voice=vid); print("sample", name)
    sys.exit(0)

out = os.path.join(here, "build", "voice-11"); os.makedirs(out, exist_ok=True)
script = json.load(open(os.path.join(here, "script.json"), encoding="utf-8"))
flat = [(s["scene"], i, t) for s in script for i, t in enumerate(s["lines"])]
timings = []
for k, (scene, i, text) in enumerate(flat):
    path = os.path.join(out, f"{scene}-{i}.mp3")
    prev = flat[k - 1][2] if k else ""
    nxt = flat[k + 1][2] if k + 1 < len(flat) else ""
    words = tts(text, path, prev, nxt)
    timings.append({"scene": scene, "i": i, "text": text, "file": path, "words": words})
    print(scene, i, f"{words[-1]['t'] + words[-1]['d']:.2f}s")
json.dump(timings, open(os.path.join(out, "timings.json"), "w"), indent=1)
