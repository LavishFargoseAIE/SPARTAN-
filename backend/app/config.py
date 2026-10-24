"""
SiteGuard configuration management via Pydantic Settings.
"""

from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REGISTRY_SIGNING_PRIVATE_KEY: Optional[str] = None
    REGISTRY_SIGNING_PUBLIC_KEY: Optional[str] = None
    SITEGUARD_API_URL: str = "http://127.0.0.1:8000"
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    DATABASE_URL: Optional[str] = "postgresql://siteguard:siteguard@localhost:5432/siteguard"
    CORS_ORIGINS: str = "http://127.0.0.1:8000,http://localhost:8000"

    # Threat feeds
    GOOGLE_SAFE_BROWSING_API_KEY: Optional[str] = None
    GOOGLE_WEB_RISK_API_KEY: Optional[str] = None
    OPENPHISH_FEED_URL: Optional[str] = "https://openphish.com/feed.txt"
    LOCAL_BADLIST_PATH: str = "./data/badhosts.csv"
    HF_TOKEN: Optional[str] = None

    # Paths
    BRANDS_JSON_PATH: str = "./registry/brands.json"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
