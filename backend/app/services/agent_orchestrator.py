from typing import TypedDict, List, Dict, Any
import json
from loguru import logger
from langgraph.graph import StateGraph, END
import google.generativeai as genai

from app.core.config import settings
from app.services.quant_service import compute_revenue_metrics

class AgentState(TypedDict):
    transactions: List[Dict[str, Any]]
    financial_summary: Dict[str, Any]
    quant_metrics: Dict[str, Any]
    draft_report: str
    auditor_feedback: str
    is_approved: bool
    iterations: int
    final_report: Dict[str, Any]
    requires_human_review: bool
    report_type: str

class ReportGenerationError(Exception):
    """A report cannot be produced honestly. The message is shown to the user; the task does not retry."""


def _prompt_summary(state: AgentState) -> dict:
    """Financial summary without the transaction ledger, which only feeds the evidence."""
    return {k: v for k, v in state.get("financial_summary", {}).items() if k != "transactions"}


QUANT_GROUNDING = """
Quant Metrics are computed deterministically from the user's transactions. They are the ground truth:
- Quote them with their exact values; never recompute, round differently or contradict them.
- Income stability must follow volatility.cov_percent and volatility.level.
- Growth trend must follow trend.direction, trend.slope_percent_per_month and trend.r_squared.
- Seasonality must follow weak_months (weak and below-average months, longest streak).
- Client concentration must follow client_concentration.hhi, level and top_client_percent.
  If its level is UNKNOWN, say client-level data is unavailable instead of guessing.
- If data_quality_notes is not empty, state those limitations in the narrative.
- source_breakdown gives each platform's share of revenue and its coverage. Comment on it; a source
  with a short history must be described as observed so far, never annualised or extrapolated.
- When a factor refers to evidence, cite its transactions by platform and ID exactly as listed in
  evidence (e.g. "PAYPAL 5LT992323P9029315"). Never invent or alter a transaction ID.
"""


def data_quant_node(state: AgentState) -> AgentState:
    logger.info("Executing Data Quant Agent...")
    return {"quant_metrics": compute_revenue_metrics(state.get("financial_summary", {}))}

import asyncio

