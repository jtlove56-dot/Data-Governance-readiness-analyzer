import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("APP_ENV", "development")
    version: str = os.getenv("APP_VERSION", "0.1.0")
    max_request_bytes: int = int(os.getenv("MAX_REQUEST_BYTES", str(16 * 1024)))
    allowed_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    )


settings = Settings()
