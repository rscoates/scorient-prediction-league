"""Admin-only endpoints: user management, results input, ingest."""
import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_admin, get_db
from ..models import (
    User, BonusResult, KnockoutResult, Tournament,
)
from ..scoring import calculate_leaderboard
from .. import ingest as ingest_module

router = APIRouter(prefix="/admin", tags=["admin"])

# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id, "email": u.email, "display_name": u.display_name,
            "is_admin": u.is_admin, "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/users/{user_id}/promote")
def promote_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_admin = 1
    db.commit()
    return {"id": u.id, "email": u.email, "is_admin": u.is_admin}


@router.post("/users/{user_id}/demote")
def demote_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_admin = 0
    db.commit()
    return {"id": u.id, "email": u.email, "is_admin": u.is_admin}


# ── Bonus results ──────────────────────────────────────────────────────────────

class BonusResultIn(BaseModel):
    top_scorer: Optional[str] = None
    top_assists: Optional[str] = None
    total_goals: Optional[int] = None
    total_red_cards: Optional[int] = None
    final_referee: Optional[str] = None


@router.get("/results/bonus/{tournament_key}")
def get_bonus_result(
    tournament_key: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    br = db.query(BonusResult).filter(BonusResult.tournament_id == t.id).first()
    if not br:
        return {}
    return {
        "top_scorer": br.top_scorer,
        "top_assists": br.top_assists,
        "total_goals": br.total_goals,
        "total_red_cards": br.total_red_cards,
        "final_referee": br.final_referee,
    }


@router.put("/results/bonus/{tournament_key}")
def set_bonus_result(
    tournament_key: str,
    body: BonusResultIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    br = db.query(BonusResult).filter(BonusResult.tournament_id == t.id).first()
    if br:
        for field in ("top_scorer", "top_assists", "total_goals", "total_red_cards", "final_referee"):
            val = getattr(body, field)
            if val is not None:
                setattr(br, field, val)
    else:
        br = BonusResult(tournament_id=t.id, **body.model_dump(exclude_none=True))
        db.add(br)
    db.commit()
    return {"ok": True}


# ── Knockout results ───────────────────────────────────────────────────────────

class KnockoutResultIn(BaseModel):
    r32_teams: Optional[List[str]] = None
    r16_teams: Optional[List[str]] = None
    qf_teams: Optional[List[str]] = None
    sf_teams: Optional[List[str]] = None
    final_teams: Optional[List[str]] = None
    winner: Optional[str] = None


@router.get("/results/knockout/{tournament_key}")
def get_knockout_result(
    tournament_key: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    kr = db.query(KnockoutResult).filter(KnockoutResult.tournament_id == t.id).first()
    if not kr:
        return {}

    def _p(s):
        return json.loads(s) if s else []

    return {
        "r32_teams": _p(kr.r32_teams),
        "r16_teams": _p(kr.r16_teams),
        "qf_teams": _p(kr.qf_teams),
        "sf_teams": _p(kr.sf_teams),
        "final_teams": _p(kr.final_teams),
        "winner": kr.winner,
    }


@router.put("/results/knockout/{tournament_key}")
def set_knockout_result(
    tournament_key: str,
    body: KnockoutResultIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    kr = db.query(KnockoutResult).filter(KnockoutResult.tournament_id == t.id).first()
    data = {
        "r32_teams": json.dumps(body.r32_teams) if body.r32_teams is not None else None,
        "r16_teams": json.dumps(body.r16_teams) if body.r16_teams is not None else None,
        "qf_teams": json.dumps(body.qf_teams) if body.qf_teams is not None else None,
        "sf_teams": json.dumps(body.sf_teams) if body.sf_teams is not None else None,
        "final_teams": json.dumps(body.final_teams) if body.final_teams is not None else None,
        "winner": body.winner,
    }
    if kr:
        for k, v in data.items():
            if v is not None:
                setattr(kr, k, v)
    else:
        kr = KnockoutResult(tournament_id=t.id, **{k: v for k, v in data.items() if v is not None})
        db.add(kr)
    db.commit()
    return {"ok": True}


# ── Ingest ─────────────────────────────────────────────────────────────────────

@router.post("/ingest")
def run_ingest(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    count = ingest_module.refresh_results_from_api()
    return {"ingested": count}


# ── Utility ────────────────────────────────────────────────────────────────────

def _get_tournament(key: str, db: Session) -> Tournament:
    t = db.query(Tournament).filter(Tournament.key == key).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t
