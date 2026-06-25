from typing import TypedDict, List, Dict, Any, Optional
import json
from loguru import logger
from langgraph.graph import StateGraph, END
import google.generativeai as genai

from app.core.config import settings
from app.services.quant_service import analyze_quant_metrics

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

def data_quant_node(state: AgentState) -> AgentState:
    logger.info("Executing Data Quant Agent...")
    txs = state.get("transactions", [])
    summary = state.get("financial_summary", {})
    metrics = analyze_quant_metrics(txs, summary)
    return {"quant_metrics": metrics}

import asyncio

async def underwriter_node(state: AgentState) -> AgentState:
    logger.info("Executing Underwriter Agent (Self-Consistency)...")
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set. Mocking Underwriter.")
        return {"draft_report": '{"overall_score": 80, "recommendation": "Approve"}'}
        
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name="models/gemini-2.5-flash")
    
    prompt = f"""You are SolvAI's Underwriter Agent.
Generate a JSON solvency report based on the following data:
Financial Summary: {json.dumps(state.get("financial_summary", {}))}
Quant Metrics: {json.dumps(state.get("quant_metrics", {}))}

Previous Auditor Feedback: {state.get("auditor_feedback", "None. This is the first draft.")}

Ensure your report is fully backed by the provided data.
You MUST include "overall_score" (number 0-100) and "recommendation" ("Approve" or "Reject") in your JSON.

CRITICAL REQUIREMENTS:
1. For every identified weakness or risk, you MUST include a comprehensive "Actionable Remediation Plan" outlining step-by-step actions to improve solvency.
2. You MUST include an "Industry Context" section analyzing how the applicant's metrics compare to the broader macroeconomic freelance/startup market.
3. Make the report extremely dense, detailed, and professional. Ensure the output is large enough to span multiple pages when rendered.
"""
    try:
        tasks = [
            model.generate_content_async(prompt, generation_config={"temperature": 0.4})
            for _ in range(3)
        ]
        responses = await asyncio.gather(*tasks)
        
        parsed_reports = []
        for r in responses:
            clean_resp = r.text.replace('```json', '').replace('```', '').strip()
            try:
                parsed_reports.append(json.loads(clean_resp))
            except json.JSONDecodeError:
                pass
                
        if not parsed_reports:
             return {"draft_report": '{"error": "Underwriter parsing failed"}'}
             
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
        
        return {
            "draft_report": json.dumps(chosen_draft),
            "requires_human_review": req_human_review
        }
    except Exception as e:
        import traceback
        error_msg = f"Underwriter error: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def auditor_node(state: AgentState) -> AgentState:
    logger.info(f"Executing Auditor Agent... Input state: {state}")
    iterations = state.get("iterations", 0) + 1
    
    if not settings.GEMINI_API_KEY:
         logger.warning("GEMINI_API_KEY not set. Mocking Auditor.")
         try:
             final_report = json.loads(state.get("draft_report", "{}").replace('```json', '').replace('```', '').strip())
         except:
             final_report = {"overall_score": 85, "recommendation": "Approve", "mock": True}
         return {"is_approved": True, "iterations": iterations, "final_report": final_report}
         
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name="models/gemini-2.5-flash")
    
    prompt = f"""You are SolvAI's Auditor Agent (Red Team).
Review the following Draft Report against the raw Financial Summary.
Financial Summary: {json.dumps(state.get("financial_summary", {}))}
Draft Report: {state.get("draft_report", "")}

1. If the draft makes claims not mathematically supported by the summary, FAIL it and provide critique.
2. If the draft is missing a detailed "Actionable Remediation Plan" or an "Industry Context" section, FAIL it.
Respond ONLY with a JSON object: {{"is_approved": true/false, "critique": "your feedback"}}
"""
    try:
        # Use temp=0.0 for deterministic auditing
        response = model.generate_content(prompt, generation_config={"temperature": 0.0})
        # Basic JSON extraction
        clean_resp = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(clean_resp)
        
        is_approved = result.get("is_approved", False)
        
        updates = {
            "is_approved": is_approved, 
            "auditor_feedback": result.get("critique", ""),
            "iterations": iterations
        }
        
        if is_approved or iterations >= 3 or state.get("requires_human_review"):
             # Finalize if approved or max retries reached or human review required
             try:
                 final_report = json.loads(state.get("draft_report", "{}").replace('```json', '').replace('```', '').strip())
                 
                 # Regex fallback
                 if "overall_score" not in final_report or final_report.get("overall_score") in ["N/A", None, ""]:
                     import re
                     match = re.search(r'"overall_score"\s*:\s*(\d+(\.\d+)?)', state.get("draft_report", ""))
                     if match:
                         final_report["overall_score"] = float(match.group(1))
                 
                 updates["final_report"] = final_report
             except:
                 updates["final_report"] = {"raw_draft": state.get("draft_report")}
                 
        logger.info(f"Auditor final report: {updates.get('final_report')}")
        logger.info(f"Auditor output state updates: {updates}")
        return updates
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
    
    import traceback
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
        yield {
            "agent": "system",
            "status": "error",
            "message": f"Orchestrator failed: {str(e)}\n{traceback.format_exc()}",
            "payload": {}
        }
        return
            
    # Final event
    score = last_state.get("final_report", {}).get("overall_score", "N/A")
    yield {
        "agent": "system",
        "status": "completed",
        "message": f"Orquestación finalizada. Score calculado: {score}",
        "payload": {
            "overall_score": score,
            "requires_human_review": last_state.get("requires_human_review", False),
            "final_report": last_state.get("final_report", {})
        }
    }
