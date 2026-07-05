import os
import cv2
import json
import time
import re
import asyncio
import tempfile
import glob
import shutil
from yt_dlp import YoutubeDL
from google import genai
from dotenv import load_dotenv
from moviepy.video.io.VideoFileClip import VideoFileClip
from tools.youtube_helper import YoutubeHelper

youtube_helper = YoutubeHelper()

class YouTubeRateLimitError(Exception):
    """YouTube rate limit veya engelleme nedeniyle işlemin yeniden kuyruğa alınması gerektiğini belirten özel hata."""
    pass

# --- MULTIMODEL ---
# Gemini API Ayarları
# NOT: GOOGLE_API_KEY çevre değişkeni olarak ayarlanmalıdır.

load_dotenv()

# Parse comma-separated keys from settings/env
env_api_keys = os.getenv("GEMINI_API_KEYS") or os.getenv("GOOGLE_API_KEYS")
_env_keys = []
if env_api_keys:
    _env_keys = [k.strip() for k in env_api_keys.split(",") if k.strip()]

single_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# API anahtarları YALNIZCA env'den gelir (GEMINI_API_KEY / GEMINI_API_KEYS) —
# koda anahtar gömme: repo geçmişine sızar ve rotasyon gerektirir
_FALLBACK_KEYS = []

def _clean_key(key: str) -> str:
    if not key:
        return ""
    key = key.strip()
    if (key.startswith('"') and key.endswith('"')) or (key.startswith("'") and key.endswith("'")):
        key = key[1:-1].strip()
    return key

_API_KEYS = []
_seen = set()
for k in ([single_key] if single_key else []) + _env_keys + _FALLBACK_KEYS:
    cleaned = _clean_key(k)
    if cleaned and cleaned not in _seen:
        _API_KEYS.append(cleaned)
        _seen.add(cleaned)

_current_key_idx = 0

def _execute_with_key_fallback(fn_caller):
    global _current_key_idx
    last_exc = None
    num_keys = len(_API_KEYS)
    
    if num_keys == 0:
        raise ValueError("No Gemini API keys are configured.")
        
    for attempt in range(num_keys):
        idx = (_current_key_idx + attempt) % num_keys
        key = _API_KEYS[idx]
        
        # Mask the key for logs
        masked_key = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "..."
        print(f"  [YouTube-Gemini] Trying Gemini API call using key at index {idx} ({masked_key})...")
        
        try:
            temp_client = genai.Client(api_key=key)
            result = fn_caller(temp_client)
            # Success! Update global pointer so future calls start with this working key
            if _current_key_idx != idx:
                print(f"  [YouTube-Gemini] Successfully switched to Gemini API key index {idx}.")
                _current_key_idx = idx
            return result
        except Exception as exc:
            err_msg = str(exc)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                print(f"  [YouTube-Gemini] Gemini API key at index {idx} ({masked_key}) exhausted (429/RESOURCE_EXHAUSTED). Trying next...")
                last_exc = exc
                continue
            elif "API_KEY_INVALID" in err_msg or "invalid" in err_msg.lower() or "400" in err_msg or "403" in err_msg:
                print(f"  [YouTube-Gemini] Gemini API key at index {idx} ({masked_key}) is invalid or blocked. Trying next...")
                last_exc = exc
                continue
            elif "503" in err_msg or "UNAVAILABLE" in err_msg:
                print(f"  [YouTube-Gemini] Gemini API key at index {idx} ({masked_key}) returned 503 UNAVAILABLE. Trying next...")
                last_exc = exc
                continue
            else:
                print(f"  [YouTube-Gemini] Gemini API error with key index {idx}: {exc}. Trying next...")
                last_exc = exc
                continue
                
    print(f"  [YouTube-Gemini] HATA: All {num_keys} Gemini API keys have been exhausted or failed!")
    raise last_exc or ValueError("All Gemini API keys are exhausted.")


