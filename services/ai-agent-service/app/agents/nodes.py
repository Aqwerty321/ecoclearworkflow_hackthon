"""
LangGraph Agent Nodes — Specialized processing nodes for the EcoClear
multi-agent scrutiny pipeline.

Architecture (from upgrade plan):
  - Ingestion Node: Parses and structures incoming application data
  - Regulatory Analyzer Node: Cross-references against CECB sector rules
  - Validation & Draft Node: Generates compliance findings + EDS drafts
  - Reflector/Critic Node: Reviews outputs for quality and completeness

Each node is a function that operates on the shared AgentState TypedDict.
"""

import logging
from typing import Any

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agents.regulations import (
    get_sector_rules,
    get_required_docs,
    REGULATION_REFERENCES,
)

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.1) -> ChatGoogleGenerativeAI:
    """Create a Gemini LLM instance."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=temperature,
    )


# ─────────────────────────── Ingestion Node ────────────────────────────


def ingestion_node(state: dict) -> dict:
    """
    Ingestion Node — Parses and structures the incoming application data.
    Extracts key parameters and prepares context for downstream analysis.
    """
    logger.info("Ingestion Node: Parsing application data")

    request = state["request"]
    sector = request.get("industry_sector", "")
    category = request.get("category", "B2")

    # Gather regulatory context
    sector_rules = get_sector_rules(sector)
    required_docs = get_required_docs(category)
    document_texts = request.get("document_texts", [])

    # Build structured context
    context = {
        "project_name": request.get("project_name", "Unknown Project"),
        "sector": sector,
        "category": category,
        "description": request.get("project_description", ""),
        "location": request.get("location", "Not specified"),
        "district": request.get("district", "Not specified"),
        "coordinates": request.get("coordinates"),
        "sector_rules": sector_rules,
        "required_docs": required_docs,
        "submitted_docs_count": len(document_texts),
        "document_texts": document_texts,
    }

    trace = state.get("trace", [])
    trace.append(f"[Ingestion] Parsed application: {context['project_name']} | "
                 f"Sector: {sector} | Category: {category} | "
                 f"Rules: {len(sector_rules)} | Docs submitted: {len(document_texts)}")

    return {
        **state,
        "context": context,
        "trace": trace,
    }


# ─────────────────────────── Regulatory Analyzer Node ──────────────────


def regulatory_analyzer_node(state: dict) -> dict:
    """
    Regulatory Analyzer Node — Uses LLM to cross-reference application
    data against sector-specific CECB regulations. Produces compliance
    findings with severity assessments.
    """
    logger.info("Regulatory Analyzer Node: Analyzing compliance")

    context = state["context"]
    llm = get_llm(temperature=0.1)

    rules_text = "\n".join(f"  {i+1}. {r}" for i, r in enumerate(context["sector_rules"]))
    required_docs_text = "\n".join(f"  {i+1}. {d}" for i, d in enumerate(context["required_docs"]))

    refs_text = "\n".join(f"  - {k}: {v}" for k, v in REGULATION_REFERENCES.items())

    doc_context = ""
    if context["document_texts"]:
        doc_context = "\n\nDOCUMENT EXCERPTS PROVIDED:\n" + "\n---\n".join(
            context["document_texts"][:5]  # Limit to first 5 for context window
        )

    prompt = f"""You are a senior environmental regulatory compliance analyst for CECB (Chhattisgarh Environment Conservation Board).

Analyze the following application for regulatory compliance:

PROJECT: {context['project_name']}
SECTOR: {context['sector']}
CATEGORY: {context['category']} ({'High Impact - Full EIA required' if context['category'] == 'A' else 'Medium Impact' if context['category'] == 'B1' else 'Low Impact'})
LOCATION: {context['location']}
DISTRICT: {context['district']}
DESCRIPTION: {context['description']}

SECTOR-SPECIFIC REGULATORY PARAMETERS:
{rules_text if rules_text.strip() else '  No sector-specific rules configured.'}

REQUIRED DOCUMENTS FOR CATEGORY {context['category']}:
{required_docs_text}

APPLICABLE REGULATIONS:
{refs_text}
{doc_context}

INSTRUCTIONS:
For each regulatory parameter, provide a JSON array of findings. Each finding must have:
- "parameter": the regulatory parameter name
- "status": one of "compliant", "non_compliant", "needs_review", "missing"
- "severity": one of "critical", "high", "medium", "low"
- "details": explanation of the finding
- "recommendation": recommended action
- "regulation_ref": applicable regulation reference (or null)

Also provide:
- "missing_documents": list of documents not evidenced in the submission
- "overall_assessment": brief paragraph summarizing the compliance posture
- "compliance_score": integer 0-100 based on your assessment

