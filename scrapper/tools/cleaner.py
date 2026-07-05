import re
from collections import Counter


def clean_reviews(reviews: list[dict]) -> tuple[list[dict], dict]:
    if not reviews:
        return [], {"total": 0, "removed_null": 0, "removed_duplicate": 0, "removed_short": 0, "final": 0}

    total = len(reviews)
    removed_null = 0
    removed_short = 0
    removed_duplicate = 0
    kept: list[dict] = []

    seen_texts: set = set()

    for rev in reviews:
        text = rev.get("text", "")
        if not text or not text.strip():
            removed_null += 1
            continue

        text = text.strip()

        if len(text) < 10:
            removed_short += 1
            continue

        norm = _normalize(text)
        key = norm[:120]

        if key in seen_texts:
            removed_duplicate += 1
            continue

        seen_texts.add(key)
        rev["text"] = text
        kept.append(rev)

    stats = {
        "total": total,
        "removed_null": removed_null,
        "removed_short": removed_short,
        "removed_duplicate": removed_duplicate,
        "final": len(kept),
    }
    return kept, stats


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9ğüşıöç\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_youtube_videos(videos: list[dict]) -> tuple[list[dict], dict]:
    if not videos:
        return [], {"total": 0, "removed_no_transcript": 0, "final": 0}

    total = len(videos)
    removed_no_content = 0

    kept = []
    for v in videos:
        has_transcript = bool(v.get("transcript", ""))
        has_segments = len(v.get("segments", [])) > 0
        if has_transcript or has_segments:
            kept.append(v)
        else:
            removed_no_content += 1

    return kept, {"total": total, "removed_no_transcript": removed_no_content, "final": len(kept)}


def clean_forum_posts(posts: list[dict]) -> tuple[list[dict], dict]:
    return clean_reviews(posts)


def clean_all(data: dict) -> dict:
    total_stats: dict[str, dict] = {}

    ecom, s1 = clean_reviews(data.get("ecommerce_reviews", []))
    total_stats["ecommerce"] = s1
    data["ecommerce_reviews"] = ecom

    forum, s2 = clean_forum_posts(data.get("forum_posts", []))
    total_stats["forum"] = s2
    data["forum_posts"] = forum

    yt, s3 = clean_youtube_videos(data.get("youtube_videos", []))
    total_stats["youtube"] = s3
    data["youtube_videos"] = yt

    all_combined, s4 = clean_reviews(data.get("all_reviews", []))
    total_stats["all_reviews"] = s4
    data["all_reviews"] = all_combined

    data["cleaner_stats"] = total_stats

    return data
