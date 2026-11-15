from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlsplit

# Interactive API docs are a development aid; hosted environments do not publish the schema.
DOCS_ENVIRONMENTS = frozenset({"local", "development"})


@dataclass(frozen=True)
class Settings:
    # Hosted defaults apply unless APP_ENV names a local environment.
    environment: str = "production"
    version: str = "0.1.0"
    max_request_bytes: int = 16 * 1024
    supabase_url: str = ""
    supabase_audience: str = "authenticated"
    demo_rate_per_client: int = 30
    demo_rate_total: int = 600
    assessment_rate_per_user: int = 60

    @property
    def docs_enabled(self) -> bool:
        return self.environment.strip().lower() in DOCS_ENVIRONMENTS

    def validate_auth(self) -> None:
        parsed = urlsplit(self.supabase_url)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
                or parsed.query or parsed.fragment or parsed.path):
            raise ValueError("SUPABASE_URL must be an HTTPS project origin.")
        if not self.supabase_audience:
            raise ValueError("SUPABASE_JWT_AUDIENCE must not be empty.")

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            environment=os.getenv("APP_ENV", cls.environment),
            version=os.getenv("APP_VERSION", cls.version),
            max_request_bytes=int(os.getenv("MAX_REQUEST_BYTES", cls.max_request_bytes)),
            supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
            supabase_audience=os.getenv("SUPABASE_JWT_AUDIENCE", cls.supabase_audience),
            demo_rate_per_client=int(os.getenv("DEMO_RATE_PER_CLIENT", cls.demo_rate_per_client)),
            demo_rate_total=int(os.getenv("DEMO_RATE_TOTAL", cls.demo_rate_total)),
            assessment_rate_per_user=int(os.getenv("ASSESSMENT_RATE_PER_USER", cls.assessment_rate_per_user)),
        )
