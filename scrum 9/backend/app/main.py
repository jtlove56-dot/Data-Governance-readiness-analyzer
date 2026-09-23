from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing_extensions import TypedDict

from app.assessment import AssessmentReceipt, AssessmentRequest
from app.config import get_settings


class HealthResponse(TypedDict):
    service: str
    status: str
    environment: str
    version: str


class VersionResponse(TypedDict):
    service: str
    version: str


settings = get_settings()

app = FastAPI(
    title="Karlsgate API",
    version=settings.version,
    description="Backend foundation for the Karlsgate project.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> HealthResponse:
    return {
        "service": "karlsgate-api",
        "status": "ok",
        "environment": settings.environment,
        "version": settings.version,
    }


@app.get("/version", tags=["system"])
def version() -> VersionResponse:
    return {
        "service": "karlsgate-api",
        "version": settings.version,
    }


@app.post("/assessments", tags=["assessments"], response_model=AssessmentReceipt)
def submit_assessment(answers: AssessmentRequest) -> AssessmentReceipt:
    return AssessmentReceipt()
