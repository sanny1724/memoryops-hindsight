# MemoryOps – Architecture Documentation

## System Overview

MemoryOps demonstrates the value of persistent AI agent memory in the context of production incident response. The architecture is deliberately minimal (MVP) while clearly illustrating the memory feedback loop.

## Data Flow

```
User types incident
       │
       ▼
React Frontend (localhost:5173)
       │ POST /api/incidents/analyze
       ▼
FastAPI Backend (localhost:8000)
       │
       ├──► Step 1: Groq LLM (no context)
       │          → "Without Memory" baseline recommendation
       │
       ├──► Step 2: Hindsight RECALL
       │          query: "{title} {description} service:{service}"
       │          returns: top-N semantically similar past incidents
       │
       ├──► Step 3: Hindsight REFLECT
       │          query: same as above
       │          returns: synthesized narrative from all memories
       │
       └──► Step 4: Groq LLM (with memory context)
                  prompt: incident + recall results + reflect narrative
                  → "With Memory" recommendation
       │
       ▼
Response: { incident_id, memories_found, similar_incidents,
            successful_approaches, failed_approaches,
            recommendation, reasoning, memory_context,
            without_memory_recommendation }
       │
       ▼
User reads side-by-side comparison
User resolves incident
       │
       ▼
User enters resolution + outcome
       │ POST /api/incidents/resolve
       ▼
FastAPI Backend
       │
       └──► Hindsight RETAIN
                  content: formatted incident + resolution + outcome
                  bank_id: "memoryops-incidents"
       │
       ▼
Memory persisted → Future incidents will recall this
```

## Memory Format

Each incident is stored in Hindsight as structured plain text:

```
INCIDENT: Database connection pool exhausted
ID: INC-001
Service: auth-service
Severity: P1
Description: Production PostgreSQL database refusing new connections...
Root Cause: Sudden traffic spike caused connection pool exhaustion...
Resolution Applied: Increased max_connections from 100 to 300...
Outcome: SUCCESS
Time to Resolve: 25 minutes
Tags: database, postgresql, connections, pool
```

This format is designed to:
1. Be human-readable and indexable
2. Allow Hindsight to extract entities (service names, error types, outcomes)
3. Enable semantic matching across similar incidents

## Memory Bank Design

A single bank `memoryops-incidents` is used. In production you might segment:
- By team (platform-incidents, product-incidents)
- By service domain (database, networking, kubernetes)
- By time window (recent-30days, historical)

## API Design Principles

1. **Stateless backend**: The FastAPI backend holds no state. All persistence is in Hindsight.
2. **Graceful degradation**: If Hindsight is unreachable, the agent falls back to generic recommendations without crashing.
3. **Separation of concerns**: Memory operations (RECALL, REFLECT, RETAIN) are cleanly separated from LLM inference.

## Key Design Decisions

### Why Hindsight REFLECT in addition to RECALL?

RECALL returns raw memory snippets. REFLECT synthesizes them into a coherent narrative. For incident response, a synthesized "here's what we know about this class of problem" is more useful than 5 raw text blobs.

### Why format memories as structured text?

Hindsight works well with richly formatted plain text. Structured key-value pairs within the text allow Hindsight's entity-aware retrieval to identify patterns (e.g., "all incidents tagged database with outcome SUCCESS").

### Why not use Hindsight's OBSERVE operation?

OBSERVE is for streaming real-time data. Our use case is discrete incidents stored after resolution. RETAIN is the correct operation.

### Why Groq?

Groq provides very fast LLM inference, making the demo feel responsive. The current configured model is `qwen/qwen3.8-27b`. Note: `llama-3.3-70b-versatile` was deprecated and removed from Groq during development. The architecture is LLM-agnostic — any OpenAI-compatible API would work by changing `GROQ_MODEL` in `.env`.

## Limitations (MVP Scope)

- No authentication (by design)
- Single memory bank (no multi-tenancy)
- In-memory activity log (lost on page refresh)
- No real-time updates (polling not implemented)
- Memory parsing relies on text format (fragile; production would use structured metadata)
- No duplicate detection when seeding

## Production Enhancements

1. **Structured metadata**: Use Hindsight's metadata fields instead of text parsing
2. **Memory bank per team**: Segment by team or service domain
3. **Webhooks**: Auto-retain incidents from PagerDuty / Opsgenie
4. **Feedback loop**: Track which memories led to successful resolutions and weight them higher
5. **Authentication**: JWT or session-based auth
6. **Metrics**: Track memory hit rate, recommendation acceptance rate, MTTR improvement
