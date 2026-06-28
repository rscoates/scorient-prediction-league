"""
Prediction endpoints.

Privacy rules:
- Predictions for a round are PRIVATE until that round's deadline passes.
- After the deadline, all predictions for that round become PUBLIC.
- After the deadline, no changes can be made.
- The Group deadline also locks the pre-tournament knockout/bonus predictions.
"""
import json
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from urllib.parse import unquote

from ..auth import get_current_user, get_db
from ..models import (
    Match, MatchPrediction, KnockoutPrediction, BonusPrediction,
    Round, Tournament, User,
)
from ..scoring import calculate_user_points

router = APIRouter(prefix="/predictions", tags=["predictions"])

# ── helpers ────────────────────────────────────────────────────────────────────


def _get_round_deadline(stage: str, tournament_id: int, db: Session) -> Optional[datetime]:
    r = db.query(Round).filter(Round.tournament_id == tournament_id, Round.stage == stage).first()
    return r.deadline if r else None


def _deadline_passed(deadline: Optional[datetime]) -> bool:
    if deadline is None:
        return False
    return datetime.utcnow() > deadline


def _group_deadline_passed(tournament_id: int, db: Session) -> bool:
    dl = _get_round_deadline("Group", tournament_id, db)
    return _deadline_passed(dl)


def _match_stage_to_round_stage(match_stage: Optional[str]) -> str:
    """Map a match stage string to one of the canonical round stages."""
    if not match_stage:
        return "Group"
    s = match_stage.lower()
    if "matchday" in s or "group" in s:
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
    return "Group"


# ── Match predictions ──────────────────────────────────────────────────────────

