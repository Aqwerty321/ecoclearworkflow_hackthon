"""
EcoClear AI Agent Service — FastAPI application.

Multi-agent scrutiny analysis service powered by LangGraph + Google Gemini.
Provides endpoints for:
  - Full scrutiny analysis (multi-agent pipeline)
  - EDS draft generation
  - Regulatory compliance check
  - Health check

Port: 8001
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import (
    ScrutinyRequest,
    ScrutinyResponse,
    ComplianceIssue,
    EDSDraftRequest,
    EDSDraftResponse,
    ComplianceCheckRequest,
    ComplianceCheckResponse,
    HealthResponse,
    RiskLevel,
)
from app.agents.supervisor import run_scrutiny_analysis, run_eds_generation
from app.agents.regulations import get_sector_rules, get_required_docs, get_all_sectors

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("ecoclear-ai-agent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("EcoClear AI Agent Service starting up")
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if api_key:
        logger.info("Google API key configured")
    else:
        logger.warning("GOOGLE_API_KEY not set — LLM calls will fail")

    if os.getenv("LANGCHAIN_TRACING_V2", "").lower() == "true":
        logger.info(f"LangSmith tracing enabled — project: {os.getenv('LANGCHAIN_PROJECT', 'default')}")

    yield
    logger.info("EcoClear AI Agent Service shutting down")


app = FastAPI(
    title="EcoClear AI Agent Service",
    description="Multi-agent scrutiny analysis powered by LangGraph + Google Gemini",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:9002",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────── Health ────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        service="ecoclear-ai-agent",
        agents_available=[
            "scrutiny-pipeline",
            "eds-generator",
            "compliance-checker",
        ],
        llm_configured=bool(os.getenv("GOOGLE_API_KEY")),
    )


# ─────────────────────── Scrutiny Analysis ─────────────────────────────


@app.post("/api/scrutiny/analyze", response_model=ScrutinyResponse)
async def analyze_scrutiny(request: ScrutinyRequest):
    """
    Run the full multi-agent scrutiny analysis pipeline.

    Pipeline: Ingestion → Regulatory Analyzer → Validation/Draft → Reflector → (EDS if needed)
    """
    try:
        request_data = request.model_dump()
        result = await run_scrutiny_analysis(request_data)

        # Map result to response schema
        compliance_issues = []
        for issue in result.get("compliance_issues", []):
            try:
                severity = issue.get("severity", "medium")
                if severity not in ("critical", "high", "medium", "low"):
                    severity = "medium"
                compliance_issues.append(ComplianceIssue(
                    parameter=issue.get("parameter", "Unknown"),
                    requirement=issue.get("requirement", ""),
                    finding=issue.get("finding", ""),
                    severity=RiskLevel(severity),
                    regulation_reference=issue.get("regulation_reference"),
                ))
            except Exception:
                continue

        risk = result.get("overall_risk", "medium")
        if risk not in ("critical", "high", "medium", "low"):
            risk = "medium"

        return ScrutinyResponse(
            application_id=result.get("application_id", request.application_id),
            overall_risk=RiskLevel(risk),
            compliance_score=result.get("compliance_score", 50.0),
            summary=result.get("summary", "Analysis complete."),
            compliance_issues=compliance_issues,
            missing_documents=result.get("missing_documents", []),
            recommendations=result.get("recommendations", []),
            requires_eds=result.get("requires_eds", False),
            agent_trace=result.get("agent_trace", []),
        )

    except Exception as e:
        logger.error(f"Scrutiny analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ─────────────────────── EDS Generation ────────────────────────────────


@app.post("/api/eds/generate", response_model=EDSDraftResponse)
async def generate_eds(request: EDSDraftRequest):
    """Generate a formal EDS (Essential Document Sought) letter."""
    try:
        request_data = request.model_dump()
        result = await run_eds_generation(request_data)

        return EDSDraftResponse(
            application_id=result.get("application_id", request.application_id),
            eds_letter=result.get("eds_letter", ""),
            subject_line=result.get("subject_line", "Essential Documents Sought"),
            required_actions=result.get("required_actions", []),
            response_deadline_days=result.get("response_deadline_days", 30),
        )

    except Exception as e:
        logger.error(f"EDS generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"EDS generation failed: {str(e)}")


# ─────────────────────── Compliance Check ──────────────────────────────


@app.post("/api/compliance/check", response_model=ComplianceCheckResponse)
async def check_compliance(request: ComplianceCheckRequest):
    """
    Quick sector-specific regulatory compliance check.
    Uses rule-based logic without full LLM pipeline (faster).
    """
    try:
        sector = request.industry_sector
        category = request.category.value
        params = request.parameters

        sector_rules = get_sector_rules(sector)
        required_docs = get_required_docs(category)

        # Rule-based quick check
        checks = []
        compliant_count = 0

        for rule in sector_rules:
            # Check if any parameter keys loosely match the rule
            rule_lower = rule.lower()
            matched = any(
                key.lower() in rule_lower or rule_lower in key.lower()
                for key in params.keys()
            )
            status = "provided" if matched else "missing"
            if matched:
                compliant_count += 1
            checks.append({
                "parameter": rule,
                "status": status,
                "category": category,
            })

        total_checks = len(sector_rules) if sector_rules else 1
        score = (compliant_count / total_checks) * 100 if total_checks > 0 else 50.0

        if score >= 80:
            risk = RiskLevel.LOW
        elif score >= 60:
            risk = RiskLevel.MEDIUM
        elif score >= 40:
            risk = RiskLevel.HIGH
        else:
            risk = RiskLevel.CRITICAL

        # Identify missing parameters
        missing = [c["parameter"] for c in checks if c["status"] == "missing"]

        return ComplianceCheckResponse(
            sector=sector,
            category=category,
            compliance_score=round(score, 1),
            risk_level=risk,
            checks=checks,
            missing_parameters=missing,
            applicable_regulations=[
                "EIA Notification 2006",
                "Environment Protection Act 1986",
                f"CECB {sector} Sector Guidelines",
            ],
        )

    except Exception as e:
        logger.error(f"Compliance check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")


# ─────────────────────── Entry Point ───────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
