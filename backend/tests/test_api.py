"""
Backend tests for MemoryOps API.

Uses FastAPI's TestClient (via httpx) to test the application
without requiring a live server to be running.
"""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Health Endpoint ─────────────────────────────────────────────────────────

class TestHealthEndpoint:
    """Tests for GET /health"""

    def test_health_returns_200(self):
        """Health endpoint must return HTTP 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_json(self):
        """Health endpoint must return a JSON body."""
        response = client.get("/health")
        data = response.json()
        assert isinstance(data, dict)

    def test_health_status_field(self):
        """Health response must contain status: 'ok'."""
        response = client.get("/health")
        data = response.json()
        assert data.get("status") == "ok"

    def test_health_service_field(self):
        """Health response must identify the service as 'memoryops-api'."""
        response = client.get("/health")
        data = response.json()
        assert data.get("service") == "memoryops-api"

    def test_health_content_type(self):
        """Health endpoint must return application/json content type."""
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")


# ── Input Validation ────────────────────────────────────────────────────────

class TestIncidentInputValidation:
    """Tests for POST /api/incidents/analyze input validation."""

    def test_analyze_requires_title(self):
        """Analyze endpoint must reject requests missing 'title'."""
        response = client.post(
            "/api/incidents/analyze",
            json={"description": "Something broke", "severity": "P1", "service": "api"},
        )
        assert response.status_code == 422

    def test_analyze_requires_description(self):
        """Analyze endpoint must reject requests missing 'description'."""
        response = client.post(
            "/api/incidents/analyze",
            json={"title": "DB down", "severity": "P1", "service": "api"},
        )
        assert response.status_code == 422

    def test_analyze_empty_body_rejected(self):
        """Analyze endpoint must reject an empty body."""
        response = client.post("/api/incidents/analyze", json={})
        assert response.status_code == 422

    def test_analyze_severity_defaults(self):
        """Analyze endpoint should accept requests without optional severity/service."""
        # This will call Groq + Hindsight — skip if not in integration mode.
        # We only validate the request reaches the handler (not a 422).
        # A 500 from a missing env is acceptable here; 422 is not.
        response = client.post(
            "/api/incidents/analyze",
            json={"title": "Test incident", "description": "Test description"},
        )
        # 422 = validation failure (bad), 200/500 = reached handler (ok for unit test)
        assert response.status_code != 422


# ── Resolution Input Validation ─────────────────────────────────────────────

class TestResolutionInputValidation:
    """Tests for POST /api/incidents/resolve input validation."""

    def test_resolve_requires_all_fields(self):
        """Resolve endpoint must reject incomplete payloads."""
        response = client.post(
            "/api/incidents/resolve",
            json={"incident_id": "INC-001"},
        )
        assert response.status_code == 422

    def test_resolve_empty_body_rejected(self):
        """Resolve endpoint must reject an empty body."""
        response = client.post("/api/incidents/resolve", json={})
        assert response.status_code == 422