async def underwriter_node(state: AgentState) -> AgentState:
    logger.info("Executing Underwriter Agent (Self-Consistency)...")
    if not settings.GEMINI_API_KEY:
        raise ReportGenerationError("The AI engine is not configured (GEMINI_API_KEY is missing).")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name=settings.GEMINI_UNDERWRITER_MODEL)

    report_type = state.get("report_type", "FULL")

    rental_context = ""
    if report_type == "RENTAL":
        rental_context = """
IMPORTANT: This is a RENTAL SOLVENCY CERTIFICATE intended for a landlord or property agency.
- The narrative MUST focus heavily on the applicant's ability to consistently pay monthly rent.
- Analyze income stability, lack of negative risk flags, and provide a clear recommendation (APPROVE/REVIEW/DECLINE) based on typical rental criteria (e.g., stable income covering 3x typical rent).
- The tone should be formal, reassuring to landlords, and directly address tenant viability.
"""

    if report_type == "MORTGAGE_ASSESSMENT":
        prompt = f"""You are SolvAI's mortgage assessment engine.
Analyze this freelancer's financial data for mortgage qualification purposes.

Lenders assess freelancers differently from employees. Focus on:
1. Income stability over 24 months (if available) or trend projection from 12 months
2. Average annual income (monthly × 12)
3. Maximum mortgage estimate (annual income × 4.5, standard EU multiplier)
4. Income trend: growing/stable/declining
5. Income volatility: lenders prefer CoV < 25%
6. Self-employment duration signals (from data age)
7. Debt service capacity: can income support a mortgage payment?
8. Estimated monthly payment capacity based on a 33% debt-to-income (DTI) limit.
9. Recommended downpayment percentage (e.g. 20% for freelancers) and absolute amount based on max mortgage.
10. Industry stability and specific risk mitigations.

Financial Summary: {json.dumps(_prompt_summary(state))}
Quant Metrics: {json.dumps(state.get("quant_metrics", {}))}
{QUANT_GROUNDING}
Use volatility.cov_percent from Quant Metrics as cov_percentage.
Previous Auditor Feedback: {state.get("auditor_feedback", "None. This is the first draft.")}

Return ONLY valid JSON:
{{
  "overall_score": <0-100 integer>,
  "mortgage_score": <0-100 integer, same as overall_score>,
  "rating": "<STRONG|ACCEPTABLE|BORDERLINE|WEAK>",
  "avg_annual_income": <float>,
  "estimated_max_mortgage": <float>,
  "estimated_monthly_payment_capacity": <float>,
  "debt_to_income_ratio": "<string, e.g. '33%'>",
  "downpayment_recommendation": "<string, e.g. '20% (€50,000)'>",
  "income_trend": "<GROWING|STABLE|DECLINING>",
  "income_volatility": "<LOW|MEDIUM|HIGH>",
  "cov_percentage": <float>,
  "industry_stability": "<STRONG|MODERATE|VULNERABLE>",
  "lender_readiness": "<READY|NEEDS_IMPROVEMENT|NOT_READY>",
  "narrative": "<3-4 professional paragraphs>",
  "strengths": ["list of 3-5 positives"],
  "concerns": ["list of 0-3 concerns"],
  "risk_mitigation_strategies": ["list of 2-3 actionable ways to mitigate lender concerns"],
  "recommendations": ["list of 3 actionable steps"],
  "required_documents": [
    "24 months of bank statements",
    "2 years tax returns",
    "proof of identification",
    "proof of address"
  ]
}}
"""
    else:
        prompt = f"""You are SolvAI's Underwriter Agent.
{rental_context}
Generate a JSON solvency report based on the following data:
Financial Summary: {json.dumps(_prompt_summary(state))}
Quant Metrics: {json.dumps(state.get("quant_metrics", {}))}
{QUANT_GROUNDING}
Previous Auditor Feedback: {state.get("auditor_feedback", "None. This is the first draft.")}

Ensure your report is fully backed by the provided data.

The JSON MUST have exactly these keys:
{{
  "overall_score": <integer 0-100>,
  "recommendation": <"Approve" or "Reject">,
  "rating": <"Strong" | "Developing" | "At Risk">,
  "income_stability": {{"score": <int 0-100>, "description": <string>, "lender_implications": <string>}},
  "growth_trend": {{"score": <int 0-100>, "description": <string>, "lender_implications": <string>}},
  "seasonality": {{"score": <int 0-100>, "pattern": <string>, "description": <string>, "lender_implications": <string>}},
  "client_concentration": {{"score": <int 0-100>, "description": <string>, "lender_implications": <string>}},
  "reputation_signals": {{"score": <int 0-100>, "description": <string>, "lender_implications": <string>}},
  "narrative": <string 300-500 words explaining the score in plain English>,
  "risk_flags": [<list of strings>],
  "recommendations": [<list of strings>],
  "data_references": [<list of strings>]
}}

CRITICAL REQUIREMENTS:
1. For every identified weakness or risk, you MUST include a comprehensive "Actionable Remediation Plan" in the recommendations outlining step-by-step actions.
2. You MUST include an "Industry Context" section in the narrative analyzing how the metrics compare to the broader macroeconomic freelance/startup market.
3. RISK FLAG LOGIC: You MUST populate the "risk_flags" array with specific, explicitly quoted numbers if ANY component score is < 60, or if top client concentration > 40%. You must not generate generic risk flags; tie them directly to the metrics.
4. Make the report extremely dense, detailed, and professional.
"""

    # ── Retry loop: up to MAX_UNDERWRITER_ATTEMPTS total (1 initial + 2 retries) ──
    MAX_UNDERWRITER_ATTEMPTS = 3
    last_exception: Exception | None = None

    for attempt in range(1, MAX_UNDERWRITER_ATTEMPTS + 1):
        try:
            tasks = [
                model.generate_content_async(prompt, generation_config={"temperature": 0.4})
                for _ in range(3)
            ]
            responses = await asyncio.gather(*tasks)

            parsed_reports = []
            parse_errors = []
            for r in responses:
                clean_resp = r.text.replace('```json', '').replace('```', '').strip()
                try:
                    doc = json.loads(clean_resp)
                    # Validate the minimum required field exists and is numeric
                    if not isinstance(doc.get("overall_score"), (int, float)):
                        raise ValueError(
                            f"overall_score missing or non-numeric: {doc.get('overall_score')!r}"
                        )
                    parsed_reports.append(doc)
                except (json.JSONDecodeError, ValueError) as parse_err:
                    parse_errors.append(str(parse_err))
                    logger.warning(
                        f"[Underwriter attempt {attempt}] Self-consistency parse failure: {parse_err}"
                    )

            if not parsed_reports:
                # All 3 parallel calls failed to produce valid JSON — retry
                last_exception = ValueError(
                    f"All self-consistency drafts failed JSON validation on attempt {attempt}. "
                    f"Errors: {parse_errors}"
                )
                logger.warning(
                    f"[Underwriter attempt {attempt}/{MAX_UNDERWRITER_ATTEMPTS}] "
                    f"No valid drafts. Will retry if attempts remain."
                )
                continue  # next retry iteration

            # ── Success: choose best draft by self-consistency ────────────────
            recommendations = [r.get("recommendation", "Unknown") for r in parsed_reports]
            scores = [r.get("overall_score", 0) for r in parsed_reports]

            req_human_review = False
            if len(set(recommendations)) > 1:
                req_human_review = True
            if scores:
                max_score = max(scores)
                min_score = min(scores)
                if max_score > 0 and ((max_score - min_score) / max_score) > 0.05:
                    req_human_review = True

            chosen_draft = parsed_reports[0]
            logger.info(
                f"[Underwriter attempt {attempt}] Success — "
                f"{len(parsed_reports)}/3 valid drafts. "
                f"score={chosen_draft.get('overall_score')} "
                f"human_review={req_human_review}"
            )
            return {
                "draft_report": json.dumps(chosen_draft),
                "requires_human_review": req_human_review,
            }

        except Exception as e:
            import traceback
            last_exception = e
            logger.error(
                f"[Underwriter attempt {attempt}/{MAX_UNDERWRITER_ATTEMPTS}] "
                f"Exception: {e}\n{traceback.format_exc()}"
            )

    # ── All attempts exhausted ──────────────────────────────────────────────
    raise RuntimeError(
        f"Underwriter failed after {MAX_UNDERWRITER_ATTEMPTS} attempts. "
        f"Last error: {last_exception}"
    )


