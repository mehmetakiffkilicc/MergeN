"""
Yorum fotoğraflarını indirir ve images/review_photos/ klasörüne kaydeder.
"""
import asyncio
import hashlib
import os
from pathlib import Path

_TIMEOUT = 15


def _filename(url: str, source: str, idx: int) -> str:
    h = hashlib.md5(url.encode()).hexdigest()[:8]
    ext = os.path.splitext(url.split("?")[0])[1] or ".jpg"
    return f"{source}_{idx}_{h}{ext}"


async def download_review_photos(
    reviews: list[dict],
    output_dir: Path,
    source: str,
    max_photos: int = 200,
) -> list[dict]:
    images_dir = output_dir / "images" / "review_photos"
    images_dir.mkdir(parents=True, exist_ok=True)

    photo_reviews = [(ri, rev) for ri, rev in enumerate(reviews) if rev.get("photos")]
    if not photo_reviews:
        return reviews

    all_targets: list[tuple[int, str, str, Path]] = []
    for ri, rev in photo_reviews:
        for url in rev["photos"]:
            if len(all_targets) >= max_photos:
                break
            fname = _filename(url, source, len(all_targets))
            fpath = images_dir / fname
            all_targets.append((ri, url, fname, fpath))
        if len(all_targets) >= max_photos:
            break

    need_dl = [(ri, url, fname, fpath) for ri, url, fname, fpath in all_targets if not fpath.exists()]
    if not need_dl:
        return _finalize(reviews, all_targets, need_dl, photo_reviews, source, images_dir)

    # Trendyol fotoları → httpx (concurrency limit: 10)
    ty_items = [(ri, url, fname, fpath) for ri, url, fname, fpath in need_dl if "hepsiburada" not in url]
    if ty_items:
        try:
            import httpx
            sem = asyncio.Semaphore(10)
            async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as c:
                async def _dl_ty(ri, url, fname, fpath):
                    async with sem:
                        try:
                            r = await c.get(url)
                            if r.status_code == 200:
                                # Uzantıyı Content-Type'a göre düzelt
                                content_type = r.headers.get("Content-Type", "").lower()
                                ext = ".jpg"
                                if "webp" in content_type: ext = ".webp"
                                elif "avif" in content_type: ext = ".avif"
                                elif "png" in content_type: ext = ".png"
                                
                                fpath.with_suffix(ext).write_bytes(r.content)
                        except:
                            pass
                await asyncio.gather(*[_dl_ty(ri, url, fname, fpath) for ri, url, fname, fpath in ty_items])
        except:
            pass

    # HB fotoları → curl_cffi (concurrency limit: 10 aynı anda)
    hb_items = [(ri, url, fname, fpath) for ri, url, fname, fpath in need_dl if "hepsiburada" in url]
    if hb_items:
        try:
            from curl_cffi.requests import AsyncSession
        except ImportError:
            pass
        else:
            sem = asyncio.Semaphore(10)
            sess = AsyncSession(impersonate="chrome120")
            try:
                await sess.get("https://www.hepsiburada.com/", timeout=_TIMEOUT)
                async def _dl_hb(ri, url, fname, fpath):
                    async with sem:
                        try:
                            r = await sess.get(url, timeout=_TIMEOUT, headers={
                                "Accept": "image/webp,image/avif,image/*,*/*;q=0.8",
                                "Referer": "https://www.hepsiburada.com/",
                            })
                            if r.status_code == 200:
                                content_type = r.headers.get("Content-Type", "").lower()
                                ext = ".jpg"
                                if "webp" in content_type: ext = ".webp"
                                elif "avif" in content_type: ext = ".avif"
                                elif "png" in content_type: ext = ".png"
                                
                                if ext != ".jpg" and fpath.exists():
                                    fpath.unlink()
                                    
                                fpath.with_suffix(ext).write_bytes(r.content)
                        except:
                            pass
                await asyncio.gather(*[_dl_hb(ri, url, fname, fpath) for ri, url, fname, fpath in hb_items])
            finally:
                await sess.close()

    return _finalize(reviews, all_targets, need_dl, photo_reviews, source, images_dir)


def _finalize(reviews, all_targets, need_dl, photo_reviews, source, images_dir):
    # Kaydedilen dosyaları bul (farklı uzantılar olabilir)
    for ri, url, fname, fpath in all_targets:
        # Herhangi bir uzantıyla var mı bak
        for ext in [".webp", ".avif", ".jpg", ".png", ".jpeg"]:
            check_path = fpath.with_suffix(ext)
            if check_path.exists():
                reviews[ri].setdefault("local_photos", []).append(check_path.name)
                break

    existing = sum(1 for ri, rev in photo_reviews if "local_photos" in rev)
    print(f"  [{source}] {existing}/{len(photo_reviews)} yorumun fotograflari hazir.")
    return reviews
