"""CSV and JSON data export endpoints."""
import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import League, LeagueMembership, MatchPrediction, Match, User
from ..scoring import calculate_leaderboard
from .leagues import _require_member

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/league/{league_id}/csv")
def export_csv(
    league_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_member(current_user.id, league_id, db)
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    leaderboard = calculate_leaderboard(league_id, league.tournament_id, db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["rank", "display_name", "email", "total_points",
                     "group_match_points", "knockout_match_points",
                     "knockout_advance_points", "bonus_points"])
    for row in leaderboard:
        writer.writerow([
            row["rank"], row["display_name"], row["email"], row["total_points"],
            row["group_match_points"], row["knockout_match_points"],
            row["knockout_advance_points"], row["bonus_points"],
        ])
    output.seek(0)
    filename = f"scorient_{league.name.replace(' ', '_')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/league/{league_id}/json")
def export_json(
    league_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_member(current_user.id, league_id, db)
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    leaderboard = calculate_leaderboard(league_id, league.tournament_id, db)
    filename = f"scorient_{league.name.replace(' ', '_')}.json"
    return JSONResponse(
        content=leaderboard,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
