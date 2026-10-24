from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SiteGuard API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # URLs & Database
    SITEGUARD_API_URL: str = "http://127.0.0.1:8000"
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    DATABASE_URL: Optional[str] = "postgresql://siteguard:siteguard@localhost:5432/siteguard"
    CORS_ORIGINS: str = "http://127.0.0.1:8000,http://localhost:8000"

    # Keys & Registry
    REGISTRY_SIGNING_PRIVATE_KEY: Optional[str] = None
    REGISTRY_SIGNING_PUBLIC_KEY: Optional[str] = None
    REGISTRY_PATH: str = "./registry/brands.json"
    LOCAL_BADLIST_PATH: str = "./data/badhosts.csv"

    # Threat Feeds
    GOOGLE_SAFE_BROWSING_API_KEY: Optional[str] = None
    GOOGLE_WEB_RISK_API_KEY: Optional[str] = None
    OPENPHISH_FEED_URL: Optional[str] = "https://openphish.com/feed.txt"
    PHISHTANK_APP_KEY: Optional[str] = None

    # Intelligence & Fallbacks
    RDAP_BOOTSTRAP_URL: str = "https://data.iana.org/rdap/dns.json"
    CERTSTREAM_URL: str = "wss://certstream.calidog.io"
    CRTSH_URL: str = "https://crt.sh"
    TRANCO_LIST_URL: str = "https://tranco-list.eu/top-1m.csv.zip"
    WHOIS_API_KEY: Optional[str] = None

    # Cache & Rate Limiting
    DEFAULT_CACHE_TTL_SECONDS: int = 3600
    RATE_LIMIT_PER_MINUTE: int = 300

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