def auditor_node(state: AgentState) -> AgentState:
    logger.info(f"Executing Auditor Agent... iterations so far: {state.get('iterations', 0)}")
    iterations = state.get("iterations", 0) + 1

    def _parse_draft(raw: str) -> dict:
        """Parse and structurally validate the underwriter draft. Raises on failure."""
        cleaned = raw.replace('```json', '').replace('```', '').strip()
        doc = json.loads(cleaned)   # raises json.JSONDecodeError if malformed
        score = doc.get("overall_score")
        if not isinstance(score, (int, float)) or not (0 <= float(score) <= 100):
            raise ValueError(
                f"overall_score must be a number 0-100, got {score!r}"
            )
        return doc

    if not settings.GEMINI_API_KEY:
        raise ReportGenerationError("The AI engine is not configured (GEMINI_API_KEY is missing).")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name=settings.GEMINI_LIGHT_MODEL)

    prompt = f"""You are SolvAI's Auditor Agent (Red Team).
Review the following Draft Report against the raw Financial Summary.
Financial Summary: {json.dumps(_prompt_summary(state))}
Quant Metrics (deterministic ground truth): {json.dumps(state.get("quant_metrics", {}))}
Draft Report: {state.get("draft_report", "")}

1. If the draft makes claims not mathematically supported by the summary, or quotes or contradicts
   the Quant Metrics incorrectly (CoV, trend, weak months, HHI), FAIL it and provide critique.
2. If the draft is missing a detailed "Actionable Remediation Plan" or an "Industry Context" section, FAIL it.
Respond ONLY with a JSON object: {{"is_approved": true/false, "critique": "your feedback"}}
"""
    try:
        # Use temp=0.0 for deterministic auditing
        response = model.generate_content(prompt, generation_config={"temperature": 0.0})
        clean_resp = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(clean_resp)

        is_approved = result.get("is_approved", False)

        updates: dict = {
            "is_approved": is_approved,
            "auditor_feedback": result.get("critique", ""),
            "iterations": iterations,
        }

        if is_approved or iterations >= 3 or state.get("requires_human_review"):
            # Finalize: parse and validate the draft before committing to state
            try:
                final_report = _parse_draft(state.get("draft_report", "{}"))

                # Regex score rescue: score present but formatted unexpectedly
                if "overall_score" not in final_report or final_report.get("overall_score") in ["N/A", None, ""]:
                    import re
                    match = re.search(r'"overall_score"\s*:\s*(\d+(\.\d+)?)', state.get("draft_report", ""))
                    if match:
                        final_report["overall_score"] = float(match.group(1))

                updates["final_report"] = final_report
                logger.info(f"[Auditor] Draft accepted. score={final_report.get('overall_score')}")

            except (json.JSONDecodeError, ValueError) as parse_err:
                # Never publish a placeholder score: fail the report instead
                logger.error(f"[Auditor] Final draft failed structural validation: {parse_err}")
                raise ReportGenerationError(
                    "The AI could not produce a valid report from your data. Please try again."
                ) from parse_err

        logger.info(f"[Auditor] iteration={iterations} approved={is_approved}")
        return updates

    except ReportGenerationError:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Auditor error: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)


