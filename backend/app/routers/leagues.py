"""League management endpoints."""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_admin, get_db
from ..models import League, LeagueMembership, Tournament, User
from ..scoring import calculate_leaderboard

router = APIRouter(prefix="/leagues", tags=["leagues"])


class LeagueCreate(BaseModel):
    name: str
    tournament_key: str


class JoinRequest(BaseModel):
    invite_code: str


@router.get("")
def list_my_leagues(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(LeagueMembership).filter(LeagueMembership.user_id == current_user.id).all()
    result = []
    for m in memberships:
        lg = m.league
        result.append({
            "id": lg.id,
            "name": lg.name,
            "invite_code": lg.invite_code,
            "tournament_key": lg.tournament.key if lg.tournament else None,
        })
    return result


@router.post("", status_code=201)
def create_league(
    body: LeagueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(Tournament).filter(Tournament.key == body.tournament_key).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    invite_code = secrets.token_urlsafe(8)
    league = League(
        name=body.name,
        tournament_id=t.id,
        invite_code=invite_code,
        created_by=current_user.id,
    )
    db.add(league)
    db.flush()
    membership = LeagueMembership(user_id=current_user.id, league_id=league.id)
    db.add(membership)
    db.commit()
    db.refresh(league)
    return {"id": league.id, "name": league.name, "invite_code": league.invite_code}


@router.post("/join")
def join_league(
    body: JoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    league = db.query(League).filter(League.invite_code == body.invite_code).first()
    if not league:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    existing = db.query(LeagueMembership).filter(
        LeagueMembership.user_id == current_user.id,
        LeagueMembership.league_id == league.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already a member of this league")
    db.add(LeagueMembership(user_id=current_user.id, league_id=league.id))
    db.commit()
    return {"id": league.id, "name": league.name}


@router.get("/{league_id}")
def get_league(
    league_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    _require_member(current_user.id, league_id, db)
    return {
        "id": league.id,
        "name": league.name,
        "invite_code": league.invite_code,
        "tournament_key": league.tournament.key if league.tournament else None,
    }


@router.get("/{league_id}/members")
def get_members(
    league_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_member(current_user.id, league_id, db)
    memberships = db.query(LeagueMembership).filter(LeagueMembership.league_id == league_id).all()
    return [
        {
            "user_id": m.user_id,
            "display_name": m.user.display_name,
            "email": m.user.email,
            "avatar_url": m.user.avatar_url,
        }
        for m in memberships
    ]


@router.get("/{league_id}/leaderboard")
def leaderboard(
    league_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_member(current_user.id, league_id, db)
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return calculate_leaderboard(league_id, league.tournament_id, db)


def _require_member(user_id: int, league_id: int, db: Session):
    m = db.query(LeagueMembership).filter(
        LeagueMembership.user_id == user_id,
        LeagueMembership.league_id == league_id,
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="Not a member of this league")
