# Generates the voiceover, one file per line, with word timings for the captions.
# Voice: Microsoft Edge neural TTS (en-US-AndrewMultilingualNeural). No account or key needed.
import asyncio, json, os, sys
import edge_tts

VOICE = os.environ.get("VOICE", "en-US-AndrewMultilingualNeural")
RATE = os.environ.get("RATE", "-6%")
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "build", "voice")
os.makedirs(out, exist_ok=True)

async def line(text, path):
    c = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7})
    return words

async def main():
    script = json.load(open(os.path.join(here, "script.json"), encoding="utf-8"))
    timings = []
    for s in script:
        for i, text in enumerate(s["lines"]):
            path = os.path.join(out, f"{s['scene']}-{i}.mp3")
            for attempt in range(5):
                try:
                    words = await line(text, path)
                    break
                except Exception as e:
                    print("retry", s["scene"], i, e); await asyncio.sleep(2)
            else:
                sys.exit(f"voice failed: {text}")
            timings.append({"scene": s["scene"], "i": i, "text": text, "file": path, "words": words})
            print(s["scene"], i, len(words))
    json.dump(timings, open(os.path.join(out, "timings.json"), "w"), indent=1)

asyncio.run(main())
