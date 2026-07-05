import hashlib
import sys
import time
from typing import Any, Callable, Optional

from google import genai
from google.genai import types

from config import settings
from tools.cache import cache_get_or_compute
from tools.profiler import span as _pspan


# Fallback API keys list (hardcoded; .env keys take priority via get_api_keys())
_FALLBACK_KEYS: list[str] = []

import logging
logger = logging.getLogger(__name__)

def _clean_key(key: str) -> str:
    if not key:
        return ""
    key = key.strip()
    if (key.startswith('"') and key.endswith('"')) or (key.startswith("'") and key.endswith("'")):
        key = key[1:-1].strip()
    return key

_current_key_idx = 0

def get_api_keys() -> list[str]:
    # Dinamik olarak .env dosyasını doğrudan metin olarak oku ve ayrıştır!
    # Bu sayede os.environ veya Pydantic cache'leme önceliklerinden etkilenmeyiz.
    from pathlib import Path
    env_path = Path(__file__).parent.parent.parent / ".env"
    
    gemini_api_key = ""
    gemini_api_keys = ""
    
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        parts = line.split("=", 1)
                        key = parts[0].strip()
                        val = parts[1].strip()
                        if key == "GEMINI_API_KEY":
                            gemini_api_key = val
                        elif key == "GEMINI_API_KEYS":
                            gemini_api_keys = val
        except Exception as e:
            logger.error("Dinamik .env dosya okuma hatası: %s", e)

    # Eğer .env okunamadıysa veya boşsa, fallback olarak global settings kullanalım
    if not gemini_api_key and not gemini_api_keys:
        gemini_api_key = settings.gemini_api_key
        gemini_api_keys = settings.gemini_api_keys

    env_keys = []
    if gemini_api_keys:
        env_keys = [k.strip() for k in gemini_api_keys.split(",") if k.strip()]
        
    api_keys = []
    seen = set()
    for k in [gemini_api_key] + env_keys + _FALLBACK_KEYS:
        cleaned = _clean_key(k)
        if cleaned and cleaned not in seen:
            api_keys.append(cleaned)
            seen.add(cleaned)
            
    return api_keys


def _execute_with_key_fallback(fn_caller: Callable[[genai.Client], Any]) -> Any:
    global _current_key_idx
    last_exc = None
    
    # Her çağrıda veya hata durumunda .env'den güncel key'leri çek
    api_keys = get_api_keys()
    num_keys = len(api_keys)
    
    if num_keys == 0:
        raise ValueError("No Gemini API keys are configured.")
        
    for attempt in range(num_keys):
        idx = (_current_key_idx + attempt) % num_keys
        key = api_keys[idx]
        
        # Mask the key for logs
        masked_key = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "..."
        logger.info(
            "Trying Gemini API call using key at index %d (%s)...", 
            idx, masked_key
        )
        
        try:
            # 90s istek timeout'u — timeout'suz çağrı süresiz asılı kalıp
            # SSE pipeline'ını kilitleyebiliyor
            client = genai.Client(
                api_key=key,
                http_options=types.HttpOptions(timeout=90_000),
            )
            
            def run_api():
                return fn_caller(client)
                
            result = _call_with_retry(run_api)
            # Success! Update global pointer so future calls start with this working key
            if _current_key_idx != idx:
                logger.info("Successfully switched to Gemini API key index %d.", idx)
                _current_key_idx = idx
            return result
        except Exception as exc:
            err_msg = str(exc)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                logger.warning(
                    "Gemini API key at index %d (%s) exhausted (429/RESOURCE_EXHAUSTED). Trying next...", 
                    idx, masked_key
                )
                last_exc = exc
                continue
            elif "API_KEY_INVALID" in err_msg or "invalid" in err_msg.lower() or "400" in err_msg or "403" in err_msg:
                logger.warning(
                    "Gemini API key at index %d (%s) is invalid or blocked. Trying next...",
                    idx, masked_key
                )
                last_exc = exc
                continue
            elif "503" in err_msg or "UNAVAILABLE" in err_msg:
                logger.warning(
                    "Gemini API key at index %d (%s) returned 503 UNAVAILABLE. Trying next...",
                    idx, masked_key
                )
                last_exc = exc
                continue
            else:
                logger.warning(
                    "Gemini API error with key at index %d (%s): %s. Trying next...",
                    idx, masked_key, err_msg
                )
                last_exc = exc
                continue
                
    logger.error("All %d Gemini API keys have been exhausted or failed!", num_keys)
    raise last_exc or ValueError("All Gemini API keys are exhausted.")


