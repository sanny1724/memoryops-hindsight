# MemoryOps — Demo and Usage Guide

This guide walks through a complete end-to-end usage of MemoryOps using
a realistic incident scenario. Every step described here reflects the
actual application behavior.

---

## Prerequisites

Before running the demo, ensure:

1. The FastAPI backend is running:
   ```bash
   cd backend
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

2. The React frontend is running:
   ```bash
   cd frontend
   npm run dev
   ```

3. The Hindsight memory bank `memoryops-incidents` exists and your
   `HINDSIGHT_API_KEY` is configured in `.env`.

4. Open the UI at [http://localhost:5173](http://localhost:5173).

---

## Part 1 — Seed the Memory Bank

Before the first analysis, the memory bank is empty. Use the **Seed Memory**
button to load historical incident data from `backend/data/sample_incidents.json`
into Hindsight via RETAIN.

What happens:
- The backend reads `sample_incidents.json`
- Each incident is formatted as structured text and passed to
  `hindsight.retain(bank_id="memoryops-incidents", content=...)`
- The Hindsight bank now contains semantic embeddings of past incidents

After seeding, the memory status indicator will show a non-zero memory count.

---

## Part 2 — Analyze a New Incident (with Memory)

### Example Incident

| Field | Value |
|---|---|
| **Title** | Redis cache eviction causing API slowdown |
| **Description** | Redis maxmemory limit hit, aggressive key eviction occurring. Cache hit rate dropped from 90% to 8%. API response times spiked to 6s average. |
| **Severity** | P1 |
| **Service** | caching-layer |

### What the Backend Does

When you click **Analyze Incident**, the backend executes four steps:

#### Step 1 — Without-Memory Baseline (Groq, no context)

Groq is called with only the incident details and no historical data.
It produces a generic recommendation such as:

> *"Check Redis memory usage and eviction policy. Consider increasing the
> maxmemory limit or adjusting the eviction strategy. Restart Redis if
> memory pressure is severe."*

This is what a stateless AI assistant would give you every time.

#### Step 2 — Hindsight RECALL

The backend calls:
```python
hindsight.recall(
    bank_id="memoryops-incidents",
    query="Redis cache eviction causing API slowdown service:caching-layer"
)
```

Hindsight performs a semantic search over stored incidents and returns the
most relevant historical events. For a Redis-related incident, this might
return past incidents involving:
- Redis connection timeouts
- Cache eviction and memory exhaustion
- Pool exhaustion patterns in caching services

Each recalled memory includes structured fields: title, service, severity,
resolution, outcome, and root cause.

#### Step 3 — Hindsight REFLECT

The backend calls:
```python
hindsight.reflect(
    bank_id="memoryops-incidents",
    query="Redis cache eviction causing API slowdown service:caching-layer"
)
```

REFLECT synthesizes the recalled memories into a coherent operational
narrative — for example:

> *"Historical incidents involving Redis memory limits in caching services
> show that increasing maxmemory alone frequently led to reoccurrence.
> The most successful resolutions combined eviction policy tuning (allkeys-lru)
> with cache key TTL enforcement and connection pool review."*

#### Step 4 — Memory-Informed Recommendation (Groq, with context)

Groq is called with the current incident **plus** the RECALL results and
REFLECT narrative. It produces a targeted recommendation:

> *"BASED ON HISTORICAL MEMORY: Based on 6 past incidents, aggressive
> eviction is typically caused by unbounded key growth without TTLs.
> Apply allkeys-lru eviction policy and set explicit TTLs on high-volume
> keys. Review connection pool configuration for leakage — this was the
> root cause in 3 of the historical incidents."*

### Side-by-Side Comparison

The UI shows both recommendations:
- **Without Memory**: Generic Redis troubleshooting advice
- **With Memory**: Specific, pattern-matched guidance referencing past resolutions

This comparison makes the value of persistent memory immediately visible.

---

## Part 3 — Retain the Resolution

After resolving the incident, fill in the **Resolution** panel:

| Field | Example Value |
|---|---|
| **Resolution** | Set `maxmemory-policy allkeys-lru`. Added `EXPIRE 3600` to all session keys. Increased maxmemory from 512MB to 2GB. |
| **Root Cause** | Unbounded session key accumulation with no TTL, combined with undersized maxmemory limit. |
| **Outcome** | SUCCESS |

Click **Save to Memory**. The backend calls:
```python
hindsight.retain(
    bank_id="memoryops-incidents",
    content="""
INCIDENT: Redis cache eviction causing API slowdown
ID: INC-20260929XXXXXX
Service: caching-layer
Severity: P1
Description: Redis maxmemory limit hit...
Root Cause: Unbounded session key accumulation with no TTL...
Resolution Applied: Set allkeys-lru policy, added EXPIRE 3600...
Outcome: SUCCESS
"""
)
```

This incident is now part of the persistent memory bank.

---

## Part 4 — Future Incidents Will Recall This

The next time an engineer reports a Redis-related incident, Hindsight RECALL
will retrieve this newly stored resolution — including the specific fix that
worked. The AI recommendation will reference it directly.

This is the core memory feedback loop:

```
Incident → RECALL past experience → REFLECT into narrative
         → Groq recommendation → Resolution → RETAIN → Future Incidents
```

Each resolved incident makes the next recommendation better.

---

## Activity Timeline

The right panel shows a real-time activity log of every memory operation:

| Icon | Operation | Meaning |
|---|---|---|
| 🔵 | RECALL | Querying Hindsight for relevant past incidents |
| 💭 | REFLECT | Synthesizing memory context |
| 💾 | RETAIN | Storing a new incident into memory |
| ⚠️ | Error | An operation failed (check backend logs) |

---

## API Reference (Quick)

All endpoints are available at `http://localhost:8000`.
Full interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/api/memory/status` | Hindsight bank status + memory count |
| POST | `/api/memory/seed` | Load sample incidents into memory |
| POST | `/api/incidents/analyze` | RECALL + REFLECT + Groq recommendation |
| POST | `/api/incidents/resolve` | RETAIN resolved incident into memory |

### Example: Analyze via curl

```bash
curl -s -X POST http://localhost:8000/api/incidents/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database connection pool exhausted",
    "description": "PostgreSQL refusing new connections. Error: too many clients.",
    "severity": "P1",
    "service": "auth-service"
  }' | python -m json.tool
```