async def search_product_videos(product_name, max_results=3):
    """
    YouTube'da ürün ismi ile arama yapar ve en alakalı videoların ID'lerini ve başlıklarını döner.
    Eş zamanlı (async) çalışır.
    """
    def _search():
        attempts = 3
        for attempt in range(attempts):
            proxy = youtube_helper.get_proxy()
            cookie_file = youtube_helper.get_cookie_file()
            try:
                ydl_opts = {
                    'quiet': True,
                    'extract_flat': True,
                    'force_generic_extractor': True,
                }
                if proxy:
                    ydl_opts['proxy'] = proxy
                if cookie_file:
                    ydl_opts['cookiefile'] = cookie_file
                    
                with YoutubeDL(ydl_opts) as ydl:
                    search_query = f"ytsearch{max_results}:{product_name}"
                    info = ydl.extract_info(search_query, download=False)
                    
                    results = []
                    for entry in info.get('entries', []):
                        channel_name = entry.get('uploader') or entry.get('channel') or ""
                        uploader_id = entry.get('uploader_id') or ""
                        channel_url = entry.get('uploader_url') or ""
                        if uploader_id and not channel_url:
                            if uploader_id.startswith('@'):
                                channel_url = f"https://www.youtube.com/{uploader_id}"
                            else:
                                channel_url = f"https://www.youtube.com/@{uploader_id}"
                        duration_sec = entry.get('duration')
                        duration_str = ""
                        if duration_sec:
                            try:
                                mins = int(duration_sec) // 60
                                secs = int(duration_sec) % 60
                                duration_str = f"{mins:02d}:{secs:02d}"
                            except Exception:
                                pass

                        results.append({
                            "id": entry.get('id'),
                            "title": entry.get('title'),
                            "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
                            "channel": channel_name,
                            "channel_url": channel_url,
                            "uploader_id": uploader_id,
                            "duration": duration_str
                        })
                    if results:
                        return results
            except Exception as e:
                err = str(e)
                print(f"  [YouTube] Arama denemesi {attempt+1}/{attempts} basarisiz: {err}")
                if "429" in err or "Too Many Requests" in err or "403" in err:
                    if proxy:
                        youtube_helper.ban_proxy(proxy)
        return []
            
    return await asyncio.to_thread(_search)

