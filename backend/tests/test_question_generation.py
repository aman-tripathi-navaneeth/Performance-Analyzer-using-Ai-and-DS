import os
import sys
from types import SimpleNamespace

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main


client = TestClient(main.app)


def test_get_gemini_model_name_uses_available_supported_model(monkeypatch):
    main._cached_gemini_model_name = None
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("GEMINI_MODEL", raising=False)

    fake_models = [
        SimpleNamespace(
            name="models/gemini-2.0-flash",
            supported_generation_methods=["generateContent"],
        ),
        SimpleNamespace(
            name="models/embedding-001",
            supported_generation_methods=["embedContent"],
        ),
    ]
    monkeypatch.setattr(main.genai, "list_models", lambda: fake_models)

    assert main.get_gemini_model_name() == "models/gemini-2.0-flash"


def test_create_test_allows_manual_json_without_gemini_key(monkeypatch):
    monkeypatch.setattr(main, "GEMINI_API_KEY", "")

    payload = {
        "testName": "Manual JSON Test",
        "subject": "Computer Networks",
        "year": "2nd Year",
        "branch": "CSE",
        "section": "A",
        "numberOfQuestions": 1,
        "startTime": "2026-04-01T10:00:00",
        "endTime": "2026-04-01T11:00:00",
        "createdBy": "faculty1",
        "questions": [
            {
                "question": "What does TCP stand for?",
                "option_a": "Transmission Control Protocol",
                "option_b": "Transfer Channel Process",
                "option_c": "Transport Core Program",
                "option_d": "Terminal Control Path",
                "correct_answer": "Transmission Control Protocol",
            }
        ],
    }

    response = client.post("/api/tests/create", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Test and questions created successfully from JSON"
    assert data["test_id"] > 0
