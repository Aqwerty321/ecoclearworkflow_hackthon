"""
EcoClear AI Agent Service — Pydantic models for request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Category(str, Enum):
    A = "A"
    B1 = "B1"
    B2 = "B2"


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ---- Scrutiny Analysis ----

class ScrutinyRequest(BaseModel):
    """Request payload for AI-powered scrutiny analysis."""
    application_id: str = Field(..., description="Application identifier")
    project_name: str = Field(..., description="Name of the project")
    industry_sector: str = Field(..., description="Industry sector (e.g. Mining, Energy)")
    category: Category = Field(..., description="Application category (A, B1, B2)")
    project_description: str = Field(..., description="Detailed project description")
    location: Optional[str] = Field(None, description="Project location text")
    district: Optional[str] = Field(None, description="District name")
    coordinates: Optional[dict] = Field(None, description="Project coordinates {lat, lng}")
    document_texts: list[str] = Field(default_factory=list, description="Extracted text from uploaded documents")


class ComplianceIssue(BaseModel):
    parameter: str = Field(..., description="Regulatory parameter name")
    requirement: str = Field(..., description="What is required")
    finding: str = Field(..., description="What was found / gap identified")
    severity: RiskLevel = Field(..., description="Severity of the issue")
    regulation_reference: Optional[str] = Field(None, description="Regulatory reference code")


class ScrutinyResponse(BaseModel):
    application_id: str
    overall_risk: RiskLevel
    compliance_score: float = Field(..., ge=0, le=100, description="Compliance score 0-100")
    summary: str = Field(..., description="Executive summary of analysis")
    compliance_issues: list[ComplianceIssue] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    requires_eds: bool = Field(False, description="Whether EDS should be issued")
    agent_trace: list[str] = Field(default_factory=list, description="Agent execution trace for audit")


# ---- EDS Draft Generation ----

class EDSDraftRequest(BaseModel):
    """Request payload for EDS (Essential Document Sought) letter generation."""
    application_id: str
    project_name: str
    applicant_name: Optional[str] = "Project Proponent"
    industry_sector: str
    category: Category
    compliance_issues: list[ComplianceIssue] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)
    additional_context: Optional[str] = None


class EDSDraftResponse(BaseModel):
    application_id: str
    eds_letter: str = Field(..., description="Formatted EDS letter content")
    subject_line: str = Field(..., description="Letter subject line")
    required_actions: list[str] = Field(default_factory=list)
    response_deadline_days: int = Field(30, description="Days given to respond")


# ---- Regulatory Compliance Check ----

class ComplianceCheckRequest(BaseModel):
    """Request for sector-specific regulatory compliance verification."""
    industry_sector: str
    category: Category
    project_description: str
    parameters: dict = Field(default_factory=dict, description="Key-value pairs of project parameters")


class ComplianceCheckResponse(BaseModel):
    sector: str
    category: str
    compliance_score: float
    risk_level: RiskLevel
    checks: list[dict] = Field(default_factory=list)
    missing_parameters: list[str] = Field(default_factory=list)
    applicable_regulations: list[str] = Field(default_factory=list)


# ---- Health ----

class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    agents_available: list[str]
    llm_configured: bool
