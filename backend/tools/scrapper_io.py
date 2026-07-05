"""
Scrapper entegrasyon katmanı.

collect_with_scrapper_sync() — sync çağrı (research_node içinden; thread'de çalışır)
collect_with_scrapper()      — async çağrı (router/future async caller'lar için)

Her ikisi de _scrapper_runner.py'yi subprocess olarak başlatır; böylece
backend/tools/ ile scrapper/tools/ namespace çakışması olmaz.
"""

import re
import sys
import json
import asyncio
import logging
import subprocess
from pathlib import Path
from typing import Optional

from schemas.state import ResearchOutput, Review, ForumThread, YouTubeVideo
from tools.profiler import span as _pspan

logger = logging.getLogger(__name__)


_RUNNER = Path(__file__).parent / "_scrapper_runner.py"


# ---------------------------------------------------------------------------
# Dönüşüm yardımcıları
# ---------------------------------------------------------------------------

def _extract_channel(url: str, title: str) -> tuple[str, str | None]:
    handle_match = re.search(r'/@([A-Za-z0-9_.-]+)', url)
    if handle_match:
        handle = handle_match.group(1)
        return f"@{handle}", f"https://www.youtube.com/@{handle}"
    title_clean = re.sub(r'\s*-\s*YouTube\s*$', '', title, flags=re.IGNORECASE)
    if " - " in title_clean:
        candidate = title_clean.rsplit(" - ", 1)[-1].strip()
        if 2 <= len(candidate) <= 50:
            return candidate, None
    return "", None


def _map_to_research_output(ai_input: dict) -> ResearchOutput:
    reviews: list[Review] = []
    for r in ai_input.get("ecommerce_reviews", []):
        text = (r.get("text") or "").strip()
        if not text:
            continue
        raw_rating = r.get("rating")
        reviews.append(Review(
            text=text,
            source=r.get("source", "unknown"),
            date=r.get("date"),
            length=len(text),
            stars=float(raw_rating) if raw_rating is not None else None,
            photos=r.get("photos") or [],
        ))

    forum_threads: list[ForumThread] = []
    for p in ai_input.get("forum_posts", []):
        url = p.get("url", "")
        if not url:
            continue
        forum_threads.append(ForumThread(
            url=url,
            title=p.get("title", ""),
            snippet=(p.get("text") or "")[:500],
            platform=p.get("source", "other"),
        ))

    youtube_videos: list[YouTubeVideo] = []
    for v in ai_input.get("youtube_videos", []):
        url = v.get("url", "")
        if not url:
            continue
        title = v.get("title", "")
        # Scrapper'dan gelen channel/subscriber_count yoksa veya generic ise fallback yap
        channel = v.get("channel")
        channel_url = v.get("channel_url")
        
        is_generic = not channel or channel.lower().strip() in [
            "bilinmiyor", "unknown", "asmr", "", "belirtilmemiş", "belirtilmemis", "unspecified",
            "@belirtilmemis", "@belirtilmemiş", "@unspecified"
        ]
        
        if is_generic:
            channel_fallback, url_fallback = _extract_channel(url, title)
            if channel_fallback:
                channel = channel_fallback
            if url_fallback and not channel_url:
                channel_url = url_fallback

        # channel_url varsa ama channel hala generic veya bos ise, kanalin url'sinden handle cikarmayi dene
        if channel_url and (not channel or channel.lower().strip() in [
            "bilinmiyor", "unknown", "asmr", "", "belirtilmemiş", "belirtilmemis", "unspecified",
            "@belirtilmemis", "@belirtilmemiş", "@unspecified"
        ]):
            channel_fallback, _ = _extract_channel(channel_url, title)
            if channel_fallback:
                channel = channel_fallback

        if not channel:
            channel = "Teknoloji Kanalı"
        
        youtube_videos.append(YouTubeVideo(
            url=url,
            title=title,
            channel=channel,
            channel_url=channel_url,
            subscriber_count=v.get("subscriber_count"),
            transcript=v.get("transcript"),
            comments=v.get("comments", []),
            reviewer_trust=None,
            duration=v.get("duration"),
            segments=v.get("segments", []),
        ))

    return ResearchOutput(
        reviews=reviews,
        forum_threads=forum_threads,
        youtube_videos=youtube_videos,
        price_data=ai_input.get("price_data", {}),
        qa_items=ai_input.get("qa_items", []),
        hb_summary=ai_input.get("hb_summary"),
    )


