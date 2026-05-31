"""Match endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_admin, get_db
from ..models import Match, User

router = APIRouter(prefix="/matches", tags=["matches"])


def _serialise(m: Match) -> dict:
    return {
        "match_uid": m.match_uid,
        "stage": m.stage,
        "home_team": m.home_team,
        "away_team": m.away_team,
        "start_time": m.start_time,
        "group": m.group_name,
        "tournament_id": m.tournament_id,
        "home_score": m.home_score,
        "away_score": m.away_score,
        "admin_home_score": m.admin_home_score,
        "admin_away_score": m.admin_away_score,
        "effective_home_score": m.effective_home_score,
        "effective_away_score": m.effective_away_score,
    }


@router.get("")
def list_matches(
    tournament_id: Optional[int] = Query(None),
    stage: Optional[str] = Query(None),
    group: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Match)
    if tournament_id is not None:
        q = q.filter(Match.tournament_id == tournament_id)
    if stage:
        q = q.filter(Match.stage == stage)
    if group:
        q = q.filter(Match.group_name == group)
    return [_serialise(m) for m in q.all()]


class MatchOverride(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None


@router.post("/{match_uid}/override")
def override_match(
    match_uid: str,
    payload: MatchOverride,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    m = db.query(Match).filter(Match.match_uid == match_uid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    if payload.home_score is not None:
        m.admin_home_score = payload.home_score
    if payload.away_score is not None:
        m.admin_away_score = payload.away_score
    db.commit()
    return _serialise(m)


@router.delete("/{match_uid}/override")
def clear_override(
    match_uid: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    m = db.query(Match).filter(Match.match_uid == match_uid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    m.admin_home_score = None
    m.admin_away_score = None
    db.commit()
    return _serialise(m)
