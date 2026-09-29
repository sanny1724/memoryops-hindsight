import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 s — Groq + Hindsight may be slow under load
});

// ── Response interceptor: surface clear, user-facing error messages ──────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network failure or backend not running
      const msg =
        error.code === 'ECONNABORTED'
          ? 'Request timed out. The backend may be overloaded — please try again.'
          : 'Cannot reach the MemoryOps backend. Make sure the server is running on ' +
            API_URL;
      return Promise.reject(new Error(msg));
    }

    const status = error.response.status;
    const detail = error.response.data?.detail;

    // Map common backend errors to friendly messages
    if (status === 422) {
      return Promise.reject(
        new Error('Invalid input. Please fill in the incident title and description.')
      );
    }
    if (status === 404) {
      return Promise.reject(
        new Error(detail || 'Resource not found on the server.')
      );
    }
    if (status === 500) {
      // Avoid leaking raw tracebacks — provide a helpful summary instead
      if (detail && detail.toLowerCase().includes('hindsight')) {
        return Promise.reject(
          new Error('Hindsight memory service error. Check your HINDSIGHT_API_KEY and bank configuration.')
        );
      }
      if (detail && (detail.toLowerCase().includes('groq') || detail.toLowerCase().includes('llm'))) {
        return Promise.reject(
          new Error('Groq LLM service error. The model may be rate-limited — please wait a moment and retry.')
        );
      }
      return Promise.reject(
        new Error(detail || 'Internal server error. Check the backend logs for details.')
      );
    }

    // Generic fallback
    return Promise.reject(new Error(detail || `Unexpected error (HTTP ${status}).`));
  }
);

export const memoryOpsApi = {
  // Health check
  health: () => api.get('/health'),

  // Memory status
  getMemoryStatus: () => api.get('/api/memory/status'),

  // Seed Hindsight with sample incidents
  seedMemory: () => api.post('/api/memory/seed'),

  // Analyze an incident with Hindsight RECALL + Groq
  analyzeIncident: (incident) =>
    api.post('/api/incidents/analyze', incident),

  // Save resolution to Hindsight RETAIN
  saveResolution: (resolution) =>
    api.post('/api/incidents/resolve', resolution),
};
