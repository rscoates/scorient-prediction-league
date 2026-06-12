"""
Seed the database with the WC 2026 tournament and its 6 rounds on first startup.
Also runs the initial ingest of worldcup2026.json if matches table is empty.
"""
import os
import logging

from .db import SessionLocal
from .models import Tournament, Round

logger = logging.getLogger(__name__)

ROUNDS = [
    {"stage": "Group",        "display_name": "Matchday (Group Stage)", "display_order": 0},
    {"stage": "Round of 32",  "display_name": "Round of 32",            "display_order": 1},
    {"stage": "Round of 16",  "display_name": "Round of 16",            "display_order": 2},
    {"stage": "Quarter-Final","display_name": "Quarter-Finals",          "display_order": 3},
    {"stage": "Semi-Final",   "display_name": "Semi-Finals",             "display_order": 4},
    {"stage": "Final",        "display_name": "Final",                   "display_order": 5},
]


def ensure_wc2026_seeded():
    db = SessionLocal()
    try:
        t = db.query(Tournament).filter(Tournament.key == "wc2026").first()
        if not t:
            t = Tournament(key="wc2026", name="World Cup 2026", is_active=1)
            db.add(t)
            db.flush()
            for r in ROUNDS:
                db.add(Round(tournament_id=t.id, **r))
            db.commit()
            logger.info("Seeded WC 2026 tournament and rounds.")

        # Run initial ingest if no matches exist for this tournament
        from .models import Match
        match_count = db.query(Match).filter(Match.tournament_id == t.id).count()
        if match_count == 0:
            json_path = find_worldcup_json()
            if json_path:
                from . import ingest as ingest_module
                n = ingest_module.ingest_file(json_path, tournament_key="wc2026")
                logger.info("Initial ingest: loaded %d matches from %s", n, json_path)
            else:
                logger.warning("worldcup2026.json not found; skipping initial ingest.")
    except Exception as exc:
        logger.error("Seed error: %s", exc)
        db.rollback()
    finally:
        db.close()


def find_worldcup_json() -> str | None:
    candidates = [
        os.path.join(os.getcwd(), "worldcup2026.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "worldcup2026.json"),
        "/data/worldcup2026.json",
    ]
    for p in candidates:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None