def _cache_key(prefix: str, model: str, temperature: float, payload: str) -> str:
    digest = hashlib.sha256(f"{model}:{temperature}:{payload}".encode()).hexdigest()
    return f"{prefix}:{digest}"


def _call_with_retry(fn: Callable, *args, **kwargs) -> Any:
    """
    503 UNAVAILABLE / yüksek talep durumunda exponential backoff ile yeniden dener.
    429 / RESOURCE_EXHAUSTED → API key rotasyonu için hemen raise eder.
    """
    _503_delays = [3, 6, 12, 24]  # 503 için bekleme süreleri (saniye)

    last_exc: Exception | None = None
    for attempt, delay in enumerate([0] + _503_delays):
        if delay > 0:
            logger.warning(
                "[gemini retry] 503 UNAVAILABLE — %ds sonra tekrar deneniyor (deneme %d/%d)...",
                delay, attempt, len(_503_delays) + 1,
            )
            with _pspan("gemini:backoff"):
                time.sleep(delay)
        try:
            with _pspan("gemini:api_call"):
                return fn(*args, **kwargs)
        except Exception as e:
            err_msg = str(e)
            # 429 / kota: key rotation tetikle
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                raise e
            # 503 / geçici sunucu yükü: backoff ile tekrar dene
            if "503" in err_msg or "UNAVAILABLE" in err_msg or "high demand" in err_msg.lower():
                last_exc = e
                print(f"[gemini retry] {type(e).__name__}: 503 yakalandı, bekleniyor...", file=sys.stderr)
                continue
            # Diğer hatalar: bir kez retry
            print(f"[gemini retry] {type(e).__name__}: {e}", file=sys.stderr)
            with _pspan("gemini:backoff"):
                time.sleep(2)
            with _pspan("gemini:api_call"):
                return fn(*args, **kwargs)

    # 4 deneme de başarısız oldu
    logger.error("[gemini retry] Tüm 503 retry denemeleri tükendi.")
    raise last_exc or RuntimeError("Gemini API: kalıcı 503 UNAVAILABLE")


def _get_fallback_models(model: str) -> list[str]:
    """
    Model kalitesi ve kota gruplarına göre fallback zinciri.

    FLASH GRUBU (yüksek kalite, reasoning):
      1. gemini-3-flash          → En yeni, frontier reasoning, boş kota
      2. gemini-3-flash-preview  → Aynı nesil preview
      3. gemini-2.5-flash        → Önceki nesil, güvenilir
      4. gemini-2.0-flash        → Stabil fallback
      5. gemini-1.5-flash        → En eski, son çare

    FLASH LİTE GRUBU (hızlı, yüksek kota, orta kalite):
      1. gemini-2.5-flash-lite   → En yeni lite, yüksek kota
      2. gemini-3.1-flash-lite   → Alternatif lite
      3. gemini-2.0-flash-lite   → Eski lite
    """
    _FLASH_GROUP = [
        "gemini-3-flash",
        "gemini-2.5-flash",
    ]
    _LITE_GROUP = [
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
    ]

    # Flash grubundaki bir model isteniyorsa → Flash grubundan devam, sonra Lite
    if model in _FLASH_GROUP:
        fallbacks = [m for m in _FLASH_GROUP if m != model]
        fallbacks += _LITE_GROUP
        return fallbacks

    # Lite grubundaki bir model isteniyorsa → Lite grubundan devam, sonra Flash
    if model in _LITE_GROUP:
        fallbacks = [m for m in _LITE_GROUP if m != model]
        fallbacks += _FLASH_GROUP
        return fallbacks

    # Bilinmeyen model → tüm flash önce
    return _FLASH_GROUP + _LITE_GROUP


def generate_text(
    prompt: str,
    *,
    model: str | None = None,
    temperature: float = 0.7,
    use_cache: bool = True,
) -> str:
    model = model or settings.model_flash
    key = _cache_key("text", model, temperature, prompt)

    def _call() -> str:
        models_to_try = [model] + _get_fallback_models(model)
        last_err = None
        
        for m in models_to_try:
            try:
                def _api_call(client: genai.Client) -> str:
                    resp = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(temperature=temperature),
                    )
                    return resp.text or ""
                return _execute_with_key_fallback(_api_call)
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    logger.warning("Model %s returned 429 (Resource Exhausted). Trying next model fallback...", m)
                    last_err = e
                    continue
                raise e
        raise last_err or ValueError("All models and keys exhausted in generate_text.")

    if use_cache:
        return cache_get_or_compute(key, _call)
    return _call()


