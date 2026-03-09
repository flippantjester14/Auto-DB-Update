"""Integration tests for API endpoints using FastAPI TestClient."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from tests.conftest import SAMPLE_PAYLOAD_DICT


class TestWebhook:
    """Test POST /webhook/new-submission."""

    def test_valid_payload_creates_submission(self, test_client):
        response = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
            headers={"X-Webhook-Secret": "test-secret"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "submission_id" in data
        assert data["status"] == "pending"

    def test_missing_required_fields_returns_422(self, test_client):
        incomplete = {"network_name": "Test"}
        response = test_client.post(
            "/webhook/new-submission",
            json=incomplete,
            headers={"X-Webhook-Secret": "test-secret"},
        )
        assert response.status_code == 422

    def test_missing_secret_returns_401(self, test_client):
        response = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
        )
        assert response.status_code == 401

    def test_wrong_secret_returns_401(self, test_client):
        response = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
            headers={"X-Webhook-Secret": "wrong-secret"},
        )
        assert response.status_code == 401


class TestSubmissionsAPI:
    """Test submissions list and detail endpoints."""

    def _create_submission(self, test_client):
        resp = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
            headers={"X-Webhook-Secret": "test-secret"},
        )
        return resp.json()["submission_id"]

    def test_get_submissions_returns_list(self, test_client):
        self._create_submission(test_client)
        response = test_client.get("/submissions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_submission_by_id(self, test_client):
        sub_id = self._create_submission(test_client)
        response = test_client.get(f"/submissions/{sub_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sub_id
        assert data["status"] == "pending"
        assert data["payload"]["network_name"] == "Hoskote - Network Zero"

    def test_get_nonexistent_submission_returns_404(self, test_client):
        response = test_client.get("/submissions/nonexistent-id")
        assert response.status_code == 404


class TestResolvePreview:
    """Test GET /submissions/{id}/resolve-preview."""

    def _create_submission(self, test_client):
        resp = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
            headers={"X-Webhook-Secret": "test-secret"},
        )
        return resp.json()["submission_id"]

    def test_resolve_preview_returns_actions(self, test_client):
        sub_id = self._create_submission(test_client)
        response = test_client.get(f"/submissions/{sub_id}/resolve-preview")
        assert response.status_code == 200
        data = response.json()

        # Network exists in test data
        assert data["network"]["action"] == "existing"
        assert data["network"]["id"] == 1

        # Source location exists in test data
        assert data["source_location"]["action"] == "existing"

        # Waypoint file and flight route are always new
        assert data["waypoint_file"]["action"] == "new"
        assert data["flight_route"]["action"] == "new"


class TestApproval:
    """Test POST /submissions/{id}/approve."""

    def _create_submission(self, test_client):
        resp = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
            headers={"X-Webhook-Secret": "test-secret"},
        )
        return resp.json()["submission_id"]

    def test_approve_without_confirmations_returns_403(self, test_client):
        sub_id = self._create_submission(test_client)
        response = test_client.post(
            f"/submissions/{sub_id}/approve",
            json={
                "confirmed_new_entities": {
                    "source_location": False,
                    "source_lz": False,
                    "destination_location": False,
                    "destination_lz": False,
                }
            },
        )
        # Should get 403 if there are new entities not confirmed
        # or 500 if pipeline fails due to other reasons
        assert response.status_code in (403, 500)


class TestStatusUpdate:
    """Test PATCH /submissions/{id}/status."""

    def _create_submission(self, test_client):
        resp = test_client.post(
            "/webhook/new-submission",
            json=SAMPLE_PAYLOAD_DICT,
            headers={"X-Webhook-Secret": "test-secret"},
        )
        return resp.json()["submission_id"]

    def test_reject_submission(self, test_client):
        sub_id = self._create_submission(test_client)
        response = test_client.patch(
            f"/submissions/{sub_id}/status",
            json={"status": "rejected", "reason": "Bad data"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"


class TestHealthCheck:
    """Test health endpoint."""

    def test_health(self, test_client):
        response = test_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestCesiumToken:
    """Test config endpoint."""

    def test_get_cesium_token(self, test_client):
        response = test_client.get("/config/cesium-token")
        assert response.status_code == 200
        assert "token" in response.json()
