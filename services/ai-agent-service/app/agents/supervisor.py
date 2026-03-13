"""
LangGraph Multi-Agent Supervisor for EcoClear AI Scrutiny Pipeline.

Architecture: Supervisor pattern where a central coordinator routes
work through specialized agent nodes in a defined sequence:

  Ingestion → Regulatory Analyzer → Validation/Draft → Reflector/Critic

The supervisor uses LangGraph's StateGraph to define the workflow DAG.
Each node operates on a shared TypedDict state and appends to a trace
log for auditability.
"""

import logging
from typing import Any, Dict, List, Optional

from langgraph.graph import StateGraph, END

from app.agents.nodes import (
    ingestion_node,
    regulatory_analyzer_node,
    validation_draft_node,
    reflector_node,
    eds_generation_node,
)

logger = logging.getLogger(__name__)


# ─────────────────────── State Definition ──────────────────────────────

class AgentState(dict):
    """
    Shared state flowing through the multi-agent pipeline.

    Keys:
      request: Original request payload (dict)
      context: Structured context from ingestion (dict)
      analysis: Raw LLM analysis output (dict)
      result: Structured compliance result (dict)
      review: Reflector quality review (dict)
      eds_request: EDS generation request (dict, optional)
      eds_result: Generated EDS letter (dict, optional)
      trace: List of execution trace entries (list[str])
    """
    pass


# ─────────────────────── Routing Logic ─────────────────────────────────


def should_generate_eds(state: dict) -> str:
    """Route to EDS generation if the analysis indicates it's needed."""
    result = state.get("result", {})
    if result.get("requires_eds", False):
        return "eds_generation"
    return END


# ─────────────────────── Graph Builders ────────────────────────────────


def build_scrutiny_graph() -> StateGraph:
    """
    Build the full scrutiny analysis pipeline graph.

    Flow:
      ingestion → regulatory_analyzer → validation_draft → reflector → (eds_generation | END)
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("ingestion", ingestion_node)
    graph.add_node("regulatory_analyzer", regulatory_analyzer_node)
    graph.add_node("validation_draft", validation_draft_node)
    graph.add_node("reflector", reflector_node)
    graph.add_node("eds_generation", eds_generation_node)

    # Define edges (sequential pipeline)
    graph.set_entry_point("ingestion")
    graph.add_edge("ingestion", "regulatory_analyzer")
    graph.add_edge("regulatory_analyzer", "validation_draft")
    graph.add_edge("validation_draft", "reflector")

    # Conditional routing after reflector
    graph.add_conditional_edges(
        "reflector",
        should_generate_eds,
        {
            "eds_generation": "eds_generation",
            END: END,
        }
    )
    graph.add_edge("eds_generation", END)

    return graph


def build_eds_graph() -> StateGraph:
    """
    Build a standalone EDS generation graph (for direct EDS requests).

    Flow: eds_generation → END
    """
    graph = StateGraph(AgentState)
    graph.add_node("eds_generation", eds_generation_node)
    graph.set_entry_point("eds_generation")
    graph.add_edge("eds_generation", END)
    return graph


# ─────────────────────── Compiled Graphs (singletons) ──────────────────

_scrutiny_app: Optional[Any] = None
_eds_app: Optional[Any] = None


def get_scrutiny_app():
    """Get or create the compiled scrutiny analysis graph."""
    global _scrutiny_app
    if _scrutiny_app is None:
        graph = build_scrutiny_graph()
        _scrutiny_app = graph.compile()
        logger.info("Scrutiny analysis graph compiled")
    return _scrutiny_app


def get_eds_app():
    """Get or create the compiled EDS generation graph."""
    global _eds_app
    if _eds_app is None:
        graph = build_eds_graph()
        _eds_app = graph.compile()
        logger.info("EDS generation graph compiled")
    return _eds_app


# ─────────────────────── Runner Functions ──────────────────────────────


async def run_scrutiny_analysis(request_data: dict) -> dict:
    """
    Run the full multi-agent scrutiny analysis pipeline.

    Args:
        request_data: Dict matching ScrutinyRequest schema

    Returns:
        Dict matching ScrutinyResponse schema
    """
    logger.info(f"Starting scrutiny analysis for: {request_data.get('application_id', 'unknown')}")

    app = get_scrutiny_app()

    initial_state = AgentState({
        "request": request_data,
        "context": {},
        "analysis": {},
        "result": {},
        "review": {},
        "trace": [],
    })

    # Run the graph
    final_state = await _run_graph(app, initial_state)

    result = final_state.get("result", {})
    result["agent_trace"] = final_state.get("trace", [])

    return result


async def run_eds_generation(request_data: dict) -> dict:
    """
    Run standalone EDS letter generation.

    Args:
        request_data: Dict matching EDSDraftRequest schema

    Returns:
        Dict matching EDSDraftResponse schema
    """
    logger.info(f"Starting EDS generation for: {request_data.get('application_id', 'unknown')}")

    app = get_eds_app()

    initial_state = AgentState({
        "request": request_data,
        "eds_request": request_data,
        "trace": [],
    })

    final_state = await _run_graph(app, initial_state)

    eds_result = final_state.get("eds_result", {})
    eds_result["application_id"] = request_data.get("application_id", "")

    return eds_result


async def _run_graph(app, initial_state: dict) -> dict:
    """Run a compiled LangGraph app and return final state."""
    final_state = initial_state
    async for event in app.astream(initial_state):
        # Each event is a dict with node name → state update
        for node_name, state_update in event.items():
            if isinstance(state_update, dict):
                final_state.update(state_update)
    return final_state