async def get_video_transcript(video_id, return_raw=False):
    """
    Verilen video ID'si için Türkçe veya İngilizce transkripti çeker.
    Yöntem 1: youtube-transcript-api ile Proxy + Cookie.
      Ban veya hata dönerse proxy değiştirip tekrar dener (max 3 deneme).
    Yöntem 2 (fallback): yt-dlp json3 altyazı indirme (rotated proxy & cookies).
    return_raw=True ise '[0.0] metin [4.2] metin ...' formatında döner.
    Eş zamanlı (async) çalışır.
    """
    def _parse_json3_events(data, return_raw):
        parts = []
        for event in data.get('events', []):
            segs = event.get('segs')
            if not segs:
                continue
            text = ''.join(s.get('utf8', '') for s in segs).strip()
            if not text or text == '\n':
                continue
            if return_raw:
                start_sec = round(event.get('tStartMs', 0) / 1000, 1)
                parts.append(f"[{start_sec}] {text}")
            else:
                parts.append(text)
        return " ".join(parts) if parts else None

    def _get_transcript():
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api.proxies import GenericProxyConfig
        import requests
        import http.cookiejar

        def format_transcript(transcript_list, return_raw):
            parts = []
            for entry in transcript_list:
                text = entry.get('text', '').strip()
                if not text:
                    continue
                if return_raw:
                    start_sec = round(entry.get('start', 0), 1)
                    parts.append(f"[{start_sec}] {text}")
                else:
                    parts.append(text)
            return " ".join(parts) if parts else None

        def _parse_vtt(vtt_path, return_raw):
            try:
                with open(vtt_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                parts = []
                seen = set()
                current_time = 0.0
                
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
                        continue
                        
                    match = re.match(r'(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->', line)
                    if match:
                        h, m, s, ms = map(int, match.groups())
                        current_time = round(h * 3600 + m * 60 + s + ms / 1000, 1)
                        continue
                        
                    if line.startswith('<') or line.startswith('{') or '-->' in line:
                        continue
                        
                    cleaned = re.sub(r'<[^>]+>', '', line).strip()
                    if cleaned and cleaned not in seen:
                        seen.add(cleaned)
                        if return_raw:
                            parts.append(f"[{current_time}] {cleaned}")
                        else:
                            parts.append(cleaned)
                return " ".join(parts) if parts else None
            except Exception as e:
                print(f"  [YouTube] VTT ayrıştırma hatası: {e}")
                return None

        # --- Yöntem 1: youtube-transcript-api + Proxy + Cookie ---
        attempts = 3 if youtube_helper.proxies else 1
        for attempt in range(attempts):
            proxy = youtube_helper.get_proxy()
            cookie_file = youtube_helper.get_cookie_file()
            
            print(f"  [YouTube] youtube-transcript-api denemesi {attempt+1}/{attempts} (Proxy: {proxy}, Cookie: {os.path.basename(cookie_file) if cookie_file else 'Yok'})")
            
            try:
                session = requests.Session()
                if cookie_file:
                    try:
                        cookie_jar = http.cookiejar.MozillaCookieJar(cookie_file)
                        cookie_jar.load(ignore_discard=True, ignore_expires=True)
                        session.cookies = cookie_jar
                        
                        # [HIZLANDIRMA / BYPASS] YouTube Innertube IP block bypass
                        import time
                        import hashlib
                        apisid = None
                        for c in cookie_jar:
                            if c.name in ('SAPISID', '__Secure-3PAPISID'):
                                apisid = c.value
                                break
                        if apisid:
                            timestamp = int(time.time())
                            hash_str = hashlib.sha1(f"{timestamp} {apisid} https://www.youtube.com".encode('utf-8')).hexdigest()
                            session.headers.update({
                                "Authorization": f"SAPISIDHASH {timestamp}_{hash_str}",
                                "X-Origin": "https://www.youtube.com",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            })
                    except Exception as e:
                        print(f"  [YouTube] Cookie yukleme hatasi: {e}")
                else:
                    session.headers.update({
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    })
                
                proxy_config = None
                if proxy:
                    proxy_config = GenericProxyConfig(http_url=proxy, https_url=proxy)
                
                api_instance = YouTubeTranscriptApi(proxy_config=proxy_config, http_client=session)
                srt = api_instance.fetch(video_id, languages=['tr', 'en'])
                if srt:
                    raw_data = srt.to_raw_data()
                    transcript_text = format_transcript(raw_data, return_raw)
                    if transcript_text:
                        print(f"  [YouTube] youtube-transcript-api basarili ({video_id})")
                        return transcript_text
            except Exception as e:
                err = str(e)
                print(f"  [YouTube] youtube-transcript-api denemesi {attempt+1} basarisiz: {err}")
                if "429" in err or "Too Many Requests" in err or "403" in err or "Forbidden" in err:
                    if proxy:
                        youtube_helper.ban_proxy(proxy)


        # --- Yöntem 2: yt-dlp ile Altyazı/Transkript İndirme Fallback (Çok Hızlı) ---
        print(f"  [YouTube] Yöntem 2: yt-dlp ile altyazı indirme deneniyor...")
        for attempt in range(attempts):
            proxy = youtube_helper.get_proxy()
            cookie_file = youtube_helper.get_cookie_file()
            
            print(f"  [YouTube] yt-dlp altyazı denemesi {attempt+1}/{attempts} (Proxy: {proxy}, Cookie: {os.path.basename(cookie_file) if cookie_file else 'Yok'})")
            
            try:
                import tempfile
                import glob
                import shutil
                from yt_dlp import YoutubeDL
                
                with tempfile.TemporaryDirectory() as tmpdir:
                    ydl_opts_subs = {
                        'write_auto_subs': True,
                        'write_subs': True,
                        'skip_download': True,
                        'quiet': True,
                        'no_warnings': True,
                        'outtmpl': os.path.join(tmpdir, '%(id)s.%(ext)s'),
                        'subtitleslangs': ['tr', 'en', 'en-US'],
                    }
                    if proxy:
                        ydl_opts_subs['proxy'] = proxy
                    if cookie_file:
                        ydl_opts_subs['cookiefile'] = cookie_file
                        
                    with YoutubeDL(ydl_opts_subs) as ydl:
                        ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
                        
                    sub_files = glob.glob(os.path.join(tmpdir, f"{video_id}.*"))
                    if sub_files:
                        vtt_file = next((f for f in sub_files if f.endswith('.vtt')), None)
                        if vtt_file:
                            transcript_text = _parse_vtt(vtt_file, return_raw)
                            if transcript_text:
                                print(f"  [YouTube] yt-dlp altyazı indirme başarılı ({video_id})")
                                return transcript_text
            except Exception as e:
                err = str(e)
                print(f"  [YouTube] yt-dlp altyazı denemesi {attempt+1} basarisiz: {err}")


        # --- Yöntem 3: Gemini Audio Transkripsiyon Fallback (varsayılan kapalı) ---
        if not os.getenv("YOUTUBE_AUDIO_FALLBACK"):
            print(f"  [YouTube] Audio fallback devre dışı (YOUTUBE_AUDIO_FALLBACK=1 ile açılabilir) — transkript atlandı ({video_id})")
            return None
        print(f"  [YouTube] Subtitle metotlari tukendi. Gemini Audio fallback deneniyor...")
        try:
            api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
            if not api_key:
                print("  [YouTube] GEMINI_API_KEY bulunamadi, Gemini fallback atlandi.")
                raise YouTubeRateLimitError(f"YouTube transkript alimi tamamen engellendi (Video ID: {video_id}). Islem kuyruga geri atilmalidir.")

            tmpdir_gemini = tempfile.mkdtemp()
            try:
                ydl_opts_audio = {
                    'format': 'ba[ext=m4a]/ba',
                    'extract_audio': True,
                    'audio_format': 'm4a',
                    'outtmpl': os.path.join(tmpdir_gemini, '%(id)s.%(ext)s'),
                    'quiet': True,
                    'no_warnings': True
                }
                
                url = f"https://www.youtube.com/watch?v={video_id}"
                with YoutubeDL(ydl_opts_audio) as ydl:
                    ydl.download([url])
                
                audio_files = glob.glob(os.path.join(tmpdir_gemini, f"{video_id}.*"))
                if audio_files:
                    target_audio = audio_files[0]
                    
                    def _api_call(client_instance):
                        uploaded_file = client_instance.files.upload(file=target_audio)
                        prompt = "Provide a verbatim transcript of the spoken audio in its original language. ONLY the transcript, no introductory text."
                        return client_instance.models.generate_content(
                            model='gemini-2.5-flash', 
                            contents=[uploaded_file, prompt]
                        )
                    
                    response = _execute_with_key_fallback(_api_call)
                    
                    if response and response.text:
                        print(f"  [YouTube] Gemini fallback basarili ({video_id})")
                        return response.text.strip()
            finally:
                shutil.rmtree(tmpdir_gemini, ignore_errors=True)
        except Exception as e:
            err_msg = str(e).lower()
            print(f"  [YouTube] Gemini fallback calistirilamadi veya basarisiz: {e}")
            if "unavailable" in err_msg or "private" in err_msg or "not found" in err_msg:
                print(f"  [YouTube] Video erisilemez durumda, kalici olarak atlandi ({video_id})")
                return None
            else:
                print(f"  [YouTube] Gemini fallback basarisiz oldu, transkript atlandi ({video_id})")
                return None

        # Eger buraya kadar ulastiysa basarisiz olmustur.
        print(f"  [YouTube] Transkript alinamadi, atlandi ({video_id})")
        return None

    return await asyncio.to_thread(_get_transcript)

# --- MULTIMODEL ---
async def safe_gemini_call(prompt, model_name='gemini-2.5-flash', max_retries=5):
    """
    Exponential Backoff ve hata yönetimi ile güvenli Gemini çağrısı yapar.
    429 (Quota Exceeded) durumunda otomatik key rotasyonu gerçekleştirir.
    Eş zamanlı (async) çalışır.
    """
    def _call():
        def _api_call(client_instance):
            delay = 2
            for i in range(max_retries):
                try:
                    response = client_instance.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    return response
                except Exception as e:
                    err_msg = str(e)
                    # 429, RESOURCE_EXHAUSTED veya geçersiz/expired API key hatası kontrolü -> key rotation tetiklemek için fırlat
                    if any(x in err_msg for x in ["429", "RESOURCE_EXHAUSTED", "API_KEY_INVALID", "expired", "INVALID_ARGUMENT", "400", "403"]):
                        raise e
                    # 503 veya diğer geçici hatalarda backoff yapalım
                    if "503" in err_msg or "UNAVAILABLE" in err_msg:
                        wait_time = delay
                        print(f"  [YouTube-Gemini] 503 UNAVAILABLE — {wait_time}s sonra tekrar deneniyor... (Deneme {i+1}/{max_retries})")
                        time.sleep(wait_time)
                        delay = min(delay * 2, 10)
                    else:
                        print(f"  [YouTube-Gemini] UYARI: İstek sırasında hata: {e}, yeniden deneniyor...")
                        time.sleep(2)
            raise RuntimeError("Maksimum retry limitine ulaşıldı.")

        try:
            return _execute_with_key_fallback(_api_call)
        except Exception as e:
            print(f"HATA: safe_gemini_call başarısız oldu: {e}")
            return None

    return await asyncio.to_thread(_call)

async def get_relevant_segments_batch(videos: list, user_preferences: str) -> dict:
    """
    Tüm videoların transkriptlerini tek Gemini isteğinde analiz eder (5 istek → 1 istek).
    Döndürdüğü dict: {"0": [segments], "1": [segments], ...}
    """
    max_chars = 8000
    blocks = []
    for i, video in enumerate(videos):
        t = (video.get("transcript") or "")[:max_chars]
        if t:
            blocks.append(f"=== VIDEO {i} ===\n{t}")

    if not blocks:
        return {}

    combined = "\n\n".join(blocks)
    prompt = f"""Aşağıdaki YouTube video transkriptlerini incele. Her video için kullanıcı tercihlerine uyan en önemli 2-3 bölümü bul.

Kullanıcı Tercihleri: {user_preferences}

{combined}

Her video için başlangıç saniyesi, bitiş saniyesi ve kısa açıklama dön.
Yanıtı JSON formatında ver — key olarak video indeksi (string), value olarak segment listesi:
{{
  "0": [{{"start": 10, "end": 25, "reason": "Burada ses kalitesinden bahsediliyor"}}],
  "1": [...],
  ...
}}
Transkripti olmayan ya da segment bulunamayan video için boş liste ver."""

    response = await safe_gemini_call(prompt, model_name="gemini-3.1-flash-lite")
    if not response:
        return {}

    try:
        text = response.text.strip() if response.text else ""
        if not text:
            return {}
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        print(f"  [YouTube] Batch segment analizi parse hatası: {e}")
        return {}

# --- MULTIMODEL ---
async def extract_frame_at_time(video_url, timestamp, output_path="frame.jpg"):
    """
    Videonun belirli bir saniyesinden ekran görüntüsü alır.
    Eş zamanlı (async) çalışır.
    """
    def _extract():
        try:
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'quiet': True,
                'no_warnings': True,
            }
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                stream_url = info.get('url')
                
                if not stream_url:
                    for f in info.get('formats', []):
                        if f.get('vcodec') != 'none' and f.get('url'):
                            stream_url = f['url']
                            break
                
                if not stream_url:
                    return None

                cap = cv2.VideoCapture(stream_url)
                cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
                
                success, frame = cap.read()
                if success:
                    cv2.imwrite(output_path, frame)
                    cap.release()
                    return output_path
                
                cap.release()
            return None
        except Exception as e:
            print(f"Frame alınırken hata: {e}")
            return None
            
    return await asyncio.to_thread(_extract)