def generate_json(
    prompt: str,
    *,
    schema: type | None = None,
    model: str | None = None,
) -> dict:
    model = model or settings.model_flash
    key = _cache_key("json", model, 0.0, prompt + repr(schema))

    def _call() -> dict:
        import json
        import re
        
        models_to_try = [model] + _get_fallback_models(model)
        last_err = None
        
        for m in models_to_try:
            try:
                def _api_call(client: genai.Client) -> dict:
                    cfg = types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                    )
                    resp = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=cfg,
                    )
                    text = resp.text or "{}"
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        m_match = re.search(r"\{.*\}", text, re.DOTALL)
                        if m_match:
                            return json.loads(m_match.group())
                        return {}
                return _execute_with_key_fallback(_api_call)
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    logger.warning("Model %s returned 429 in generate_json. Trying next model fallback...", m)
                    last_err = e
                    continue
                raise e
        raise last_err or ValueError("All models and keys exhausted in generate_json.")

    return cache_get_or_compute(key, _call)


def _load_image_bytes(url: str, timeout: int = 10) -> tuple[Optional[bytes], str]:
    """URL veya data-URI'den görsel byte'larını yükler. (bytes|None, mime) döner."""
    if url.startswith("data:"):
        try:
            import base64
            header, b64 = url.split(",", 1)
            mime = header.split(":", 1)[1].split(";", 1)[0] or "image/jpeg"
            return base64.b64decode(b64), mime
        except Exception:
            return None, "image/jpeg"
    try:
        import httpx
        r = httpx.get(url, timeout=timeout, follow_redirects=True)
        if r.status_code == 200:
            return r.content, _detect_mime_type(url, r.headers.get("content-type"))
    except Exception:
        pass
    return None, "image/jpeg"


def _detect_mime_type(url: str, content_type_header: Optional[str]) -> str:
    if content_type_header:
        mime = content_type_header.split(";")[0].strip()
        if mime.startswith("image/"):
            return mime
    url_lower = url.lower().split("?")[0]
    if url_lower.endswith(".png"):
        return "image/png"
    if url_lower.endswith(".webp"):
        return "image/webp"
    if url_lower.endswith(".gif"):
        return "image/gif"
    if url_lower.endswith(".avif"):
        return "image/avif"
    return "image/jpeg"


def generate_from_image(
    prompt: str,
    image_url: str,
    *,
    model: str | None = None,
    mime_type: Optional[str] = None,
) -> str:
    model = model or settings.model_vision
    key = _cache_key("vision", model, 0.7, f"{image_url}:{prompt}")

    def _call() -> str:
        import httpx
        response = httpx.get(image_url, timeout=30)
        image_bytes = response.content
        resolved_mime = mime_type or _detect_mime_type(
            image_url, response.headers.get("content-type")
        )
        
        models_to_try = [model] + _get_fallback_models(model)
        last_err = None
        
        for m in models_to_try:
            try:
                def _api_call(client: genai.Client) -> str:
                    resp = client.models.generate_content(
                        model=m,
                        contents=[
                            prompt,
                            types.Part.from_bytes(data=image_bytes, mime_type=resolved_mime),
                        ],
                    )
                    return resp.text or ""
                return _execute_with_key_fallback(_api_call)
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    logger.warning("Model %s returned 429 in generate_from_image. Trying next model fallback...", m)
                    last_err = e
                    continue
                raise e
        raise last_err or ValueError("All models and keys exhausted in generate_from_image.")

    return cache_get_or_compute(key, _call)


