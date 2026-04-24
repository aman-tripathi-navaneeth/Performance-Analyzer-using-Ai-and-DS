"""
F-22: Automated Backend Test Suite
Run with: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)


class TestHealthAndStats:
    def test_root_or_docs_accessible(self):
        """Backend is up and running"""
        res = client.get("/docs")
        assert res.status_code == 200

    def test_admin_stats_endpoint(self):
        res = client.get("/api/admin/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_students" in data
        assert "total_faculty" in data
        assert "total_tests" in data


class TestStudentEndpoints:
    def test_student_login_wrong_password(self):
        res = client.post("/api/students/login", json={
            "rollNumber": "NONEXISTENT_ROLL",
            "password": "wrongpass"
        })
        assert res.status_code in [401, 404, 422]

    def test_leaderboard(self):
        res = client.get("/api/students/leaderboard")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_at_risk_students(self):
        res = client.get("/api/performance/at-risk?threshold=100")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_weekly_digest(self):
        res = client.get("/api/performance/weekly-digest")
        assert res.status_code == 200


class TestTeacherEndpoints:
    def test_teacher_login_wrong(self):
        res = client.post("/api/teachers/login", json={
            "username": "NONEXISTENT",
            "password": "wrongpass"
        })
        assert res.status_code in [401, 404, 422]


class TestPlacementEndpoints:
    def test_get_jobs(self):
        res = client.get("/api/jobs")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_placement_stats(self):
        res = client.get("/api/placement/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_students" in data
        assert "placement_rate" in data


class TestAuditLog:
    def test_get_audit_log(self):
        res = client.get("/api/admin/audit-log")
        assert res.status_code == 200
        data = res.json()
        assert "logs" in data
        assert "total" in data


class TestAnnouncements:
    def test_get_announcements(self):
        res = client.get("/api/announcements")
        assert res.status_code == 200
        assert isinstance(res.json(), list)


class TestBranchAnalytics:
    def test_branch_analytics(self):
        res = client.get("/api/admin/branch-analytics")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_cross_section_comparison(self):
        res = client.get("/api/performance/cross-section-comparison?subject=Java&year=2nd+Year&branch=CSE")
        assert res.status_code == 200
        assert isinstance(res.json(), list)
