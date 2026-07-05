"""
Whisper transkripsiyon worker'i — subprocess ile ayri surecte calisir.
Oncelik: 1) yt-dlp + cookies ile subtitle, 2) audio + faster-whisper.
Kullanim: python -m tools.whisper_worker <video_id>
Cikti: stdout'a JSON ({"text": "...", "error": null, "duration": 1.2})
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

_CACHE_DIR = Path(__file__).parent.parent / ".youtube_cache"
_AUDIO_CACHE_DIR = _CACHE_DIR / "audio"


def _cookie_file() -> str:
    for p in [Path("youtube_cookies.txt"), Path(__file__).parent.parent / "youtube_cookies.txt"]:
        if p.exists():
            return str(p.resolve())
    return ""


def try_ytdlp_subs(video_id: str) -> str:
    """yt-dlp ile subtitle indir. Sadece cookies.txt dener, browser denenmez (429 riski)."""
    url = f"https://www.youtube.com/watch?v={video_id}"

    cf = _cookie_file()
    if not cf:
        return ""

    sub_formats = [("json3", "tr,en"), ("json3", "en")]

    for sub_fmt, langs in sub_formats:
        with tempfile.TemporaryDirectory() as tmp:
            try:
                cmd = [
                    "yt-dlp", "--skip-download",
                    "--write-subs", "--write-auto-subs",
                    "--sub-langs", langs,
                    "--sub-format", sub_fmt,
                    "--no-warnings",
                    "--cookies", cf,
                    "-o", os.path.join(tmp, "%(id)s"),
                    url,
                ]
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                for fname in os.listdir(tmp):
                    fpath = os.path.join(tmp, fname)
                    with open(fpath, encoding="utf-8", errors="replace") as fh:
                        raw = fh.read()
                    if sub_fmt == "json3":
                        try:
                            j = json.loads(raw)
                            parts = [e.get("text", "") for e in j.get("events", []) if e.get("segs")]
                            text = " ".join(p for p in parts if p).strip()
                            if text and len(text) > 50:
                                return text
                        except Exception:
                            pass
                    else:
                        text = re.sub(r"^WEBVTT.*?\n\n", "", raw, flags=re.DOTALL)
                        text = re.sub(r"\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*?\n", "", text)
                        text = re.sub(r"<[^>]+>", "", text)
                        text = re.sub(r"\n+", " ", text).strip()
                        if text and len(text) > 50:
                            return text
            except Exception:
                continue
    return ""


def download_audio(video_id: str) -> str:
    _AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = _AUDIO_CACHE_DIR / f"{video_id}.mp3"
    if cached.exists() and cached.stat().st_size > 1000:
        return str(cached)

    tmp = tempfile.mkdtemp()
    try:
        out = os.path.join(tmp, f"{video_id}.mp3")
        r = subprocess.run(
            ["yt-dlp", "--extract-audio", "--audio-format", "mp3",
             "--audio-quality", "0", "-o", out.replace(".mp3", ""),
             f"https://www.youtube.com/watch?v={video_id}"],
            capture_output=True, text=True, timeout=120,
        )
        if r.returncode != 0 or not os.path.exists(out):
            return ""
        shutil.move(out, str(cached))
        return str(cached)
    except Exception:
        return ""
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def transcribe_audio(audio_path: str) -> str:
    model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
    device = os.getenv("WHISPER_DEVICE", "auto")
    compute = os.getenv("WHISPER_COMPUTE", "auto")

    if device == "auto":
        try:
            import ctranslate2
            if "cuda" in ctranslate2.get_supported_compute_types():
                device = "cuda"
                compute = "float16"
            else:
                device = "cpu"
                compute = "int8"
        except Exception:
            device = "cpu"
            compute = "int8"

    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device=device, compute_type=compute)
    segments, _ = model.transcribe(audio_path, beam_size=3)
    return " ".join(s.text.strip() for s in segments)


def cache_get(video_id: str) -> str | None:
    p = _CACHE_DIR / f"whisper_{video_id}.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return None


def cache_set(video_id: str, text: str):
    try:
        (_CACHE_DIR / f"whisper_{video_id}.json").write_text(
            json.dumps(text, ensure_ascii=False), encoding="utf-8"
        )
    except Exception:
        pass


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "video_id required"}), file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1]
    t0 = time.time()

    cached = cache_get(video_id)
    if cached:
        result = {"text": cached, "duration": time.time() - t0, "cached": True}
        print(json.dumps(result))
        return

    # Once: yt-dlp + cookies ile subtitle dene
    text = try_ytdlp_subs(video_id)
    if text and len(text) > 50:
        cache_set(video_id, text)
        result = {"text": text, "duration": time.time() - t0, "method": "subs"}
        print(json.dumps(result))
        return

    # Subtitle yoksa veya hata verdiyse: FAST WHISPER (tiny model)
    try:
        audio_path = download_audio(video_id)
        if audio_path:
            # Model size tiny olarak zorlanir (Hiz oncelikli)
            os.environ["WHISPER_MODEL_SIZE"] = "tiny"
            text = transcribe_audio(audio_path)
            if text and len(text) > 50:
                cache_set(video_id, text)
                result = {"text": text, "duration": time.time() - t0, "method": "whisper_tiny"}
                print(json.dumps(result))
                return
    except Exception as e:
        pass

    result = {"text": "", "duration": time.time() - t0, "error": "subs and whisper failed"}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
