"""
MemoryOps – FastAPI Backend
AI Incident Response Agent powered by Groq LLM + Hindsight persistent memory
"""

import json
import os
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from hindsight_client import Hindsight

# ─── Config ───────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("memoryops")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
HINDSIGHT_BASE_URL = os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "memoryops-incidents")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ─── Clients ──────────────────────────────────────────────────────────────────

groq_client = Groq(api_key=GROQ_API_KEY)
hindsight = Hindsight(base_url=HINDSIGHT_BASE_URL, api_key=HINDSIGHT_API_KEY or None)

# ─── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="MemoryOps API",
    description="AI Incident Response Agent with Hindsight persistent memory",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ──────────────────────────────────────────────────────────

class IncidentInput(BaseModel):
    title: str
    description: str
    severity: str = "P2"
    service: str = "unknown"


class ResolutionInput(BaseModel):
    incident_id: str
    title: str
    description: str
    severity: str
    service: str
    resolution: str
    outcome: str  # "SUCCESS" | "FAILED" | "PARTIAL"
    root_cause: Optional[str] = ""


class AnalysisResponse(BaseModel):
    incident_id: str
    memories_found: int
    similar_incidents: list
    successful_approaches: list
    failed_approaches: list
    recommendation: str
    reasoning: str
    memory_context: str
    without_memory_recommendation: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_incident_id() -> str:
    """Generate a unique incident ID based on timestamp."""
    return f"INC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"


def _format_incident_for_memory(incident: dict) -> str:
    """Format an incident dict into a rich text string for Hindsight retention."""
    lines = [
        f"INCIDENT: {incident.get('title', 'Unknown')}",
        f"ID: {incident.get('id', 'N/A')}",
        f"Service: {incident.get('service', 'N/A')}",
        f"Severity: {incident.get('severity', 'N/A')}",
        f"Description: {incident.get('description', '')}",
    ]
    if incident.get("root_cause"):
        lines.append(f"Root Cause: {incident['root_cause']}")
    if incident.get("resolution"):
        lines.append(f"Resolution Applied: {incident['resolution']}")
    if incident.get("outcome"):
        lines.append(f"Outcome: {incident['outcome']}")
    if incident.get("duration_minutes"):
        lines.append(f"Time to Resolve: {incident['duration_minutes']} minutes")
    if incident.get("tags"):
        lines.append(f"Tags: {', '.join(incident['tags'])}")
    return "\n".join(lines)


def _call_groq(system: str, user: str, max_retries: int = 3) -> str:
    """Call Groq LLM and return the text content with graceful rate limit and error handling."""
    delay = 2.0
    for attempt in range(max_retries):
        try:
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.3,
                max_tokens=1500,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            err_str = str(e).lower()
            if ("429" in err_str or "rate" in err_str or "limit" in err_str) and attempt < max_retries - 1:
                logger.warning(f"Groq rate limit encountered, retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                delay *= 2
            elif attempt < max_retries - 1:
                logger.warning(f"Groq API error ({e}), retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                delay *= 2
            else:
                logger.error(f"Groq API call failed after {max_retries} attempts: {e}")
                raise e


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "memoryops-api"}


@app.get("/api/memory/status")
def memory_status():
    """Check Hindsight memory bank status and count stored memories."""
    try:
        # Try a recall to verify connection
        results = hindsight.recall(bank_id=HINDSIGHT_BANK_ID, query="incident")
        count = len(results.results) if hasattr(results, "results") else 0
        return {
            "connected": True,
            "bank_id": HINDSIGHT_BANK_ID,
            "memories_found": count,
            "base_url": HINDSIGHT_BASE_URL,
        }
    except Exception as e:
        logger.warning(f"Hindsight memory status check failed: {e}")
        return {
            "connected": False,
            "bank_id": HINDSIGHT_BANK_ID,
            "memories_found": 0,
            "base_url": HINDSIGHT_BASE_URL,
            "error": str(e),
        }


@app.post("/api/memory/seed")
def seed_memory():
    """
    Load sample incidents from JSON and store them in Hindsight.
    This populates the memory bank for the demo.
    """
    data_path = Path(__file__).parent / "data" / "sample_incidents.json"
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="Sample incidents file not found")

    with open(data_path) as f:
        incidents = json.load(f)

    seeded = 0
    errors = []
    for incident in incidents:
        try:
            content = _format_incident_for_memory(incident)
            hindsight.retain(bank_id=HINDSIGHT_BANK_ID, content=content)
            seeded += 1
            logger.info(f"Seeded incident {incident.get('id', '?')} into Hindsight")
        except Exception as e:
            err_msg = f"Failed to seed {incident.get('id', '?')}: {e}"
            logger.error(err_msg)
            errors.append(err_msg)

    return {
        "seeded": seeded,
        "total": len(incidents),
        "errors": errors,
        "message": f"Successfully stored {seeded}/{len(incidents)} incidents in Hindsight memory",
    }