Respond with ONLY valid JSON (no markdown code fences)."""

    messages = [
        SystemMessage(content="You are an expert CECB regulatory compliance analyst. Respond only with valid JSON."),
        HumanMessage(content=prompt),
    ]

    response = llm.invoke(messages)

    # Parse LLM response
    import json
    try:
        # Clean potential markdown fences
        resp_text = response.content
        if isinstance(resp_text, str):
            resp_text = resp_text.strip()
            if resp_text.startswith("```"):
                resp_text = resp_text.split("\n", 1)[1] if "\n" in resp_text else resp_text
                if resp_text.endswith("```"):
                    resp_text = resp_text[:-3].strip()
                # Remove language identifier if present
                if resp_text.startswith("json"):
                    resp_text = resp_text[4:].strip()
            analysis = json.loads(resp_text)
        else:
            analysis = {"findings": [], "missing_documents": [], "overall_assessment": "Unable to parse response", "compliance_score": 50}
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM response as JSON, using fallback")
        analysis = {
            "findings": [],
            "missing_documents": context["required_docs"],
            "overall_assessment": str(response.content)[:500],
            "compliance_score": 40,
        }

    trace = state.get("trace", [])
    findings_count = len(analysis.get("findings", []))
    trace.append(f"[Regulatory Analyzer] Generated {findings_count} findings | "
                 f"Score: {analysis.get('compliance_score', 'N/A')}")

    return {
        **state,
        "analysis": analysis,
        "trace": trace,
    }


# ─────────────────────────── Validation & Draft Node ───────────────────


def validation_draft_node(state: dict) -> dict:
    """
    Validation & Draft Node — Takes analysis results and produces
    structured compliance response with EDS draft if needed.
    """
    logger.info("Validation & Draft Node: Structuring output")

    analysis = state.get("analysis", {})
    context = state.get("context", {})

    findings = analysis.get("findings", [])
    missing_docs = analysis.get("missing_documents", [])
    score = analysis.get("compliance_score", 50)
    assessment = analysis.get("overall_assessment", "")

    # Determine risk level from score
    if score >= 80:
        risk_level = "low"
    elif score >= 60:
        risk_level = "medium"
    elif score >= 40:
        risk_level = "high"
    else:
        risk_level = "critical"

    # Determine if EDS is needed
    has_critical = any(
        f.get("severity") in ("critical", "high") and f.get("status") in ("non_compliant", "missing")
        for f in findings
    )
    requires_eds = has_critical or len(missing_docs) > 2 or score < 60

    # Generate recommendations
    recommendations = []
    for f in findings:
        if f.get("status") in ("non_compliant", "missing", "needs_review"):
            rec = f.get("recommendation", "")
            if rec and rec not in recommendations:
                recommendations.append(rec)

    result = {
        "application_id": state["request"].get("application_id", ""),
        "overall_risk": risk_level,
        "compliance_score": float(score),
        "summary": assessment,
        "compliance_issues": [
            {
                "parameter": f.get("parameter", ""),
                "requirement": f.get("details", ""),
                "finding": f.get("recommendation", ""),
                "severity": f.get("severity", "medium"),
                "regulation_reference": f.get("regulation_ref"),
            }
            for f in findings
            if f.get("status") in ("non_compliant", "missing", "needs_review")
        ],
        "missing_documents": missing_docs,
        "recommendations": recommendations,
        "requires_eds": requires_eds,
    }

    trace = state.get("trace", [])
    trace.append(f"[Validation & Draft] Risk: {risk_level} | Score: {score} | "
                 f"Issues: {len(result['compliance_issues'])} | EDS needed: {requires_eds}")

    return {
        **state,
        "result": result,
        "trace": trace,
    }


# ─────────────────────────── Reflector / Critic Node ───────────────────


def reflector_node(state: dict) -> dict:
    """
    Reflector/Critic Node — Reviews the analysis for quality, completeness,
    and consistency. Can flag issues for re-analysis.
    """
    logger.info("Reflector Node: Quality review")

    result = state.get("result", {})
    context = state.get("context", {})
    llm = get_llm(temperature=0.2)

    prompt = f"""You are a quality assurance reviewer for CECB environmental clearance analysis.

Review the following analysis output for quality and completeness:

PROJECT: {context.get('project_name', 'Unknown')}
SECTOR: {context.get('sector', 'Unknown')}
CATEGORY: {context.get('category', 'Unknown')}

ANALYSIS RESULT:
- Overall Risk: {result.get('overall_risk', 'unknown')}
- Compliance Score: {result.get('compliance_score', 0)}
- Issues Found: {len(result.get('compliance_issues', []))}
- Missing Documents: {len(result.get('missing_documents', []))}
- EDS Required: {result.get('requires_eds', False)}
- Summary: {result.get('summary', '')[:500]}

SECTOR RULES CHECKED: {len(context.get('sector_rules', []))}

QUALITY CHECKS:
1. Does the compliance score align with the risk level and findings?
2. Are all sector-specific parameters addressed in findings?
3. Are the recommendations actionable and specific?
4. Is the missing documents list complete for the category?
5. Is the EDS recommendation appropriate given the findings?

