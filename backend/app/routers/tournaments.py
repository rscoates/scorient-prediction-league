"""Tournament and Round (deadline) endpoints."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_admin, get_db
from ..models import Tournament, Round, User

router = APIRouter(prefix="/tournaments", tags=["tournaments"])

ROUNDS_SEED = [
    {"stage": "Group", "display_name": "Matchday (Group Stage)", "display_order": 0},
    {"stage": "Round of 32", "display_name": "Round of 32", "display_order": 1},
    {"stage": "Round of 16", "display_name": "Round of 16", "display_order": 2},
    {"stage": "Quarter-Final", "display_name": "Quarter-Finals", "display_order": 3},
    {"stage": "Semi-Final", "display_name": "Semi-Finals", "display_order": 4},
    {"stage": "Final", "display_name": "Final", "display_order": 5},
]


class TournamentCreate(BaseModel):
    key: str
    name: str


class RoundDeadlineUpdate(BaseModel):
    deadline: Optional[datetime] = None


@router.get("")
def list_tournaments(db: Session = Depends(get_db)):
    rows = db.query(Tournament).all()
    return [{"id": t.id, "key": t.key, "name": t.name, "is_active": t.is_active} for t in rows]


@router.post("", status_code=201)
def create_tournament(
    body: TournamentCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Tournament).filter(Tournament.key == body.key).first():
        raise HTTPException(status_code=409, detail="Tournament key already exists")
    t = Tournament(key=body.key, name=body.name)
    db.add(t)
    db.flush()
    for r in ROUNDS_SEED:
        db.add(Round(tournament_id=t.id, **r))
    db.commit()
    db.refresh(t)
    return {"id": t.id, "key": t.key, "name": t.name}


@router.get("/{key}")
def get_tournament(key: str, db: Session = Depends(get_db)):
    t = db.query(Tournament).filter(Tournament.key == key).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {
        "id": t.id, "key": t.key, "name": t.name, "is_active": t.is_active,
        "rounds": [
            {
                "id": r.id, "stage": r.stage, "display_name": r.display_name,
                "deadline": r.deadline.isoformat() if r.deadline else None,
                "display_order": r.display_order,
            }
            for r in t.rounds
        ],
    }


@router.patch("/{key}/rounds/{round_id}/deadline")
def set_round_deadline(
    key: str,
    round_id: int,
    body: RoundDeadlineUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tournament).filter(Tournament.key == key).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    r = db.query(Round).filter(Round.id == round_id, Round.tournament_id == t.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Round not found")
    r.deadline = body.deadline
    db.commit()
    return {
        "id": r.id, "stage": r.stage, "display_name": r.display_name,
        "deadline": r.deadline.isoformat() if r.deadline else None,
    }
