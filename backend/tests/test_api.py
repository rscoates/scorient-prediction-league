"""Integration tests for the API endpoints."""
import io
import json

from fastapi.testclient import TestClient

from app import ingest as ingest_module
from app.auth import create_access_token, DEV_AUTH_ENABLED
from app.models import User, Tournament, League, LeagueMembership, Match


def _auth_headers(user: User) -> dict:
    token = create_access_token(user.id, user.email, user.is_admin)
    return {"Authorization": f"Bearer {token}"}


# ── /health ────────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── /auth/me ───────────────────────────────────────────────────────────────────

def test_me_returns_user(client, regular_user):
    resp = client.get("/auth/me", headers=_auth_headers(regular_user))
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == regular_user.email


def test_me_unauthenticated(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


# ── /tournaments ───────────────────────────────────────────────────────────────

def test_list_tournaments(client, tournament):
    resp = client.get("/tournaments")
    assert resp.status_code == 200
    keys = [t["key"] for t in resp.json()]
    assert tournament.key in keys


def test_create_tournament_requires_admin(client, regular_user):
    resp = client.post(
        "/tournaments",
        json={"key": "euro2028", "name": "Euro 2028"},
        headers=_auth_headers(regular_user),
    )
    assert resp.status_code == 403


def test_create_tournament_as_admin(client, admin_user):
    resp = client.post(
        "/tournaments",
        json={"key": "euro2028", "name": "Euro 2028"},
        headers=_auth_headers(admin_user),
    )
    assert resp.status_code == 201
    assert resp.json()["key"] == "euro2028"


# ── /leagues ───────────────────────────────────────────────────────────────────

def test_create_and_join_league(client, regular_user, tournament, db):
    # Create
    resp = client.post(
        "/leagues",
        json={"name": "Test League", "tournament_key": tournament.key},
        headers=_auth_headers(regular_user),
    )
    assert resp.status_code == 201
    invite_code = resp.json()["invite_code"]

    # A second user joins
    user2 = User(email="user2@test.com", display_name="Player 2", is_admin=0)
    db.add(user2)
    db.commit()
    db.refresh(user2)

    resp2 = client.post(
        "/leagues/join",
        json={"invite_code": invite_code},
        headers=_auth_headers(user2),
    )
    assert resp2.status_code == 200


def test_join_invalid_invite_code(client, regular_user):
    resp = client.post(
        "/leagues/join",
        json={"invite_code": "bad-code"},
        headers=_auth_headers(regular_user),
    )
    assert resp.status_code == 404


# ── /predictions ───────────────────────────────────────────────────────────────

def test_save_match_prediction(client, regular_user, tournament, db):
    m = Match(match_uid="test-match", tournament_id=tournament.id, stage="Group",
              home_team="France", away_team="England")
    db.add(m)
    db.commit()

    resp = client.put(
        "/predictions/matches/test-match",
        json={"home_score": 2, "away_score": 1},
        headers=_auth_headers(regular_user),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["home_score"] == 2
    assert data["away_score"] == 1


def test_save_match_prediction_locked_after_deadline(client, regular_user, tournament, db):
    from datetime import datetime, timedelta
    from app.models import Round

    m = Match(match_uid="locked-match", tournament_id=tournament.id, stage="Group",
              home_team="A", away_team="B")
    db.add(m)
    # Set deadline in the past
    r = db.query(Round).filter(Round.tournament_id == tournament.id, Round.stage == "Group").first()
    r.deadline = datetime.utcnow() - timedelta(hours=1)
    db.commit()

    resp = client.put(
        "/predictions/matches/locked-match",
        json={"home_score": 1, "away_score": 0},
        headers=_auth_headers(regular_user),
    )
    assert resp.status_code == 403


def test_get_my_predictions(client, regular_user, tournament, db):
    m = Match(match_uid="my-match", tournament_id=tournament.id, stage="Group",
              home_team="A", away_team="B")
    db.add(m)
    db.commit()

    client.put(
        "/predictions/matches/my-match",
        json={"home_score": 0, "away_score": 0},
        headers=_auth_headers(regular_user),
    )

    resp = client.get("/predictions/matches", headers=_auth_headers(regular_user))
    assert resp.status_code == 200
    uids = [p["match_uid"] for p in resp.json()]
    assert "my-match" in uids


# ── /matches ───────────────────────────────────────────────────────────────────

def test_list_matches(client, tournament, db):
    db.add(Match(match_uid="m-list", tournament_id=tournament.id, stage="Group",
                 home_team="A", away_team="B"))
    db.commit()
    resp = client.get(f"/matches?tournament_id={tournament.id}")
    assert resp.status_code == 200
    assert any(m["match_uid"] == "m-list" for m in resp.json())


def test_admin_override_match(client, admin_user, tournament, db):
    db.add(Match(match_uid="override-match", tournament_id=tournament.id, stage="Group",
                 home_team="A", away_team="B"))
    db.commit()

    resp = client.post(
        "/matches/override-match/override",
        json={"home_score": 3, "away_score": 0},
        headers=_auth_headers(admin_user),
    )
    assert resp.status_code == 200
    assert resp.json()["admin_home_score"] == 3


def test_override_requires_admin(client, regular_user, tournament, db):
    db.add(Match(match_uid="override-match2", tournament_id=tournament.id, stage="Group",
                 home_team="A", away_team="B"))
    db.commit()

    resp = client.post(
        "/matches/override-match2/override",
        json={"home_score": 1, "away_score": 0},
        headers=_auth_headers(regular_user),
    )
    assert resp.status_code == 403


# ── /admin ─────────────────────────────────────────────────────────────────────

def test_admin_list_users(client, admin_user, regular_user):
    resp = client.get("/admin/users", headers=_auth_headers(admin_user))
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert regular_user.email in emails


def test_admin_promote_user(client, admin_user, regular_user):
    resp = client.post(
        f"/admin/users/{regular_user.id}/promote",
        headers=_auth_headers(admin_user),
    )
    assert resp.status_code == 200
    assert resp.json()["is_admin"] == 1


def test_admin_ingest_refreshes_by_results_match_id(client, admin_user, tournament, db, monkeypatch):
    db.add(Match(
        match_uid="match-2026-06-11-Mexico-South_Africa",
        results_match_id=537327,
        tournament_id=tournament.id,
        stage="Group",
        home_team="Old Home",
        away_team="Old Away",
    ))
    db.commit()

    class DummyResponse(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    payload = json.dumps({
            "matches": [
                {
                    "id": 537327,
                    "homeTeam": {"name": "Mexico"},
                    "awayTeam": {"name": "South Africa"},
                    "score": {"fullTime": {"home": 2, "away": 0}},
                }
            ]
        }).encode("utf-8")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://api.football-data.org/v5/competitions/2003/matches"
        assert req.headers.get("X-auth-token") == "test-data-key"
        assert timeout == 30
        return DummyResponse(payload)

    monkeypatch.setenv("DATA_API_KEY", "test-data-key")
    monkeypatch.setattr(ingest_module.urllib_request, "urlopen", fake_urlopen)

    resp = client.post("/admin/ingest", headers=_auth_headers(admin_user))

    assert resp.status_code == 200
    assert resp.json() == {"ingested": 1}

    updated = db.query(Match).filter(Match.results_match_id == 537327).first()
    assert updated is not None
    assert updated.home_team == "Mexico"
    assert updated.away_team == "South Africa"
    assert updated.home_score == 2
    assert updated.away_score == 0


# ── leaderboard ────────────────────────────────────────────────────────────────

def test_leaderboard(client, regular_user, tournament, db):
    league = League(name="L", tournament_id=tournament.id,
                    invite_code="abc123", created_by=regular_user.id)
    db.add(league)
    db.flush()
    db.add(LeagueMembership(user_id=regular_user.id, league_id=league.id))
    db.commit()

    resp = client.get(f"/leagues/{league.id}/leaderboard", headers=_auth_headers(regular_user))
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["user_id"] == regular_user.id
    assert rows[0]["rank"] == 1
