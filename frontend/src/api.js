import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

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
