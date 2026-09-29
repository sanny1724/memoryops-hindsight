# MemoryOps
## AI Incident Response Agent with Persistent Memory

> An AI incident-response agent that uses Hindsight persistent memory to recall past incidents, learn from successful resolutions, and improve recommendations for future incidents.

---

## 🚨 Problem

When production systems fail, on-call engineers need fast, actionable answers. Traditional AI incident-response assistants operate statelessly: they evaluate each incident in complete isolation without remembering previous operational failures, post-mortems, or past triage attempts.

As a result:
- The AI repeatedly suggests the same generic troubleshooting steps that may have already failed in previous outages.
- Institutional engineering knowledge remains scattered across past tickets, chat logs, and runbooks without being leveraged during live incidents.
- Every incident is treated as day one, forcing engineers to manually re-learn hard lessons.

MemoryOps addresses this fundamental gap by integrating **persistent semantic memory** directly into the incident-response loop.

---

## 💡 Solution

MemoryOps gives the incident response agent persistent memory powered by Hindsight:

```text
Incident
   ↓
RECALL
   ↓
Historical Incident Experience
   ↓
REFLECT
   ↓
Memory-informed AI Recommendation
   ↓
Resolution
   ↓
RETAIN
   ↓
Future Incident
```

Memory is not a cosmetic dashboard feature—it is the central intelligence mechanism. By continuously storing resolutions and recalling historical experiences, the AI improves its recommendations as more incidents occur.

---

## 🧠 How Hindsight Powers MemoryOps

MemoryOps uses the official **Hindsight SDK** (`hindsight-client`) connected to a dedicated memory bank: `memoryops-incidents`.

### 🔄 RECALL
When an incident is reported, MemoryOps performs a semantic memory query across past incidents to retrieve relevant historical events, error patterns, and previous fixes.

### 💭 REFLECT
MemoryOps invokes Hindsight reflection to synthesize retrieved memories into a coherent operational narrative, identifying patterns across multiple historical events.

### 💾 RETAIN
Once an engineer resolves an incident, the resolution, root cause, and outcome (`SUCCESS`, `FAILED`, or `PARTIAL`) are committed to Hindsight memory so future triage workflows immediately benefit.

---

## 🔥 Key Features

- **AI-Powered Incident Analysis**: Real-time evaluation of service outages, errors, and severity.
- **Persistent Incident Memory**: Long-term operational retention powered by Hindsight Cloud.
- **Historical Incident Recall**: Automatic semantic retrieval of related past incidents.
- **Memory-Informed Recommendations**: Actionable fixes generated with awareness of previous operational lessons.
- **Generic AI vs. Hindsight Comparison**: Side-by-side view highlighting the exact difference between stateless AI and memory-backed AI.
- **Successful & Failed Resolution Context**: Distinguishes which previous actions worked and which failed.
- **Resolution Retention**: Simple interface to record root causes and resolutions into long-term memory.
- **Incident Activity Timeline**: Real-time logging of RECALL, REFLECT, Groq synthesis, and RETAIN events.
- **Hindsight Memory Bank Visibility**: Live status indicator displaying connection health and stored memory counts.

---

## 🎯 Example Workflow

### Scenario: Payment API Redis Connection Timeout

1. **Current Incident**:
   The `Payment API` returns HTTP 500 errors because Redis connections are timing out during a heavy traffic spike.

2. **Without Memory (Stateless AI)**:
   The generic AI suggests basic troubleshooting: restart the Redis instance, check network latency, and increase general timeout thresholds.

3. **With Hindsight Memory**:
   The agent executes **RECALL** and finds past incidents where increasing pool limits alone failed, but fixing **connection lifecycle management and leakage** permanently resolved the issue. It outputs a targeted recommendation:
   > *"BASED ON HISTORICAL MEMORY: Check Redis connection pool metrics for exhaustion caused by connection leakage in the Payment API lifecycle. Apply the connection pooling and leak mitigation that previously resolved this outage."*

4. **Resolution & Retention**:
   The engineer resolves the incident and submits the fix. MemoryOps calls **RETAIN**, preserving this operational experience for future incidents.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                   React / Vite Frontend                 │