# --- MULTIMODEL ---
async def download_video_clip(video_url, start, end, output_filename="clip.mp4"):
    """
    Videonun belirli bir kısmını kesip indirir.
    Eş zamanlı (async) çalışır.
    """
    def _download_and_clip():
        try:
            temp_file = f"temp_{int(time.time())}_{os.path.basename(output_filename)}"
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': temp_file,
                'quiet': True,
                'no_warnings': True,
            }
            
            if os.path.exists(temp_file):
                os.remove(temp_file)

            with YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
                
            # MoviePy ile kes
            with VideoFileClip(temp_file) as video:
                clip = video.subclipped(start, end)
                clip.write_videofile(output_filename, codec="libx264", audio_codec="aac")
                
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
            return output_filename
        except Exception as e:
            print(f"Klip indirilirken hata: {e}")
            return None
            
    return await asyncio.to_thread(_download_and_clip)

async def _fetch_video_comments(url: str, max_comments: int = 75) -> list[dict]:
    """youtube-comment-downloader ile popülerlik sıralı yorumlar (senkron → executor).
    Servis geçici hata verebiliyor — boş dönüşte 1 retry yapılır."""
    def _download():
        from youtube_comment_downloader import YoutubeCommentDownloader, SORT_BY_POPULAR
        downloader = YoutubeCommentDownloader()
        comments = []
        for comment in downloader.get_comments_from_url(url, sort_by=SORT_BY_POPULAR):
            text = (comment.get("text") or "").strip()
            if not text:
                continue
            comments.append({
                "text": text,
                "author": comment.get("author", ""),
                "likes": comment.get("votes", 0),
                "time": comment.get("time", ""),
            })
            if len(comments) >= max_comments:
                break
        return comments

    for attempt in range(2):
        try:
            comments = await asyncio.to_thread(_download)
            if comments:
                return comments
            print(f"  [YouTube] Yorum boş döndü ({url[-15:]}), deneme {attempt+1}/2")
        except Exception as e:
            print(f"  [YouTube] Yorum indirme hatası ({url[-15:]}, deneme {attempt+1}/2): {e}")
        if attempt == 0:
            await asyncio.sleep(1.5)
    return []


