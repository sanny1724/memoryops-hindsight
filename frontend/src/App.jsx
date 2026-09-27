import { useState, useEffect, useCallback } from 'react';
import {
  Brain, Zap, Database, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Download, ChevronRight, Activity, Layers,
  TrendingUp, TrendingDown, Clock, Server, Play, Save,
  Info, Eye, EyeOff, Cpu, MemoryStick
} from 'lucide-react';
import { memoryOpsApi } from './api';
import './index.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const severityBadge = (s) => {
  const cls = `badge badge-${s?.toLowerCase() || 'p2'}`;
  return <span className={cls}>{s || 'P2'}</span>;
};

const outcomeBadge = (o) => {
  const map = { SUCCESS: 'success', FAILED: 'failed', PARTIAL: 'partial' };
  const cls = `badge badge-${map[o] || 'unknown'}`;
  return <span className={cls}>{o || 'UNKNOWN'}</span>;
};

const SAMPLE_INCIDENTS = [
  {
    title: 'Database connection pool exhausted',
    description:
      'Production PostgreSQL database refusing new connections. Error: "FATAL: sorry, too many clients already". Users cannot log in. Connection count shows 98/100.',
    severity: 'P1',
    service: 'auth-service',
  },
  {
    title: 'Kubernetes pod OOMKilled – API service',
    description:
      'API service pods continuously crashing with OOMKilled status. Pods restart every 3 minutes. The pod memory usage reaches 512Mi before being killed.',
    severity: 'P0',
    service: 'api-service',
  },
  {
    title: 'Redis cache eviction causing API slowdown',
    description:
      'Redis maxmemory limit hit, aggressive key eviction occurring. Cache hit rate dropped from 90% to 8%. API response times spiked to 6s average.',
    severity: 'P1',
    service: 'caching-layer',
  },
];

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Form state
  const [incident, setIncident] = useState({
    title: '',
    description: '',
    severity: 'P1',
    service: '',
  });

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // Resolution state
  const [resolution, setResolution] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [outcome, setOutcome] = useState('SUCCESS');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Memory status
  const [memStatus, setMemStatus] = useState(null);
  const [memChecking, setMemChecking] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  // Activity log
  const [activity, setActivity] = useState([]);

  // View toggle
  const [showComparison, setShowComparison] = useState(true);

  const logActivity = useCallback((msg, op = 'info') => {
    setActivity((prev) => [{ time: now(), msg, op }, ...prev].slice(0, 20));
  }, []);

  // ── Memory Status Check ──
  const checkMemory = useCallback(async () => {
    setMemChecking(true);
    try {
      const res = await memoryOpsApi.getMemoryStatus();
      setMemStatus(res.data);
      logActivity(
        `Memory bank "${res.data.bank_id}" — ${res.data.memories_found} memories`,
        'info'
      );
    } catch (e) {
      setMemStatus({ connected: false, memories_found: 0 });
      logActivity('Failed to connect to Hindsight memory', 'error');
    } finally {
      setMemChecking(false);
    }
  }, [logActivity]);

  useEffect(() => {
    checkMemory();
  }, [checkMemory]);

  // ── Seed Memory ──
  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    logActivity('Seeding Hindsight memory with sample incidents…', 'retain');
    try {
      const res = await memoryOpsApi.seedMemory();
      setSeedMsg(`✅ ${res.data.message}`);
      logActivity(`RETAIN: Stored ${res.data.seeded} incidents in memory`, 'retain');
      await checkMemory();
    } catch (e) {
      setSeedMsg(`❌ ${e.response?.data?.detail || 'Seed failed'}`);
      logActivity('Seed operation failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // ── Analyze Incident ──
  const handleAnalyze = async () => {
    if (!incident.title || !incident.description) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError('');
    setResolution('');
    setRootCause('');
    setSaveMsg('');
    logActivity(`Analyzing incident: "${incident.title}"`, 'recall');
    try {
      logActivity('RECALL: Querying Hindsight memory…', 'recall');
      const res = await memoryOpsApi.analyzeIncident(incident);
      setAnalysisResult(res.data);
      logActivity(
        `RECALL: Found ${res.data.memories_found} relevant memories`,
        'recall'
      );
      logActivity('REFLECT: Memory context synthesized', 'reflect');
      logActivity('Groq LLM generated memory-informed recommendation', 'info');
    } catch (e) {
      setAnalysisError(e.response?.data?.detail || 'Analysis failed. Check backend connection.');
      logActivity('Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Save Resolution ──
  const handleSaveResolution = async () => {
    if (!resolution || !analysisResult) return;
    setSaving(true);
    setSaveMsg('');
    logActivity('RETAIN: Saving incident + resolution to Hindsight…', 'retain');
    try {
      const payload = {
        incident_id: analysisResult.incident_id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        service: incident.service,
        resolution,
        outcome,
        root_cause: rootCause,
      };
      const res = await memoryOpsApi.saveResolution(payload);
      setSaveMsg(`✅ ${res.data.message}`);
      logActivity(`RETAIN: Incident ${res.data.incident_id} saved to memory`, 'retain');
      await checkMemory();
    } catch (e) {
      setSaveMsg(`❌ ${e.response?.data?.detail || 'Save failed'}`);
      logActivity('RETAIN operation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadSample = (s) => setIncident(s);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">🧠</div>
          <div>
            <div>MemoryOps</div>
            <div className="navbar-subtitle">AI Incident Response · Powered by Hindsight</div>
          </div>
        </div>
        <div className="navbar-actions">
          <button className="btn btn-outline btn-sm" onClick={checkMemory} disabled={memChecking}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </nav>

      <div className="main-content">
        {/* Memory Status Bar */}
        <div className="memory-status-bar">
          <div className="memory-indicator">
            <div className={`memory-dot ${memChecking ? 'checking' : memStatus?.connected ? 'connected' : 'disconnected'}`} />
            <span style={{ color: 'var(--text-secondary)' }}>Hindsight Memory</span>
          </div>
          {memStatus && (
            <>
              <div className="memory-indicator">
                <Database size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="memory-status-count">{memStatus.memories_found}</span>
                <span style={{ color: 'var(--text-secondary)' }}>memories stored</span>
              </div>
              <div className="memory-indicator">
                <Layers size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                  {memStatus.bank_id}
                </span>
              </div>
            </>
          )}
          <div className="memory-status-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding ? <><div className="spinner" />Seeding…</> : <><Download size={12} />Seed Memory</>}
            </button>
          </div>
        </div>

        {seedMsg && (
          <div className={`alert ${seedMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
            {seedMsg}
          </div>
        )}

        {/* Demo Banner */}
        <div className="demo-banner">
          <Brain size={16} style={{ color: 'var(--accent-purple-light)', flexShrink: 0 }} />
          <span>
            <strong>Demo:</strong> Click <strong>Seed Memory</strong> first to load historical incidents.
            Then enter a new incident and click <strong>Analyze</strong> to see the difference between
            generic AI recommendations vs. Hindsight memory-informed recommendations.
          </span>
        </div>

        <div className="dashboard-grid">
          {/* Left: Incident Input */}
          <div>
            {/* Quick Scenarios */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div className="header-icon icon-orange"><Zap size={14} /></div>
                <h2>Quick Demo Scenarios</h2>
              </div>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SAMPLE_INCIDENTS.map((s, i) => (
                    <button
                      key={i}
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => loadSample(s)}
                    >
                      <ChevronRight size={12} />
                      <span>{s.title}</span>
                      {severityBadge(s.severity)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Incident Form */}
            <div className="card">
              <div className="card-header">
                <div className="header-icon icon-red"><AlertTriangle size={14} /></div>
                <h2>Current Incident</h2>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Incident Title</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Database connection pool exhausted"
                    value={incident.title}
                    onChange={(e) => setIncident({ ...incident, title: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select
                      className="form-select"
                      value={incident.severity}
                      onChange={(e) => setIncident({ ...incident, severity: e.target.value })}
                    >
                      <option>P0</option>
                      <option>P1</option>
                      <option>P2</option>
                      <option>P3</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Affected Service</label>
                    <input
                      className="form-input"
                      placeholder="e.g. auth-service"
                      value={incident.service}
                      onChange={(e) => setIncident({ ...incident, service: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe the incident in detail — symptoms, error messages, metrics..."
                    value={incident.description}
                    onChange={(e) => setIncident({ ...incident, description: e.target.value })}
                  />
                </div>
                {analysisError && (
                  <div className="alert alert-error">{analysisError}</div>
                )}
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  onClick={handleAnalyze}
                  disabled={analyzing || !incident.title || !incident.description}
                >
                  {analyzing ? (
                    <><div className="spinner" />Analyzing with Hindsight…</>
                  ) : (
                    <><Brain size={16} />Analyze Incident</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Activity + Memory Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Memory Activity */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <div className="header-icon icon-teal"><Activity size={14} /></div>
                <h2>Memory Activity</h2>
              </div>
              <div className="card-body">
                {activity.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📡</div>
                    <p>Waiting for activity…</p>
                  </div>
                ) : (
                  <div className="activity-log">
                    {activity.map((a, i) => (
                      <div key={i} className={`activity-entry op-${a.op}`}>
                        <span className="activity-dot">●</span>
                        <span className="activity-time">{a.time}</span>
                        <span className="activity-msg">{a.msg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Memory Stats */}
            {memStatus && (
              <div className="card">
                <div className="card-header">
                  <div className="header-icon icon-purple"><MemoryStick size={14} /></div>
                  <h2>Hindsight Memory Bank</h2>
                </div>
                <div className="card-body">
                  <div className="stats-row">
                    <div className="stat-chip">
                      <Database size={12} style={{ color: 'var(--accent-blue-light)' }} />
                      <span className="stat-value">{memStatus.memories_found}</span>
                      <span className="stat-label">Memories</span>
                    </div>
                    <div className="stat-chip">
                      <Server size={12} style={{ color: 'var(--text-muted)' }} />
                      <span className="stat-value" style={{ fontSize: 11 }}>{memStatus.bank_id}</span>
                    </div>
                    <div className="stat-chip">
                      <div
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: memStatus.connected ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                        }}
                      />
                      <span className="stat-label">{memStatus.connected ? 'Connected' : 'Offline'}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <div>🔁 <strong style={{ color: 'var(--accent-blue-light)' }}>RECALL</strong> — Semantic search over stored memories</div>
                    <div>🧠 <strong style={{ color: 'var(--accent-purple-light)' }}>REFLECT</strong> — Synthesize memory into a narrative</div>
                    <div>💾 <strong style={{ color: 'var(--accent-green-light)' }}>RETAIN</strong> — Persist new incidents to memory</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Results */}
        {analyzing && (
          <div className="card">
            <div className="loading-overlay">
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Analyzing incident with Hindsight…</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Running RECALL → REFLECT → Groq LLM synthesis
                </div>
              </div>
            </div>
          </div>
        )}

        {analysisResult && !analyzing && (
          <>
            {/* Stats row */}
            <div className="card">
              <div className="card-header">
                <div className="header-icon icon-blue"><Cpu size={14} /></div>
                <h2>Analysis Results</h2>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                  {analysisResult.incident_id}
                </span>
              </div>
              <div className="card-body">
                <div className="stats-row" style={{ marginBottom: 20 }}>
                  <div className="stat-chip">
                    <Brain size={12} style={{ color: 'var(--accent-purple-light)' }} />
                    <span className="stat-value">{analysisResult.memories_found}</span>
                    <span className="stat-label">Memories Recalled</span>
                  </div>
                  <div className="stat-chip">
                    <TrendingUp size={12} style={{ color: 'var(--accent-green-light)' }} />
                    <span className="stat-value">{analysisResult.successful_approaches.length}</span>
                    <span className="stat-label">Successful Approaches</span>
                  </div>
                  <div className="stat-chip">
                    <TrendingDown size={12} style={{ color: 'var(--accent-red-light)' }} />
                    <span className="stat-value">{analysisResult.failed_approaches.length}</span>
                    <span className="stat-label">Failed Approaches</span>
                  </div>
                </div>

                {/* The KEY comparison: Without Memory vs With Memory */}
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Recommendation Comparison
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowComparison(!showComparison)}
                  >
                    {showComparison ? <><EyeOff size={12} />Hide</> : <><Eye size={12} />Show</>}
                  </button>
                </div>
                {showComparison && (
                  <div className="comparison-row">
                    <div className="comparison-box without-memory">
                      <div className="comparison-label no-memory">
                        <EyeOff size={12} /> Without Memory (Generic AI)
                      </div>
                      <div className="recommendation-text dimmed">
                        {analysisResult.without_memory_recommendation}
                      </div>
                    </div>
                    <div className="comparison-box with-memory">
                      <div className="comparison-label with-memory">
                        <Brain size={12} /> With Hindsight Memory
                      </div>
                      <div className="recommendation-text">
                        {analysisResult.recommendation}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {analysisResult.reasoning && (
                  <div className="memory-context-box" style={{ marginBottom: 16 }}>
                    <div className="memory-context-label">
                      <Info size={12} /> Why this recommendation?
                    </div>
                    <div className="memory-context-text">{analysisResult.reasoning}</div>
                  </div>
                )}

                {/* Reflect context */}
                {analysisResult.memory_context && analysisResult.memories_found > 0 && (
                  <div className="memory-context-box">
                    <div className="memory-context-label">
                      <Brain size={12} /> Hindsight REFLECT – Synthesized Memory Context
                    </div>
                    <div className="memory-context-text">{analysisResult.memory_context}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Similar Incidents + Approaches */}
            {analysisResult.memories_found > 0 && (
              <div className="dashboard-grid">
                {/* Similar Incidents */}
                <div className="card">
                  <div className="card-header">
                    <div className="header-icon icon-blue"><Database size={14} /></div>
                    <h2>Similar Historical Incidents</h2>
                    <span className="badge badge-p2" style={{ marginLeft: 8 }}>{analysisResult.similar_incidents.length}</span>
                  </div>
                  <div className="card-body">
                    <div className="memory-list">
                      {analysisResult.similar_incidents.slice(0, 5).map((si, i) => (
                        <div
                          key={i}
                          className={`memory-item ${si.outcome?.toLowerCase() === 'success' ? 'success' : si.outcome?.toLowerCase() === 'partial' ? 'partial' : si.outcome?.toLowerCase() === 'failed' ? 'failed' : 'unknown'}`}
                        >
                          <div className="memory-item-header">
                            <span className="memory-item-title">{si.title}</span>
                            {outcomeBadge(si.outcome)}
                          </div>
                          <div style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="memory-item-service">{si.service}</span>
                            {severityBadge(si.severity)}
                          </div>
                          {si.resolution && si.resolution !== 'N/A' && (
                            <div className="memory-item-resolution">
                              <strong style={{ color: 'var(--text-secondary)' }}>Resolution: </strong>
                              {si.resolution}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Approaches */}
                <div className="card">
                  <div className="card-header">
                    <div className="header-icon icon-green"><TrendingUp size={14} /></div>
                    <h2>Learned Approaches</h2>
                  </div>
                  <div className="card-body">
                    <div className="approaches-grid" style={{ gridTemplateColumns: '1fr' }}>
                      {analysisResult.successful_approaches.length > 0 && (
                        <div>
                          <div className="approach-section-title success">
                            <CheckCircle size={12} /> What Worked
                          </div>
                          {analysisResult.successful_approaches.map((a, i) => (
                            <div key={i} className="approach-item">
                              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                                {a.incident}
                              </strong>
                              {a.resolution}
                            </div>
                          ))}
                        </div>
                      )}
                      {analysisResult.failed_approaches.length > 0 && (
                        <div>
                          <div className="approach-section-title failed">
                            <XCircle size={12} /> What Didn't Work / Partial
                          </div>
                          {analysisResult.failed_approaches.map((a, i) => (
                            <div key={i} className="approach-item">
                              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                                {a.incident}
                              </strong>
                              <span style={{ color: 'var(--accent-orange-light)', fontSize: 11, fontWeight: 700, marginRight: 6 }}>
                                {a.outcome}
                              </span>
                              {a.what_failed}
                            </div>
                          ))}
                        </div>
                      )}
                      {analysisResult.successful_approaches.length === 0 && analysisResult.failed_approaches.length === 0 && (
                        <div className="empty-state">
                          <p>No labeled approach data available in retrieved memories.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resolution Form */}
            <div className="card resolution-section">
              <div className="card-header">
                <div className="header-icon icon-green"><Save size={14} /></div>
                <h2>Save Resolution to Hindsight Memory</h2>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  After resolving the incident, enter the resolution and outcome below.
                  This will be stored in Hindsight via <strong style={{ color: 'var(--accent-green-light)' }}>RETAIN</strong> so future incidents can learn from it.
                </div>
                <div className="form-group">
                  <label className="form-label">Resolution Applied</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe exactly what steps were taken to resolve the incident..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Root Cause (optional)</label>
                  <input
                    className="form-input"
                    placeholder="What was the underlying cause?"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Outcome</label>
                  <div className="outcome-selector">
                    {['SUCCESS', 'PARTIAL', 'FAILED'].map((o) => (
                      <button
                        key={o}
                        className={`outcome-btn ${outcome === o ? `selected-${o.toLowerCase()}` : ''}`}
                        onClick={() => setOutcome(o)}
                      >
                        {o === 'SUCCESS' ? '✅' : o === 'PARTIAL' ? '⚠️' : '❌'} {o}
                      </button>
                    ))}
                  </div>
                </div>
                {saveMsg && (
                  <div className={`alert ${saveMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
                    {saveMsg}
                  </div>
                )}
                <button
                  className="btn btn-success btn-lg"
                  style={{ width: '100%' }}
                  onClick={handleSaveResolution}
                  disabled={saving || !resolution}
                >
                  {saving ? (
                    <><div className="spinner" />Saving to Hindsight…</>
                  ) : (
                    <><Brain size={16} />RETAIN: Save to Hindsight Memory</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
