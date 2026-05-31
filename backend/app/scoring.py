"""
Scoring engine for Scorient Prediction.

Scoring rules:
- Match prediction correct scoreline: 5 pts
- Match prediction correct result (W/D/L): 3 pts
- Knockout advance: r32=5 pts each, r16=5 pts each, qf=10 pts each,
                    sf=15 pts each, final=20 pts each, winner=25 pts
- Bonus: top scorer=15, top assists=15, goals exact=20 (±5=10),
         red cards exact=10 (±1=5), final referee=5
"""
import json
from typing import Optional, List
from sqlalchemy.orm import Session

from .models import (
    Match, MatchPrediction, KnockoutPrediction, BonusPrediction,
    KnockoutResult, BonusResult, User, LeagueMembership,
)

RAG_GREEN = "green"   # correct scoreline
RAG_AMBER = "amber"   # correct result
RAG_RED = "red"       # wrong result


def _result_sign(home: int, away: int) -> int:
    if home > away:
        return 1
    if home < away:
        return -1
    return 0


def match_prediction_points(
    pred_home: Optional[int], pred_away: Optional[int],
    actual_home: Optional[int], actual_away: Optional[int],
) -> tuple[int, Optional[str]]:
    """Return (points, rag_status) for a single match prediction."""
    if actual_home is None or actual_away is None:
        return 0, None
    if pred_home is None or pred_away is None:
        return 0, RAG_RED
    if pred_home == actual_home and pred_away == actual_away:
        return 5, RAG_GREEN
    if _result_sign(pred_home, pred_away) == _result_sign(actual_home, actual_away):
        return 3, RAG_AMBER
    return 0, RAG_RED


def _parse_json_list(s: Optional[str]) -> List[str]:
    if not s:
        return []
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return []


def _normalise(s: str) -> str:
    return s.lower().strip()


def knockout_advance_points(
    pred_teams: Optional[List[str]],
    actual_teams: Optional[List[str]],
    points_per_team: int,
) -> int:
    if not pred_teams or not actual_teams:
        return 0
    actual_set = {_normalise(t) for t in actual_teams}
    return sum(points_per_team for t in pred_teams if _normalise(t) in actual_set)


def bonus_prediction_points(pred: "BonusPrediction", result: "BonusResult") -> dict:
    """Return breakdown dict with per-category points and total."""
    breakdown = {
        "top_scorer": 0,
        "top_assists": 0,
        "total_goals": 0,
        "total_red_cards": 0,
        "final_referee": 0,
    }
    if (pred.top_scorer and result.top_scorer
            and _normalise(pred.top_scorer) == _normalise(result.top_scorer)):
        breakdown["top_scorer"] = 15

    if (pred.top_assists and result.top_assists
            and _normalise(pred.top_assists) == _normalise(result.top_assists)):
        breakdown["top_assists"] = 15

    if pred.total_goals is not None and result.total_goals is not None:
        diff = abs(pred.total_goals - result.total_goals)
        if diff == 0:
            breakdown["total_goals"] = 20
        elif diff <= 5:
            breakdown["total_goals"] = 10

    if pred.total_red_cards is not None and result.total_red_cards is not None:
        diff = abs(pred.total_red_cards - result.total_red_cards)
        if diff == 0:
            breakdown["total_red_cards"] = 10
        elif diff <= 1:
            breakdown["total_red_cards"] = 5

    if (pred.final_referee and result.final_referee
            and _normalise(pred.final_referee) == _normalise(result.final_referee)):
        breakdown["final_referee"] = 5

    breakdown["total"] = sum(breakdown.values())
    return breakdown


def _is_group_stage(stage: Optional[str]) -> bool:
    if not stage:
        return False
    s = stage.lower()
    return "matchday" in s or "group" in s


