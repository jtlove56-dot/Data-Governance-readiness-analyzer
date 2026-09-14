from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.scoring import AssessmentInput, AssessmentResult, assess

app = FastAPI(
    title="Data Governance Readiness API",
    description="Transparent rule-based assessment service.",
    version=settings.version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/version", tags=["system"])
def version() -> dict[str, str]:
    return {"version": settings.version}


@app.post("/assessments", response_model=AssessmentResult, tags=["assessment"])
def create_assessment(payload: AssessmentInput) -> AssessmentResult:
    return assess(payload)