# Toplu Işlem Fonksiyonu Örneği
async def process_multiple_videos(product_name, user_preferences, max_results=3):
    """
    Belirtilen ürün için arama yapar, 5 videoyu tamamen paralel işler.
    gemini-3.1-flash-lite (15 RPM) ile 5 eşzamanlı çağrı limiti aşmaz.
    """
    videos = await search_product_videos(product_name, max_results=max_results)
    if not videos:
        print(f"  [YouTube] UYARI: '{product_name}' için hiç video bulunamadı")
        return []
    if len(videos) < max_results:
        print(f"  [YouTube] UYARI: {max_results} video istendi, {len(videos)} bulundu (yt-dlp kota/engel olabilir)")

    async def process_video(video):
        video_id = video['id']
        url = video.get('url') or f"https://www.youtube.com/watch?v={video_id}"

        # Transkript + yorumları paralel çek
        transcript, comments = await asyncio.gather(
            get_video_transcript(video_id, return_raw=True),
            _fetch_video_comments(url, max_comments=300),
            return_exceptions=True,
        )

        video['transcript'] = transcript if isinstance(transcript, str) else ""
        video['comments'] = comments if isinstance(comments, list) else []
        video['segments'] = []
        return video

    results = await asyncio.gather(*[process_video(v) for v in videos], return_exceptions=True)
    
    for r in results:
        if isinstance(r, YouTubeRateLimitError):
            raise r

    valid_videos = [v for v in results if isinstance(v, dict)]

    # Tüm video transkriptlerini tek Gemini isteğinde analiz et (5 istek → 1 istek)
    try:
        batch_segments = await asyncio.wait_for(
            get_relevant_segments_batch(valid_videos, user_preferences),
            timeout=12.0,
        )
    except asyncio.TimeoutError:
        print("  [YouTube] Batch segment analizi timeout (12s) — segmentler atlanıyor")
        batch_segments = {}
    except Exception as e:
        print(f"  [YouTube] Batch segment analizi hatası: {e}")
        batch_segments = {}

    for i, video in enumerate(valid_videos):
        segs = batch_segments.get(str(i), [])
        video['segments'] = segs if isinstance(segs, list) else []

    return valid_videos