def calculate_user_points(user_id: int, tournament_id: int, db: Session) -> dict:
    """Calculate all points for a user in a tournament. Returns a full breakdown."""
    # --- Match predictions ---
    preds = db.query(MatchPrediction).filter(MatchPrediction.user_id == user_id).all()
    match_uids = [p.match_uid for p in preds]

    matches_by_uid: dict = {}
    if match_uids:
        for m in db.query(Match).filter(Match.match_uid.in_(match_uids)).all():
            matches_by_uid[m.match_uid] = m

    group_match_pts = 0
    knockout_match_pts = 0
    match_details = []

    for pred in preds:
        m = matches_by_uid.get(pred.match_uid)
        if not m:
            continue
        actual_h = m.admin_home_score if m.admin_home_score is not None else m.home_score
        actual_a = m.admin_away_score if m.admin_away_score is not None else m.away_score
        pts, rag = match_prediction_points(pred.home_score, pred.away_score, actual_h, actual_a)

        if _is_group_stage(m.stage):
            group_match_pts += pts
        else:
            knockout_match_pts += pts

        match_details.append({
            "match_uid": pred.match_uid,
            "stage": m.stage,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "pred_home": pred.home_score,
            "pred_away": pred.away_score,
            "actual_home": actual_h,
            "actual_away": actual_a,
            "points": pts,
            "rag": rag,
        })

    # --- Knockout advance predictions ---
    ko_pred = (
        db.query(KnockoutPrediction)
        .filter(
            KnockoutPrediction.user_id == user_id,
            KnockoutPrediction.tournament_id == tournament_id,
        )
        .first()
    )
    ko_result = (
        db.query(KnockoutResult)
        .filter(KnockoutResult.tournament_id == tournament_id)
        .first()
    )

    ko_advance_pts = 0
    ko_advance_breakdown = {}
    if ko_pred and ko_result:
        r32 = knockout_advance_points(_parse_json_list(ko_pred.r32_teams), _parse_json_list(ko_result.r32_teams), 5)
        r16 = knockout_advance_points(_parse_json_list(ko_pred.r16_teams), _parse_json_list(ko_result.r16_teams), 5)
        qf = knockout_advance_points(_parse_json_list(ko_pred.qf_teams), _parse_json_list(ko_result.qf_teams), 10)
        sf = knockout_advance_points(_parse_json_list(ko_pred.sf_teams), _parse_json_list(ko_result.sf_teams), 15)
        f = knockout_advance_points(_parse_json_list(ko_pred.final_teams), _parse_json_list(ko_result.final_teams), 20)
        w = 0
        if (ko_pred.winner and ko_result.winner
                and _normalise(ko_pred.winner) == _normalise(ko_result.winner)):
            w = 25
        ko_advance_pts = r32 + r16 + qf + sf + f + w
        ko_advance_breakdown = {"r32": r32, "r16": r16, "qf": qf, "sf": sf, "final": f, "winner": w}

    # --- Bonus predictions ---
    bonus_pred = (
        db.query(BonusPrediction)
        .filter(
            BonusPrediction.user_id == user_id,
            BonusPrediction.tournament_id == tournament_id,
        )
        .first()
    )
    bonus_result = (
        db.query(BonusResult)
        .filter(BonusResult.tournament_id == tournament_id)
        .first()
    )

    bonus_pts = 0
    bonus_breakdown = {}
    if bonus_pred and bonus_result:
        bonus_breakdown = bonus_prediction_points(bonus_pred, bonus_result)
        bonus_pts = bonus_breakdown.get("total", 0)

    total = group_match_pts + knockout_match_pts + ko_advance_pts + bonus_pts

    return {
        "user_id": user_id,
        "total_points": total,
        "group_match_points": group_match_pts,
        "knockout_match_points": knockout_match_pts,
        "knockout_advance_points": ko_advance_pts,
        "knockout_advance_breakdown": ko_advance_breakdown,
        "bonus_points": bonus_pts,
        "bonus_breakdown": bonus_breakdown,
        "match_details": match_details,
    }


def calculate_leaderboard(league_id: int, tournament_id: int, db: Session) -> list:
    """Return sorted leaderboard for a league."""
    memberships = db.query(LeagueMembership).filter(LeagueMembership.league_id == league_id).all()
    rows = []
    for membership in memberships:
        pts = calculate_user_points(membership.user_id, tournament_id, db)
        user = db.query(User).filter(User.id == membership.user_id).first()
        rows.append({
            "user_id": membership.user_id,
            "display_name": user.display_name if user else None,
            "email": user.email if user else None,
            "avatar_url": user.avatar_url if user else None,
            "total_points": pts["total_points"],
            "group_match_points": pts["group_match_points"],
            "knockout_match_points": pts["knockout_match_points"],
            "knockout_advance_points": pts["knockout_advance_points"],
            "bonus_points": pts["bonus_points"],
        })
    rows.sort(key=lambda x: x["total_points"], reverse=True)
    for i, row in enumerate(rows):
        row["rank"] = i + 1
    return rows
