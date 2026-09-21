from dataclasses import dataclass
from os import getenv


@dataclass(frozen=True)
class Settings:
    environment: str
    version: str
    cors_origins: list[str]


def get_settings() -> Settings:
    origins = [
        origin.strip()
        for origin in getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]

    return Settings(
        environment=getenv("KARLSGATE_ENV", "local"),
        version=getenv("KARLSGATE_VERSION", "0.1.0"),
        cors_origins=origins,
    )
