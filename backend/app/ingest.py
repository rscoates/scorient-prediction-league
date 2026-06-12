"""
Data ingest: parse worldcup2026.json (or any compatible file) into the DB.

Field mapping for worldcup2026.json:
  team1/team2  → home_team/away_team
  round        → stage
  date+time    → start_time
  group        → group_name
"""
import json
import os
from urllib import request as urllib_request

from .db import SessionLocal
from .models import Match, Tournament


RESULTS_API_URL = "http://api.football-data.org/v5/competitions/2000/matches"
RESULTS_API_KEY_ENV = "DATA_API_KEY"


# ── stage normalisation ────────────────────────────────────────────────────────

def _normalise_stage(raw_stage: str) -> str:
    """Map raw stage strings to canonical round stage names."""
    s = raw_stage.lower()
    if "matchday" in s:
        return "Group"
    if "32" in s:
        return "Round of 32"
    if "16" in s:
        return "Round of 16"
    if "quarter" in s:
        return "Quarter-Final"
    if "semi" in s:
        return "Semi-Final"
    if "final" in s or "3rd" in s or "third" in s:
        return "Final"
    return raw_stage  # preserve unknown stages as-is


def safe_get_team(m, keys):
    for k in keys:
        v = m.get(k)
        if v:
            if isinstance(v, dict):
                return v.get("country") or v.get("name") or v.get("id")
            return str(v)
    return None


def make_uid(m, idx):
    for k in ("id", "match_id", "matchNumber", "match_number"):
        if k in m:
            return str(m[k])
    home = safe_get_team(m, ["team1", "home_team", "home_team_country", "home", "homeTeam"])
    away = safe_get_team(m, ["team2", "away_team", "away_team_country", "away", "awayTeam"])
    date = m.get("date", "")
    return f"match-{date}-{home}-{away}".replace(" ", "_")


def _results_api_headers() -> dict[str, str]:
    api_key = os.getenv(RESULTS_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(f"{RESULTS_API_KEY_ENV} is not set")
    return {"X-Auth-Token": api_key}


def fetch_results_matches() -> list[dict]:
    req = urllib_request.Request(
        RESULTS_API_URL,
        headers=_results_api_headers(),
        method="GET",
    )
    with urllib_request.urlopen(req, timeout=30) as response:
        data = json.load(response)
    raw_matches = data.get("matches") if isinstance(data, dict) else None
    if not isinstance(raw_matches, list):
        raise ValueError("API response format not recognised: expected {'matches': [...]}.")
    return raw_matches


def refresh_results_from_api(tournament_key: str = "wc2026"):
    raw_matches = fetch_results_matches()
    db = SessionLocal()
    updated = 0
    try:
        tournament = db.query(Tournament).filter(Tournament.key == tournament_key).first()
        tournament_id = tournament.id if tournament else None

        for m in raw_matches:
            match_id = m.get("id")
            if match_id is None:
                continue

            existing = db.query(Match).filter(Match.results_match_id == match_id).first()
            if not existing:
                continue

            home = safe_get_team(m, ["homeTeam"])
            away = safe_get_team(m, ["awayTeam"])
            full_time = (m.get("score") or {}).get("fullTime") or {}
            home_score = full_time.get("home")
            away_score = full_time.get("away")

            existing.home_team = home or existing.home_team
            existing.away_team = away or existing.away_team
            if home_score is not None and existing.admin_home_score is None:
                existing.home_score = int(home_score)
            if away_score is not None and existing.admin_away_score is None:
                existing.away_score = int(away_score)
            existing.raw = json.dumps(m)
            if tournament_id and existing.tournament_id is None:
                existing.tournament_id = tournament_id
            updated += 1

        db.commit()
    finally:
        db.close()
    return updated


def ingest_file(path, tournament_key: str = "wc2026"):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_matches = data.get("matches") if isinstance(data, dict) and "matches" in data else data

    if not isinstance(raw_matches, list):
        raise ValueError("JSON format not recognised: expected a list or {'matches': [...]}")

    db = SessionLocal()
    count = 0
    try:
        # Look up tournament so we can link matches
        tournament = db.query(Tournament).filter(Tournament.key == tournament_key).first()
        tournament_id = tournament.id if tournament else None

        for i, m in enumerate(raw_matches):
            uid = make_uid(m, i)

            home = safe_get_team(m, ["team1", "home_team", "home_team_country", "home", "homeTeam"])
            away = safe_get_team(m, ["team2", "away_team", "away_team_country", "away", "awayTeam"])

            raw_stage = m.get("round") or m.get("stage") or ""
            stage = _normalise_stage(raw_stage) if raw_stage else None

            # Combine date + time into start_time string
            date_str = m.get("date") or m.get("datetime") or m.get("start_time") or m.get("kickoff")
            time_str = m.get("time", "")
            if date_str and time_str:
                start = f"{date_str} {time_str}"
            else:
                start = date_str

            grp = m.get("group") or m.get("group_name") or m.get("groupStage")

            # Scores (may not be present yet)
            hs = m.get("score1") or m.get("home_score") or m.get("homeScore") or m.get("home_team_score")
            ascore = m.get("score2") or m.get("away_score") or m.get("awayScore") or m.get("away_team_score")

            raw_json = json.dumps(m)

            existing = db.query(Match).filter(Match.match_uid == uid).first()
            if existing:
                existing.stage = stage or existing.stage
                existing.home_team = home or existing.home_team
                existing.away_team = away or existing.away_team
                existing.start_time = start or existing.start_time
                existing.group_name = grp or existing.group_name
                # Only update scores if ingest provides them and no admin override is set
                if hs is not None and existing.admin_home_score is None:
                    existing.home_score = int(hs)
                if ascore is not None and existing.admin_away_score is None:
                    existing.away_score = int(ascore)
                existing.raw = raw_json
                if tournament_id and existing.tournament_id is None:
                    existing.tournament_id = tournament_id
            else:
                new = Match(
                    match_uid=uid,
                    tournament_id=tournament_id,
                    stage=stage,
                    home_team=home,
                    away_team=away,
                    start_time=start,
                    group_name=grp,
                    home_score=int(hs) if hs is not None else None,
                    away_score=int(ascore) if ascore is not None else None,
                    raw=raw_json,
                )
                db.add(new)
            count += 1

        db.commit()
    finally:
        db.close()
    return count


if __name__ == "__main__":
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "worldcup2026.json")
    n = ingest_file(p)
    print(f"Ingested {n} matches from {p}")

