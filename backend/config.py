from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = ""
    tavily_api_key: str = ""
    
    gemini_api_keys: str = ""
    tavily_api_keys: str = ""

    # ─── MODEL ATAMA STRATEJİSİ ────────────────────────────────────────────────
    # xray_agent: Forum/YouTube analizi — karmaşık çıkarım, yapılandırılmış JSON
    # Tercih: Gemini 3 Flash (frontier reasoning, boş kota) → 2.5 Flash fallback
    model_flash: str = "gemini-3-flash"

    # analysis_agent + advisor_agent (questions) + challenger_agent:
    # Orta karmaşıklık, yüksek hacim → Flash Lite (500 RPD, yüksek kota)
    model_lite: str = "gemini-2.5-flash-lite"

    # görsel analiz (generate_from_image) — multimodal yetenek gerektirir
    # Gemini 3 Flash multimodal destekli → 2.5 Flash fallback
    model_vision: str = "gemini-3-flash"

    # advisor_decision — son karar aşaması, kritik reasoning
    # Flash kalitesi gerektirir (AL/KOSULLU/ALMA kararı)
    model_pro: str = "gemini-3-flash"

    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    cache_ttl_seconds: int = 3600 * 6  # 6 saat
    cache_db_path: str = str(Path(__file__).parent / "mergen_cache.db")

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