def select_best_matching_image(
    studio_image_url: str,
    candidate_image_urls: list[str],
    *,
    model: str | None = None,
    with_score: bool = False,
):
    """
    Gemini Vision kullanarak stüdyo referans görseline açı, ışık ve duruş açısından
    en çok benzeyen gerçek kullanıcı görselini seçer.
    with_score=True: (url, angle_match 0-100 | None) tuple döner — çağıran,
    düşük açı eşleşmesinde ek adaylarla yeniden deneme yapabilir.
    """
    if not candidate_image_urls:
        return (None, None) if with_score else None

    model = model or settings.model_vision
    import hashlib
    payload = f"{studio_image_url}:" + ",".join(candidate_image_urls)
    digest = hashlib.sha256(payload.encode()).hexdigest()
    key = f"select_image_v2:{digest}"

    def _call() -> Optional[str]:
        import httpx
        from google.genai import types
        import json
        
        # 1. Stüdyo görselini indir (data-URI de desteklenir)
        studio_bytes, studio_mime = _load_image_bytes(studio_image_url)
        if not studio_bytes:
            return candidate_image_urls[0]

        # 2. Aday görselleri PARALEL indir (sıralı indirme 10+ adayda 5-8s yiyordu)
        from concurrent.futures import ThreadPoolExecutor
        parts = []
        valid_candidates = []

        parts.append("Studio (Reference) Image:")
        parts.append(types.Part.from_bytes(data=studio_bytes, mime_type=studio_mime))

        pool = candidate_image_urls[:12]  # En fazla 12 aday resim
        with ThreadPoolExecutor(max_workers=8) as ex:
            loaded = list(ex.map(_load_image_bytes, pool))
        for idx, (url, (data, mime)) in enumerate(zip(pool, loaded)):
            if data:
                parts.append(f"Candidate {idx}:")
                parts.append(types.Part.from_bytes(data=data, mime_type=mime))
                valid_candidates.append(url)

        if not valid_candidates:
            return candidate_image_urls[0]

        prompt = """
        Aşağıdaki görselleri incele. 'Studio (Reference) Image' olarak belirtilen görsel, ürünün stüdyo ortamında çekilmiş ana render görselidir.
        'Candidate X' olarak verilen görseller ise gerçek kullanıcı fotoğrafları veya inceleme videolarından alınmış karelerdir.

        Görevin:
        'Studio (Reference) Image' ile YAN YANA karşılaştırılacak en iyi Candidate'i seçmek. Seçim kriterleri (öncelik sırasıyla):
        1. Ürünün duruş AÇISI ve CEPHESİ stüdyo görseliyle AYNI olmalı (stüdyo üstten çekimse üstten çekim kare; yandan ise yandan). Farklı cepheden çekilmiş kare — ne kadar net olursa olsun — kötü eşleşmedir.
        2. AYNI ÜRÜN görselde net ve büyük görünüyor (kadrajın ana öznesi ürün; insan yüzü, kalabalık masa veya yazı bindirmesi ağırlıklı kareleri ELE).
        3. Görüntü kalitesi: bulanık, karanlık veya intro/geçiş (timelapse) karelerini ELE.

        JSON döndür:
        - "selected_index": seçtiğin Candidate'in indeksi (tamsayı).
        - "angle_match": seçilen karenin stüdyo görseliyle AÇI/CEPHE uyumu (0-100 tamsayı). Aynı cephe ~90+, komşu açı ~60-80, tamamen farklı cephe (üst vs alt gibi) 40 altı. Dürüst puanla — hiçbir aday uymuyorsa en iyisini seç ama düşük puan ver.
        Örnek çıktı: {"selected_index": 2, "angle_match": 85}
        """
        parts.append(prompt)

        models_to_try = [model] + _get_fallback_models(model)
        last_err = None
        
        for m in models_to_try:
            try:
                def _api_call(client: genai.Client) -> str:
                    cfg = types.GenerateContentConfig(
                        response_mime_type="application/json",
                    )
                    resp = client.models.generate_content(
                        model=m,
                        contents=parts,
                        config=cfg
                    )
                    return resp.text or ""
                
                result_text = _execute_with_key_fallback(_api_call)
                try:
                    res_json = json.loads(result_text)
                    selected_idx = int(res_json.get("selected_index", 0))
                    angle = res_json.get("angle_match")
                    angle = int(angle) if angle is not None else None
                    if 0 <= selected_idx < len(valid_candidates):
                        return {"url": valid_candidates[selected_idx], "angle_match": angle}
                except Exception:
                    pass
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    logger.warning("Model %s returned 429 in select_best_matching_image. Trying next model fallback...", m)
                    last_err = e
                    continue
                raise e

        raise last_err or ValueError("All models and keys exhausted in select_best_matching_image.")

    res = cache_get_or_compute(key, _call)
    if isinstance(res, dict):
        url, angle = res.get("url"), res.get("angle_match")
    else:  # eski cache girdisi veya erken dönüş (str)
        url, angle = res, None
    return (url, angle) if with_score else url