@app.post("/api/incidents/analyze", response_model=AnalysisResponse)
def analyze_incident(incident: IncidentInput):
    """
    Core analysis endpoint:
    1. Generates a generic (no-memory) recommendation via Groq
    2. Runs Hindsight RECALL to find relevant past incidents
    3. Runs Hindsight REFLECT to synthesize memory context
    4. Generates an informed recommendation using both current incident + memory
    """
    incident_id = _generate_incident_id()
    query = f"{incident.title} {incident.description} service:{incident.service}"

    # ── Step 1: Without-memory baseline recommendation ──────────────────────
    without_memory_rec = _call_groq(
        system=(
            "You are a generic incident response assistant with NO historical context. "
            "Provide a brief, generic troubleshooting recommendation based only on the "
            "incident description. Keep it to 2-3 sentences. Be generic."
        ),
        user=f"Incident: {incident.title}\nSeverity: {incident.severity}\nService: {incident.service}\nDescription: {incident.description}",
    )

    # ── Step 2: Hindsight RECALL – retrieve relevant memories ───────────────
    similar_incidents = []
    successful_approaches = []
    failed_approaches = []
    memory_context = "No historical memories found."
    memories_found = 0

    try:
        recall_results = hindsight.recall(bank_id=HINDSIGHT_BANK_ID, query=query)
        raw_results = recall_results.results if hasattr(recall_results, "results") else []
        memories_found = len(raw_results)
        logger.info(f"Hindsight RECALL returned {memories_found} memories for incident {incident_id}")

        for r in raw_results:
            text = r.text if hasattr(r, "text") else str(r)
            # Parse structured info from stored memory text
            lines = {
                line.split(":", 1)[0].strip(): line.split(":", 1)[1].strip()
                for line in text.split("\n")
                if ":" in line
            }
            res_text = lines.get("Resolution Applied") or lines.get("resolution") or text
            entry = {
                "id": lines.get("ID", "N/A"),
                "title": lines.get("INCIDENT", lines.get("Title", "Historical Incident")),
                "service": lines.get("Service", "N/A"),
                "severity": lines.get("Severity", "N/A"),
                "resolution": res_text,
                "outcome": lines.get("Outcome", "SUCCESS"),
                "root_cause": lines.get("Root Cause", ""),
                "raw": text,
            }
            similar_incidents.append(entry)
            outcome = lines.get("Outcome", "SUCCESS").upper()
            if outcome == "SUCCESS":
                successful_approaches.append({
                    "incident": entry["title"],
                    "resolution": entry["resolution"],
                    "root_cause": entry["root_cause"],
                })
            elif outcome in ("FAILED", "PARTIAL"):
                failed_approaches.append({
                    "incident": entry["title"],
                    "what_failed": entry["resolution"],
                    "outcome": outcome,
                })

    except Exception as e:
        logger.warning(f"Hindsight RECALL failed: {e}")
        memories_found = 0

    # ── Step 3: Hindsight REFLECT – synthesized memory narrative ────────────
    try:
        reflect_result = hindsight.reflect(bank_id=HINDSIGHT_BANK_ID, query=query)
        if hasattr(reflect_result, "text") and reflect_result.text:
            memory_context = reflect_result.text
        logger.info(f"Hindsight REFLECT completed for incident {incident_id}")
    except Exception as e:
        logger.warning(f"Hindsight REFLECT failed: {e}")
        if similar_incidents:
            memory_context = f"Found {len(similar_incidents)} similar past incidents in memory."

    # ── Step 4: Groq – memory-informed recommendation (combined in 1 call) ─
    if memories_found > 0:
        memory_summary_parts = []
        for i, si in enumerate(similar_incidents[:4], 1):
            memory_summary_parts.append(
                f"{i}. [{si['outcome']}] {si['title']}: {si['resolution']}"
            )
        memory_summary = "\n".join(memory_summary_parts)

        system_prompt = (
            "You are an expert Site Reliability Engineer with access to historical incident memory. "
            "Your job is to recommend a resolution for the current incident based on both the "
            "incident details AND the historical memory context. "
            "Be specific, actionable, and reference the historical patterns you see. "
            "Call out which past resolutions worked and which did not.\n\n"
            "Format your response EXACTLY as follows:\n"
            "RECOMMENDATION:\n"
            "BASED ON HISTORICAL MEMORY:\n"
            "<your detailed recommendation>\n\n"
            "REASONING:\n"
            "<2-3 sentences explaining WHY this recommendation is based on historical memory and which past incidents influenced it>"
        )
        user_prompt = (
            f"CURRENT INCIDENT:\n"
            f"Title: {incident.title}\n"
            f"Severity: {incident.severity}\n"
            f"Service: {incident.service}\n"
            f"Description: {incident.description}\n\n"
            f"HISTORICAL MEMORY (from {memories_found} similar past incidents):\n"
            f"{memory_summary}\n\n"
            f"SYNTHESIZED MEMORY CONTEXT:\n{memory_context}\n\n"
            f"Based on this historical context, provide the recommendation and reasoning."
        )
        combined_resp = _call_groq(system_prompt, user_prompt)

        if "REASONING:" in combined_resp:
            parts = combined_resp.split("REASONING:", 1)
            rec_part = parts[0].strip()
            if rec_part.startswith("RECOMMENDATION:"):
                rec_part = rec_part[len("RECOMMENDATION:"):].strip()
            recommendation = rec_part
            reasoning = parts[1].strip()
        else:
            recommendation = combined_resp.strip()
            reasoning = (
                f"Recommendation formulated based on {memories_found} recalled incident patterns from Hindsight memory."
            )
    else:
        # No memory – fallback to generic but acknowledge the gap
        recommendation = (
            "⚠️ NO HISTORICAL MEMORY AVAILABLE – Generic recommendation only.\n\n"
            + without_memory_rec
        )
        reasoning = (
            "No historical incidents found in the Hindsight memory bank. "
            "This recommendation is generic and not based on your team's past experience. "
            "After resolving this incident, save it to memory to improve future recommendations."
        )

    return AnalysisResponse(
        incident_id=incident_id,
        memories_found=memories_found,
        similar_incidents=similar_incidents,
        successful_approaches=successful_approaches,
        failed_approaches=failed_approaches,
        recommendation=recommendation,
        reasoning=reasoning,
        memory_context=memory_context,
        without_memory_recommendation=without_memory_rec,
    )


@app.post("/api/incidents/resolve")
def save_resolution(resolution: ResolutionInput):
    """
    Hindsight RETAIN: Store the resolved incident (with resolution + outcome)
    into the memory bank for future recall.
    """
    incident_dict = {
        "id": resolution.incident_id,
        "title": resolution.title,
        "description": resolution.description,
        "severity": resolution.severity,
        "service": resolution.service,
        "resolution": resolution.resolution,
        "outcome": resolution.outcome,
        "root_cause": resolution.root_cause or "",
        "timestamp": datetime.utcnow().isoformat(),
    }

    content = _format_incident_for_memory(incident_dict)

    try:
        hindsight.retain(bank_id=HINDSIGHT_BANK_ID, content=content)
        logger.info(f"Retained incident {resolution.incident_id} in Hindsight memory")
        return {
            "success": True,
            "message": f"Incident {resolution.incident_id} saved to Hindsight memory",
            "incident_id": resolution.incident_id,
            "bank_id": HINDSIGHT_BANK_ID,
            "content_preview": content[:200] + "...",
        }
    except Exception as e:
        logger.error(f"Failed to retain incident in Hindsight: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save to Hindsight memory: {str(e)}",
        )