def _build_cmd(
    product_name: str,
    trendyol_url: Optional[str],
    hepsiburada_url: Optional[str],
    skip_forums: bool,
    skip_youtube: bool,
) -> list[str]:
    cmd = [sys.executable, str(_RUNNER), product_name]
    if trendyol_url:
        cmd += ["--trendyol-url", trendyol_url]
    if hepsiburada_url:
        cmd += ["--hepsiburada-url", hepsiburada_url]
    if skip_forums:
        cmd.append("--skip-forums")
    if skip_youtube:
        cmd.append("--skip-youtube")
    return cmd


try:
    from langchain_core.callbacks.manager import dispatch_custom_event
except ImportError:
    dispatch_custom_event = None

# ---------------------------------------------------------------------------
# Sync sürüm — research_node (thread context) içinden doğrudan çağrılır
# ---------------------------------------------------------------------------

def collect_with_scrapper_sync(
    product_name: str,
    trendyol_url: Optional[str] = None,
    hepsiburada_url: Optional[str] = None,
    skip_forums: bool = False,
    skip_youtube: bool = False,
    timeout: int = 180,
) -> Optional[ResearchOutput]:
    """Scrapper'ı subprocess olarak başlatır; JSON çıktısını ResearchOutput'a dönüştürür.
    stderr çıktılarını okuyup LangGraph custom event olarak yayınlar.
    """
    if not _RUNNER.exists():
        logger.warning("scrapper_io: _scrapper_runner.py bulunamadı, Tavily fallback'e geçiliyor.")
        return None
    
    import tempfile
    
    try:
        cmd = _build_cmd(product_name, trendyol_url, hepsiburada_url, skip_forums, skip_youtube)

        with _pspan("scrapper:subprocess"), tempfile.TemporaryFile(mode='w+', encoding='utf-8') as stdout_file:
            proc = subprocess.Popen(
                cmd,
                stdout=stdout_file,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace"
            )

            stderr_lines = []
            for line in proc.stderr:
                line_str = line.strip()
                if not line_str:
                    continue
                stderr_lines.append(line_str)
                if dispatch_custom_event:
                    try:
                        dispatch_custom_event("scraper_progress", {"line": line_str})
                    except Exception:
                        pass

            proc.wait(timeout=timeout)
            
            if proc.returncode != 0:
                stderr_text = "\n".join(stderr_lines)
                logger.warning("scrapper_io: subprocess returncode=%d stderr=%s", proc.returncode, stderr_text[:500])
                if "YouTubeRateLimitError" in stderr_text:
                    raise RuntimeError("REQUEUE: YouTube rate limit/block detected. Queueing task for retry later on a different agent/IP.")
                return None
                
            stdout_file.seek(0)
            stdout_text = stdout_file.read()
            ai_input = json.loads(stdout_text)
            try:
                from tools.profiler import register_span
                scrapper_timings = ai_input.get("timings", {})
                for name, elapsed in scrapper_timings.items():
                    register_span(name, float(elapsed))
            except Exception as e:
                logger.warning("scrapper_io: profiler kaydi yapilamadi: %s", e)
            return _map_to_research_output(ai_input)
    except Exception as exc:
        if "REQUEUE" in str(exc):
            raise
        logger.warning("scrapper_io: subprocess hatası: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Async sürüm — router veya async caller'lar için
# ---------------------------------------------------------------------------

async def collect_with_scrapper(
    product_name: str,
    trendyol_url: Optional[str] = None,
    hepsiburada_url: Optional[str] = None,
    skip_forums: bool = False,
    skip_youtube: bool = False,
) -> Optional[ResearchOutput]:
    """Async subprocess sürümü. collect_with_scrapper_sync ile aynı mantık."""
    if not _RUNNER.exists():
        return None
    try:
        cmd = _build_cmd(product_name, trendyol_url, hepsiburada_url, skip_forums, skip_youtube)
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            stderr_text = stderr.decode("utf-8", errors="replace").strip()
            logger.warning("scrapper_io (async): subprocess returncode=%d stderr=%s", proc.returncode, stderr_text[:500])
            if "YouTubeRateLimitError" in stderr_text:
                raise RuntimeError("REQUEUE: YouTube rate limit/block detected. Queueing task for retry later on a different agent/IP.")
            return None
        ai_input = json.loads(stdout.decode("utf-8"))
        try:
            from tools.profiler import register_span
            scrapper_timings = ai_input.get("timings", {})
            for name, elapsed in scrapper_timings.items():
                register_span(name, float(elapsed))
        except Exception as e:
            pass
        return _map_to_research_output(ai_input)
    except Exception as exc:
        if "REQUEUE" in str(exc):
            raise
        return None