│  - Incident Input & Scenario Selection                 │
│  - Side-by-Side Recommendation Comparison              │
│  - Real-time Memory Activity Timeline                   │
│  - Resolution Submission (RETAIN)                       │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / REST
┌────────────────────────────▼────────────────────────────┐
│                  FastAPI Backend (Python)               │
│                                                         │
│  GET  /health              → Service health check       │
│  GET  /api/memory/status   → Hindsight bank status      │
│  POST /api/memory/seed     → Seed historical incidents  │
│  POST /api/incidents/analyze → RECALL + REFLECT + Groq  │
│  POST /api/incidents/resolve → Hindsight RETAIN         │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────────┐ ┌────────────────────────┐
│     Hindsight Memory Bank    │ │        Groq LLM        │
│    (memoryops-incidents)     │ │   (Configured Model)   │
│  - Semantic Recall           │ │  - Fast Inference      │
│  - Contextual Reflection     │ │  - Memory-Aware Reason │
│  - Incident Retention        │ └────────────────────────┘
└──────────────────────────────┘
```

The application includes sample historical incident data in `backend/data/sample_incidents.json` to seed the memory bank during initial setup.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, JavaScript, CSS (Dark-theme UI with Lucide Icons)
- **Backend**: Python, FastAPI, Uvicorn, Pydantic
- **AI / LLM**: Groq API (model configured via environment configuration)
- **Memory Layer**: Hindsight Cloud / Vectorize Hindsight (`hindsight-client` Python SDK)
- **Version Control & Repository**: Git, GitHub

---

## 📁 Project Structure

```text
memoryops-hindsight/
├── backend/
│   ├── data/
│   │   └── sample_incidents.json   # Sample historical incidents for seeding
│   ├── tests/
│   │   ├── conftest.py             # Pytest configuration
│   │   └── test_api.py             # Health check and input validation tests
│   ├── main.py                     # FastAPI server, endpoints, Groq & Hindsight logic
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Backend environment template
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── api.js                  # Axios API client with error handling
│   │   ├── App.css                 # Component styles
│   │   ├── App.jsx                 # Main incident dashboard
│   │   ├── index.css               # Global theme & layout styles
│   │   └── main.jsx                # React root entry point
│   ├── .env.example                # Frontend environment template
│   ├── .gitignore                  # Frontend ignore rules
│   ├── index.html                  # HTML shell
│   ├── package.json                # Frontend package dependencies
│   └── vite.config.js              # Vite configuration
├── ARCHITECTURE.md                 # System architecture documentation
├── DEVELOPMENT_LOG.md              # Verified development timeline
├── README.md                       # Project overview & documentation
├── .env.example                    # Root environment variable template
└── .gitignore                      # Root Git ignore rules
```

---

## ⚙️ Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sanny1724/memoryops-hindsight.git
cd memoryops-hindsight
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (or `backend/.env`) based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables in your `.env` file (placeholders only):

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=memoryops-incidents
FRONTEND_URL=http://localhost:5173
```

> **Security Note**: Never commit your `.env` file or expose private API keys.

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --host 127.0.0.1 --port 8000
```

Verify backend health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

#### Running Backend Tests

```bash
# From the backend/ directory
python -m pytest tests/ -v
```

Expected output: **11 passed** (health endpoint + input validation tests).

### 4. Frontend Setup

In a separate terminal window:

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🔧 Troubleshooting

### Backend won't start — `ModuleNotFoundError`
Run `pip install -r requirements.txt` from the `backend/` directory. On Python 3.14, `pydantic-core` requires a Rust toolchain — if it fails to build, use Python 3.11 or 3.12 with a pre-built wheel.

### Hindsight returns empty results
Ensure `HINDSIGHT_API_KEY` is set in your `.env`. The SDK does **not** auto-read environment variables — the key must be passed explicitly. After verifying credentials, seed the memory bank via the **Seed Memory** button in the UI.

### Groq returns 404 for a model
The model `llama-3.3-70b-versatile` was deprecated. Use `GROQ_MODEL=qwen/qwen3.8-27b` (the current tested default). If the model is also unavailable, check [console.groq.com](https://console.groq.com) for the current model list.

### Frontend shows "Cannot reach the MemoryOps backend"
Confirm the FastAPI server is running (`uvicorn main:app --host 127.0.0.1 --port 8000` from `backend/`) and that `VITE_API_URL=http://localhost:8000` in `frontend/.env`.

---

## 🔐 Security

- All API keys and secrets are loaded exclusively from local `.env` files.
- `.env`, `*.env`, `.env.txt`, and related secret formats are strictly excluded via `.gitignore`.
- `.env.example` templates contain safe placeholders only.
- Private credentials must never be committed to source control.

---

## 📊 Memory Lifecycle

| Stage | Operation | Purpose |
|---|---|---|
| **RECALL** | `hindsight.recall()` | Retrieve semantically relevant historical incidents and resolutions |
| **REFLECT** | `hindsight.reflect()` | Synthesize retrieved incidents into an actionable operational context |
| **RECOMMEND** | `groq.chat.completions` | Generate a memory-aware incident recommendation |
| **RETAIN** | `hindsight.retain()` | Commit the newly resolved incident and outcome into persistent memory |

---

## 🎥 Demo

### Demo Video
`Coming soon — YouTube demo`

### Repository
[https://github.com/sanny1724/memoryops-hindsight](https://github.com/sanny1724/memoryops-hindsight)

---

## 🚀 Future Improvements

- **Observability Integrations**: Ingest live alerts directly from Datadog, Prometheus, or PagerDuty.
- **Structured Outcome Tracking**: Measure time-to-mitigation and score resolution success rates automatically.
- **Recommendation Quality Evaluation**: Benchmark memory-assisted recommendations against human post-mortem outcomes.
- **Multi-Tenant Deployment**: Team-based role-based access control and isolated memory banks for different engineering organizations.

---

## 👨‍💻 Author

**Banappagari Sannith Reddy**

- **LinkedIn**: [https://www.linkedin.com/in/sannithreddy17/](https://www.linkedin.com/in/sannithreddy17/)
- **GitHub**: [https://github.com/sanny1724/](https://github.com/sanny1724/)