def should_continue(state: AgentState) -> str:
    if state.get("requires_human_review"):
        return "end"
    if state.get("is_approved") or state.get("iterations", 0) >= 3:
        return "end"
    return "continue"

def build_orchestrator():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("data_quant", data_quant_node)
    workflow.add_node("underwriter", underwriter_node)
    workflow.add_node("auditor", auditor_node)
    
    workflow.set_entry_point("data_quant")
    workflow.add_edge("data_quant", "underwriter")
    workflow.add_edge("underwriter", "auditor")
    
    workflow.add_conditional_edges(
        "auditor",
        should_continue,
        {
            "continue": "underwriter",
            "end": END
        }
    )
    
    return workflow.compile()

# Instancia global del orquestador compilado
orchestrator = build_orchestrator()

async def run_orchestrator_stream(initial_state: AgentState):
    """
    Función generadora asíncrona que explota las capacidades de streaming de LangGraph.
    Emite el estado de la telemetría en tiempo real.
    """
    # Emit start event
    yield {
        "agent": "system",
        "status": "started",
        "message": "Iniciando orquestación de agentes SolvAI...",
        "payload": {}
    }
    
    last_state = initial_state
    
    try:
        # astream yields (node_name, state_update)
        async for output in orchestrator.astream(initial_state):
            for node_name, state_update in output.items():
                # Merge state update to keep track
                last_state.update(state_update)
                
                message = f"Procesando en {node_name}..."
                if node_name == "data_quant":
                    message = "Cuantificando métricas financieras base..."
                elif node_name == "underwriter":
                    message = "Generando evaluación de riesgo (Self-Consistency)..."
                elif node_name == "auditor":
                    message = "Ejecutando revisión de cumplimiento y alucinaciones..."
                    
                yield {
                    "agent": node_name,
                    "status": "processing",
                    "message": message,
                    "payload": {} # Sending minimal payload for speed, could include diffs
                }
    except Exception as e:
        logger.exception("Orchestrator failed")
        # Tracebacks stay in the logs; the terminal only shows a user-safe message
        yield {
            "agent": "system",
            "status": "error",
            "message": str(e) if isinstance(e, ReportGenerationError) else "Report generation failed.",
            "payload": {}
        }
        raise
            
    # Final event
    score = last_state.get("final_report", {}).get("overall_score", "N/A")
    yield {
        "agent": "system",
        "status": "completed",
        "message": f"Orquestación finalizada. Score calculado: {score}",
        "payload": {
            "overall_score": score,
            "requires_human_review": last_state.get("requires_human_review", False),
            "final_report": last_state.get("final_report", {}),
            "quant_metrics": last_state.get("quant_metrics", {}),
        }
    }