Respond with JSON containing:
- "quality_score": 0-100
- "issues": list of quality issues found (strings)
- "adjustments": any recommended adjustments to the result
- "approved": boolean (true if quality is acceptable)

Respond with ONLY valid JSON."""

    messages = [
        SystemMessage(content="You are a QA reviewer. Respond with valid JSON only."),
        HumanMessage(content=prompt),
    ]

    response = llm.invoke(messages)

    import json
    try:
        resp_text = response.content
        if isinstance(resp_text, str):
            resp_text = resp_text.strip()
            if resp_text.startswith("```"):
                resp_text = resp_text.split("\n", 1)[1] if "\n" in resp_text else resp_text
                if resp_text.endswith("```"):
                    resp_text = resp_text[:-3].strip()
                if resp_text.startswith("json"):
                    resp_text = resp_text[4:].strip()
            review = json.loads(resp_text)
        else:
            review = {"quality_score": 70, "issues": [], "approved": True}
    except json.JSONDecodeError:
        review = {"quality_score": 70, "issues": ["Could not parse reflector response"], "approved": True}

    trace = state.get("trace", [])
    trace.append(f"[Reflector] Quality: {review.get('quality_score', 'N/A')} | "
                 f"Approved: {review.get('approved', True)} | "
                 f"Issues: {len(review.get('issues', []))}")

    # Attach trace to final result
    final_result = result.copy()
    final_result["agent_trace"] = trace

    return {
        **state,
        "result": final_result,
        "review": review,
        "trace": trace,
    }


# ─────────────────────────── EDS Generation Node ──────────────────────


def eds_generation_node(state: dict) -> dict:
    """
    EDS Generation Node — Generates a formal EDS (Essential Document Sought)
    letter when the scrutiny analysis identifies significant deficiencies.
    """
    logger.info("EDS Generation Node: Drafting EDS letter")

    request = state.get("eds_request", state.get("request", {}))
    llm = get_llm(temperature=0.2)

    deficiencies = request.get("compliance_issues", [])
    missing_docs = request.get("missing_documents", [])

    deficiency_text = "\n".join(
        f"  {i+1}. {d.get('parameter', d) if isinstance(d, dict) else d}: "
        f"{d.get('finding', '') if isinstance(d, dict) else ''}"
        for i, d in enumerate(deficiencies)
    ) if deficiencies else "  None specified"

    missing_text = "\n".join(
        f"  {i+1}. {d}" for i, d in enumerate(missing_docs)
    ) if missing_docs else "  None"

    prompt = f"""Draft a formal EDS (Essential Document Sought) letter for CECB.

PROJECT: {request.get('project_name', 'Unknown')}
APPLICANT: {request.get('applicant_name', 'Project Proponent')}
SECTOR: {request.get('industry_sector', 'Unknown')}
CATEGORY: {request.get('category', 'B2')}

IDENTIFIED DEFICIENCIES:
{deficiency_text}

MISSING DOCUMENTS:
{missing_text}

ADDITIONAL CONTEXT:
{request.get('additional_context', 'None')}

Draft a formal government-style EDS letter with:
1. Reference number and date
2. Clear listing of each deficiency
3. Complete list of missing documents
4. 30-day response deadline
5. Warning about consequences of non-compliance
6. Professional government correspondence tone

Respond with JSON containing:
- "subject_line": letter subject
- "eds_letter": full letter text
- "required_actions": list of required actions
- "response_deadline_days": integer

Respond with ONLY valid JSON."""

    messages = [
        SystemMessage(content="You are a CECB official drafting formal EDS correspondence. Respond with valid JSON only."),
        HumanMessage(content=prompt),
    ]

    response = llm.invoke(messages)

    import json
    try:
        resp_text = response.content
        if isinstance(resp_text, str):
            resp_text = resp_text.strip()
            if resp_text.startswith("```"):
                resp_text = resp_text.split("\n", 1)[1] if "\n" in resp_text else resp_text
                if resp_text.endswith("```"):
                    resp_text = resp_text[:-3].strip()
                if resp_text.startswith("json"):
                    resp_text = resp_text[4:].strip()
            eds_result = json.loads(resp_text)
        else:
            eds_result = {
                "subject_line": "Essential Documents Sought",
                "eds_letter": "Unable to generate letter.",
                "required_actions": [],
                "response_deadline_days": 30,
            }
    except json.JSONDecodeError:
        eds_result = {
            "subject_line": "Essential Documents Sought",
            "eds_letter": str(response.content)[:2000],
            "required_actions": missing_docs,
            "response_deadline_days": 30,
        }

    trace = state.get("trace", [])
    trace.append(f"[EDS Generator] Letter drafted | Actions: {len(eds_result.get('required_actions', []))}")

    return {
        **state,
        "eds_result": eds_result,
        "trace": trace,
    }