class MatchPredictionIn(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None


@router.get("/matches")
def get_my_match_predictions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preds = (
        db.query(MatchPrediction)
        .filter(MatchPrediction.user_id == current_user.id)
        .all()
    )
    return [
        {
            "match_uid": p.match_uid,
            "home_score": p.home_score,
            "away_score": p.away_score,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in preds
    ]


@router.get("/matches/user/{user_id}")
def get_user_match_predictions(
    user_id: int,
    tournament_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get another user's match predictions. Only returns predictions for rounds
    whose deadline has passed (privacy rule). Admins see all.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    preds = (
        db.query(MatchPrediction)
        .filter(MatchPrediction.user_id == user_id)
        .all()
    )

    result = []
    for p in preds:
        m = db.query(Match).filter(Match.match_uid == p.match_uid).first()
        if not m:
            continue
        round_stage = _match_stage_to_round_stage(m.stage)
        deadline = _get_round_deadline(round_stage, tournament_id, db)
        if current_user.is_admin or _deadline_passed(deadline):
            result.append({
                "match_uid": p.match_uid,
                "home_score": p.home_score,
                "away_score": p.away_score,
            })
    return result


@router.put("/matches/{match_uid}")
def save_match_prediction(
    match_uid: str,
    body: MatchPredictionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matchuid = unquote(match_uid.strip())
    m = db.query(Match).filter(Match.match_uid == matchuid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")

    round_stage = _match_stage_to_round_stage(m.stage)
    if m.tournament_id:
        deadline = _get_round_deadline(round_stage, m.tournament_id, db)
        if _deadline_passed(deadline):
            raise HTTPException(status_code=403, detail="Deadline has passed; predictions are locked")

    pred = (
        db.query(MatchPrediction)
        .filter(MatchPrediction.user_id == current_user.id, MatchPrediction.match_uid == match_uid)
        .first()
    )
    if pred:
        pred.home_score = body.home_score
        pred.away_score = body.away_score
        pred.updated_at = datetime.utcnow()
    else:
        pred = MatchPrediction(
            user_id=current_user.id,
            match_uid=match_uid,
            home_score=body.home_score,
            away_score=body.away_score,
        )
        db.add(pred)
    db.commit()
    return {"match_uid": match_uid, "home_score": pred.home_score, "away_score": pred.away_score}


# ── Knockout advance predictions ───────────────────────────────────────────────

class KnockoutPredictionIn(BaseModel):
    r32_teams: Optional[List[str]] = None
    r16_teams: Optional[List[str]] = None
    qf_teams: Optional[List[str]] = None
    sf_teams: Optional[List[str]] = None
    final_teams: Optional[List[str]] = None
    winner: Optional[str] = None


def _ko_pred_to_dict(p: KnockoutPrediction) -> dict:
    def _parse(s):
        return json.loads(s) if s else []
    return {
        "r32_teams": _parse(p.r32_teams),
        "r16_teams": _parse(p.r16_teams),
        "qf_teams": _parse(p.qf_teams),
        "sf_teams": _parse(p.sf_teams),
        "final_teams": _parse(p.final_teams),
        "winner": p.winner,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/knockout/{tournament_key}")
def get_knockout_prediction(
    tournament_key: str,
    target_user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    user_id = target_user_id if target_user_id else current_user.id
    if target_user_id and target_user_id != current_user.id and not current_user.is_admin:
        if not _group_deadline_passed(t.id, db):
            raise HTTPException(status_code=403, detail="Predictions are private until the group stage deadline")

    pred = (
        db.query(KnockoutPrediction)
        .filter(KnockoutPrediction.user_id == user_id, KnockoutPrediction.tournament_id == t.id)
        .first()
    )
    if not pred:
        return {}
    return _ko_pred_to_dict(pred)


@router.put("/knockout/{tournament_key}")
def save_knockout_prediction(
    tournament_key: str,
    body: KnockoutPredictionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    if _group_deadline_passed(t.id, db):
        raise HTTPException(status_code=403, detail="Group stage deadline has passed; knockout predictions are locked")

    pred = (
        db.query(KnockoutPrediction)
        .filter(KnockoutPrediction.user_id == current_user.id, KnockoutPrediction.tournament_id == t.id)
        .first()
    )
    data = {
        "r32_teams": json.dumps(body.r32_teams) if body.r32_teams is not None else None,
        "r16_teams": json.dumps(body.r16_teams) if body.r16_teams is not None else None,
        "qf_teams": json.dumps(body.qf_teams) if body.qf_teams is not None else None,
        "sf_teams": json.dumps(body.sf_teams) if body.sf_teams is not None else None,
        "final_teams": json.dumps(body.final_teams) if body.final_teams is not None else None,
        "winner": body.winner,
        "updated_at": datetime.utcnow(),
    }
    if pred:
        for k, v in data.items():
            if v is not None:
                setattr(pred, k, v)
    else:
        pred = KnockoutPrediction(user_id=current_user.id, tournament_id=t.id, **data)
        db.add(pred)
    db.commit()
    db.refresh(pred)
    return _ko_pred_to_dict(pred)


# ── Bonus predictions ──────────────────────────────────────────────────────────

class BonusPredictionIn(BaseModel):
    top_scorer: Optional[str] = None
    top_assists: Optional[str] = None
    total_goals: Optional[int] = None
    total_red_cards: Optional[int] = None
    final_referee: Optional[str] = None


def _bonus_pred_to_dict(p: BonusPrediction) -> dict:
    return {
        "top_scorer": p.top_scorer,
        "top_assists": p.top_assists,
        "total_goals": p.total_goals,
        "total_red_cards": p.total_red_cards,
        "final_referee": p.final_referee,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/bonus/{tournament_key}")
def get_bonus_prediction(
    tournament_key: str,
    target_user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    user_id = target_user_id if target_user_id else current_user.id
    if target_user_id and target_user_id != current_user.id and not current_user.is_admin:
        if not _group_deadline_passed(t.id, db):
            raise HTTPException(status_code=403, detail="Predictions are private until the group stage deadline")

    pred = (
        db.query(BonusPrediction)
        .filter(BonusPrediction.user_id == user_id, BonusPrediction.tournament_id == t.id)
        .first()
    )
    if not pred:
        return {}
    return _bonus_pred_to_dict(pred)


@router.put("/bonus/{tournament_key}")
def save_bonus_prediction(
    tournament_key: str,
    body: BonusPredictionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    if _group_deadline_passed(t.id, db):
        raise HTTPException(status_code=403, detail="Group stage deadline has passed; bonus predictions are locked")

    pred = (
        db.query(BonusPrediction)
        .filter(BonusPrediction.user_id == current_user.id, BonusPrediction.tournament_id == t.id)
        .first()
    )
    if pred:
        for field in ("top_scorer", "top_assists", "total_goals", "total_red_cards", "final_referee"):
            val = getattr(body, field)
            if val is not None:
                setattr(pred, field, val)
        pred.updated_at = datetime.utcnow()
    else:
        pred = BonusPrediction(
            user_id=current_user.id,
            tournament_id=t.id,
            **body.model_dump(exclude_none=True),
        )
        db.add(pred)
    db.commit()
    db.refresh(pred)
    return _bonus_pred_to_dict(pred)


# ── Points summary ─────────────────────────────────────────────────────────────

@router.get("/score/{tournament_key}")
def get_my_score(
    tournament_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = _get_tournament(tournament_key, db)
    return calculate_user_points(current_user.id, t.id, db)


# ── Utility ────────────────────────────────────────────────────────────────────

def _get_tournament(key: str, db: Session) -> Tournament:
    t = db.query(Tournament).filter(Tournament.key == key).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t
