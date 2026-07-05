import re
from concurrent.futures import ThreadPoolExecutor

from schemas.state import ProductState, ResearchOutput, ForumThread, YouTubeVideo
from agents.orchestrator import advance_phase
from tools.tavily import search
from tools.scrapper_io import collect_with_scrapper_sync
from prompts.research import youtube_search_query, forum_search_query


_FORUM_DOMAINS = [
    "donanimhaber.com",
    "technopat.net",
    "sikayetvar.com",
    "eksisozluk.com",
    "webtekno.com",
]

_YOUTUBE_DOMAINS = ["youtube.com", "youtu.be"]


def _extract_channel(url: str, title: str, content: str) -> tuple[str, str | None]:
    handle_match = re.search(r'/@([A-Za-z0-9_.-]+)', url)
    if handle_match:
        handle = handle_match.group(1)
        return f"@{handle}", f"https://www.youtube.com/@{handle}"

    title_clean = re.sub(r'\s*-\s*YouTube\s*$', '', title, flags=re.IGNORECASE)
    if " - " in title_clean:
        candidate = title_clean.rsplit(" - ", 1)[-1].strip()
        if 2 <= len(candidate) <= 50:
            return candidate, None

    content_match = re.search(r'\bby\s+([A-Za-zÇçĞğİıÖöŞşÜü][^\n,]{2,40})', content)
    if content_match:
        return content_match.group(1).strip(), None

    return "", None


def _search_youtube(product_name: str) -> list[YouTubeVideo]:
    results = search(
        youtube_search_query(product_name),
        max_results=8,
        include_domains=_YOUTUBE_DOMAINS,
        search_depth="advanced",
    )
    videos: list[YouTubeVideo] = []
    for r in results:
        url = r.get("url", "")
        if not url:
            continue
        channel, channel_url = _extract_channel(url, r.get("title", ""), r.get("content", ""))
        videos.append(YouTubeVideo(
            url=url,
            title=r.get("title", ""),
            channel=channel,
            channel_url=channel_url,
            subscriber_count=None,
            transcript=None,
            comments=[],
            reviewer_trust=None,
        ))
    return videos


def _search_forums(product_name: str) -> list[ForumThread]:
    results = search(
        forum_search_query(product_name),
        max_results=15,
        include_domains=_FORUM_DOMAINS,
        search_depth="advanced",
    )
    threads: list[ForumThread] = []
    for r in results:
        url = r.get("url", "")
        if not url:
            continue
        threads.append(ForumThread(
            url=url,
            title=r.get("title", ""),
            snippet=r.get("content", "")[:500],
            platform=_detect_platform(url),
        ))
    return threads


def _detect_platform(url: str) -> str:
    for domain in _FORUM_DOMAINS:
        if domain in url:
            return domain.split(".")[0]
    return "other"


def research_node(state: ProductState) -> ProductState:
    product_name = state["product_name"]
    product_url = state.get("product_url") or ""

    # URL detection and name cleanup
    if product_name.startswith("http://") or product_name.startswith("https://"):
        product_url = product_name

    def clean_name_from_url(url: str, domain: str) -> str:
        try:
            path = url.split(domain)[-1].split("?")[0]
            parts = [p for p in path.split("/") if p]
            if not parts:
                return ""
            name_segment = parts[-1]
            if "-p-" in name_segment:
                name_segment = name_segment.split("-p-")[0]
            elif "-pm-" in name_segment:
                name_segment = name_segment.split("-pm-")[0]
            name_clean = name_segment.replace("-", " ")
            if domain == "trendyol.com" and len(parts) > 1:
                brand = parts[0].replace("-", " ")
                if brand not in name_clean:
                    name_clean = f"{brand} {name_clean}"
            return name_clean.strip()
        except:
            return ""

    if product_url:
        extracted_name = ""
        if "trendyol.com" in product_url:
            extracted_name = clean_name_from_url(product_url, "trendyol.com")
        elif "hepsiburada.com" in product_url:
            extracted_name = clean_name_from_url(product_url, "hepsiburada.com")
        if extracted_name:
            product_name = extracted_name
            state["product_name"] = product_name
            state["product_url"] = product_url

    try:
        trendyol_url = product_url if "trendyol" in product_url else None
        hepsiburada_url = product_url if "hepsiburada" in product_url else None
        research = collect_with_scrapper_sync(
            product_name,
            trendyol_url=trendyol_url,
            hepsiburada_url=hepsiburada_url,
            skip_youtube=False,
        )
        if research is None:
            with ThreadPoolExecutor(max_workers=2) as ex:
                yt_future = ex.submit(_search_youtube, product_name)
                forum_future = ex.submit(_search_forums, product_name)
                youtube_videos = yt_future.result()
                forum_threads = forum_future.result()
            research = ResearchOutput(
                reviews=[],
                forum_threads=forum_threads,
                youtube_videos=youtube_videos,
                price_data=[],
                qa_items=[],
                hb_summary=None,
            )
    except Exception as e:
        state["error"] = f"research_agent: {e}"
        return state

    state["research"] = research
    return advance_phase(state)
