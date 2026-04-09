"""
Tests for AI Resume Builder.
Run with:  pytest tests/test_app.py -v
"""

import json
import pytest

# conftest.py has already patched pymongo.MongoClient with mongomock
from app import compute_ats_score, compute_template_scores, ATS_DOMAINS
import app as flask_app


# ---------------------------------------------------------------------------
# Unit tests: compute_ats_score (pure function, no DB/Groq needed)
# ---------------------------------------------------------------------------

class TestComputeAtsScore:
    """Tests for the local ATS scoring helper."""

    def test_empty_resume_returns_score(self):
        result = compute_ats_score({})
        assert "score" in result
        assert isinstance(result["score"], int)
        assert 0 <= result["score"] <= 100

    def test_full_resume_scores_higher_than_empty(self):
        empty  = compute_ats_score({})
        filled = compute_ats_score({
            "summary":    "Experienced Python developer building REST APIs",
            "skills":     ["python", "docker", "kubernetes", "sql", "git", "aws", "react", "node"],
            "experience": [{"title": "Engineer", "company": "ACME",
                            "description": "built microservices with docker and kubernetes"}],
            "education":  [{"degree": "B.S. CS"}],
            "github":     "https://github.com/demo",
        })
        assert filled["score"] > empty["score"]

    def test_score_capped_at_100(self):
        keywords = list(ATS_DOMAINS["Software Engineering"])
        result = compute_ats_score({
            "summary":    " ".join(keywords),
            "skills":     keywords + ["extra1", "extra2"],
            "experience": [{"title": "x", "description": " ".join(keywords)}],
            "education":  [{"degree": "B.S."}],
            "github":     "https://github.com/x",
            "linkedin":   "https://linkedin.com/in/x",
        })
        assert result["score"] <= 100

    def test_domain_selection_respected(self):
        """Marketing domain keywords must be used when domain='Marketing'."""
        marketing_skills = ["seo", "sem", "ppc", "content marketing", "hubspot"]
        result = compute_ats_score(
            {"skills": marketing_skills},
            domain="Marketing",
        )
        assert result["domain"] == "Marketing"
        assert any(kw in result["matched_keywords"] for kw in marketing_skills)

    def test_unknown_domain_falls_back_gracefully(self):
        result = compute_ats_score({}, domain="Nonexistent Domain")
        assert result["domain"] == "Nonexistent Domain"
        assert "score" in result

    def test_result_structure(self):
        result = compute_ats_score({"skills": ["python"]})
        for key in ("score", "domain", "matched_keywords", "missing_keywords", "breakdown"):
            assert key in result
        for key in ("keyword_score", "bonus_score"):
            assert key in result["breakdown"]

    def test_bonus_for_summary(self):
        without      = compute_ats_score({})
        with_summary = compute_ats_score({"summary": "Experienced developer"})
        assert with_summary["breakdown"]["bonus_score"] > without["breakdown"]["bonus_score"]

    def test_bonus_for_five_skills(self):
        without     = compute_ats_score({})
        with_skills = compute_ats_score({"skills": ["a", "b", "c", "d", "e"]})
        assert with_skills["breakdown"]["bonus_score"] > without["breakdown"]["bonus_score"]


# ---------------------------------------------------------------------------
# Unit tests: compute_template_scores
# ---------------------------------------------------------------------------

class TestComputeTemplateScores:
    def test_returns_all_templates(self):
        scores = compute_template_scores({})
        for tpl in ["Google", "Microsoft", "Meta", "Oracle"]:
            assert tpl in scores

    def test_scores_in_range(self):
        scores = compute_template_scores({
            "skills": ["python"] * 10,
            "experience": [{}] * 3,
            "education":  [{}] * 2,
        })
        for v in scores.values():
            assert isinstance(v, int)
            assert 0 <= v <= 100

    def test_empty_resume_all_zeros(self):
        scores = compute_template_scores({})
        for v in scores.values():
            assert v == 0


# ---------------------------------------------------------------------------
# Flask integration tests (mongomock already active via conftest)
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """Return a logged-in Flask test client."""
    flask_app.app.config["TESTING"] = True
    flask_app.app.secret_key = "test-secret"
    with flask_app.app.test_client() as c:
        with c.session_transaction() as sess:
            sess["user_id"]    = "507f1f77bcf86cd799439011"
            sess["user_name"]  = "Test User"
            sess["user_email"] = "test@example.com"
        yield c


class TestATSScoreRoute:
    """Tests for /api/ats-score endpoint."""

    def test_returns_score(self, client):
        resp = client.post(
            "/api/ats-score",
            data=json.dumps({"skills": ["python", "docker"]}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "score" in data
        assert 0 <= data["score"] <= 100

    def test_respects_ats_domain_field(self, client):
        """Frontend sends 'ats_domain'; backend must use it (not legacy 'domain')."""
        resp = client.post(
            "/api/ats-score",
            data=json.dumps({
                "ats_domain": "Marketing",
                "skills":     ["seo", "sem", "ppc"],
            }),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["domain"] == "Marketing"

    def test_legacy_domain_key_still_works(self, client):
        resp = client.post(
            "/api/ats-score",
            data=json.dumps({"domain": "DevOps", "skills": ["docker"]}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.get_json()["domain"] == "DevOps"

    def test_template_scores_included(self, client):
        resp = client.post("/api/ats-score", data=json.dumps({}),
                           content_type="application/json")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "template_scores" in data
        for tpl in ["Google", "Microsoft", "Meta", "Oracle"]:
            assert tpl in data["template_scores"]

    def test_requires_login(self):
        flask_app.app.config["TESTING"] = True
        with flask_app.app.test_client() as anon:
            resp = anon.post("/api/ats-score", data=json.dumps({}),
                             content_type="application/json")
        assert resp.status_code == 401


class TestResumeAPIRoutes:
    def test_create_resume(self, client):
        resp = client.post(
            "/api/resume",
            data=json.dumps({"title": "My Resume", "skills": ["python"]}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert "resume_id" in data

    def test_list_resumes(self, client):
        resp = client.get("/api/resumes")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)


class TestPageRoutes:
    def test_builder_new_page(self, client):
        resp = client.get("/resume/new")
        assert resp.status_code == 200

    def test_dashboard_page(self, client):
        resp = client.get("/dashboard")
        assert resp.status_code == 200
