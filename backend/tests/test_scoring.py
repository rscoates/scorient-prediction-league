"""Unit tests for the scoring engine."""
import json
import pytest

from app.scoring import (
    match_prediction_points, knockout_advance_points,
    bonus_prediction_points, calculate_user_points, RAG_GREEN, RAG_AMBER, RAG_RED,
)
from app.models import (
    Match, MatchPrediction, KnockoutPrediction, BonusPrediction,
    BonusResult, KnockoutResult, Tournament,
)


# ── match_prediction_points ────────────────────────────────────────────────────

class TestMatchPredictionPoints:
    def test_correct_scoreline_gives_5(self):
        pts, rag = match_prediction_points(2, 1, 2, 1)
        assert pts == 5
        assert rag == RAG_GREEN

    def test_correct_result_gives_3(self):
        pts, rag = match_prediction_points(1, 0, 3, 1)
        assert pts == 3
        assert rag == RAG_AMBER

    def test_correct_draw_result(self):
        pts, rag = match_prediction_points(1, 1, 0, 0)
        assert pts == 3
        assert rag == RAG_AMBER

    def test_wrong_result_gives_0(self):
        pts, rag = match_prediction_points(2, 0, 1, 2)
        assert pts == 0
        assert rag == RAG_RED

    def test_no_actual_score_gives_0_no_rag(self):
        pts, rag = match_prediction_points(1, 0, None, None)
        assert pts == 0
        assert rag is None

    def test_no_prediction_gives_0_red(self):
        pts, rag = match_prediction_points(None, None, 2, 1)
        assert pts == 0
        assert rag == RAG_RED

    def test_exact_0_0_draw(self):
        pts, rag = match_prediction_points(0, 0, 0, 0)
        assert pts == 5
        assert rag == RAG_GREEN


# ── knockout_advance_points ────────────────────────────────────────────────────

class TestKnockoutAdvancePoints:
    def test_all_correct(self):
        teams = ["France", "England", "Brazil"]
        pts = knockout_advance_points(teams, teams, 5)
        assert pts == 15

    def test_partial_correct(self):
        pred = ["France", "England", "Brazil"]
        actual = ["France", "Germany", "Brazil"]
        pts = knockout_advance_points(pred, actual, 5)
        assert pts == 10  # France + Brazil

    def test_case_insensitive(self):
        pts = knockout_advance_points(["france"], ["FRANCE"], 10)
        assert pts == 10

    def test_empty_prediction(self):
        pts = knockout_advance_points([], ["France"], 5)
        assert pts == 0

    def test_none_actual(self):
        pts = knockout_advance_points(["France"], None, 5)
        assert pts == 0


# ── bonus_prediction_points ────────────────────────────────────────────────────

class TestBonusPredictionPoints:
    def _make_pred(self, **kwargs):
        p = BonusPrediction.__new__(BonusPrediction)
        p.top_scorer = kwargs.get("top_scorer")
        p.top_assists = kwargs.get("top_assists")
        p.total_goals = kwargs.get("total_goals")
        p.total_red_cards = kwargs.get("total_red_cards")
        p.final_referee = kwargs.get("final_referee")
        return p

    def _make_result(self, **kwargs):
        r = BonusResult.__new__(BonusResult)
        r.top_scorer = kwargs.get("top_scorer")
        r.top_assists = kwargs.get("top_assists")
        r.total_goals = kwargs.get("total_goals")
        r.total_red_cards = kwargs.get("total_red_cards")
        r.final_referee = kwargs.get("final_referee")
        return r

    def test_all_correct(self):
        pred = self._make_pred(top_scorer="Mbappe", top_assists="Messi",
                               total_goals=150, total_red_cards=5, final_referee="Collina")
        result = self._make_result(top_scorer="Mbappe", top_assists="Messi",
                                   total_goals=150, total_red_cards=5, final_referee="Collina")
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["top_scorer"] == 15
        assert breakdown["top_assists"] == 15
        assert breakdown["total_goals"] == 20
        assert breakdown["total_red_cards"] == 10
        assert breakdown["final_referee"] == 5
        assert breakdown["total"] == 65

    def test_goals_within_5(self):
        pred = self._make_pred(total_goals=150)
        result = self._make_result(total_goals=154)
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["total_goals"] == 10

    def test_goals_outside_5(self):
        pred = self._make_pred(total_goals=150)
        result = self._make_result(total_goals=156)
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["total_goals"] == 0

    def test_red_cards_within_1(self):
        pred = self._make_pred(total_red_cards=5)
        result = self._make_result(total_red_cards=6)
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["total_red_cards"] == 5

    def test_red_cards_outside_1(self):
        pred = self._make_pred(total_red_cards=5)
        result = self._make_result(total_red_cards=7)
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["total_red_cards"] == 0

    def test_case_insensitive_names(self):
        pred = self._make_pred(top_scorer="mbappe")
        result = self._make_result(top_scorer="MBAPPE")
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["top_scorer"] == 15

    def test_nothing_correct(self):
        pred = self._make_pred(top_scorer="A", top_assists="B",
                               total_goals=50, total_red_cards=1, final_referee="X")
        result = self._make_result(top_scorer="C", top_assists="D",
                                   total_goals=200, total_red_cards=10, final_referee="Y")
        breakdown = bonus_prediction_points(pred, result)
        assert breakdown["total"] == 0


# ── calculate_user_points ──────────────────────────────────────────────────────

class TestCalculateUserPoints:
    def test_no_predictions_returns_zero(self, db, regular_user, tournament):
        result = calculate_user_points(regular_user.id, tournament.id, db)
        assert result["total_points"] == 0
        assert result["match_details"] == []

    def test_match_prediction_counted(self, db, regular_user, tournament):
        m = Match(match_uid="m1", tournament_id=tournament.id, stage="Group",
                  home_team="A", away_team="B",
                  home_score=2, away_score=1)
        db.add(m)
        pred = MatchPrediction(user_id=regular_user.id, match_uid="m1",
                               home_score=2, away_score=1)
        db.add(pred)
        db.commit()

        result = calculate_user_points(regular_user.id, tournament.id, db)
        assert result["total_points"] == 5
        assert result["group_match_points"] == 5

    def test_admin_override_takes_precedence(self, db, regular_user, tournament):
        m = Match(match_uid="m2", tournament_id=tournament.id, stage="Group",
                  home_team="A", away_team="B",
                  home_score=2, away_score=1,
                  admin_home_score=1, admin_away_score=0)
        db.add(m)
        pred = MatchPrediction(user_id=regular_user.id, match_uid="m2",
                               home_score=1, away_score=0)
        db.add(pred)
        db.commit()

        result = calculate_user_points(regular_user.id, tournament.id, db)
        assert result["total_points"] == 5  # correct against admin override

    def test_knockout_match_points_separate(self, db, regular_user, tournament):
        m = Match(match_uid="m3", tournament_id=tournament.id, stage="Round of 32",
                  home_team="A", away_team="B",
                  home_score=1, away_score=0)
        db.add(m)
        pred = MatchPrediction(user_id=regular_user.id, match_uid="m3",
                               home_score=2, away_score=0)  # correct result
        db.add(pred)
        db.commit()

        result = calculate_user_points(regular_user.id, tournament.id, db)
        assert result["knockout_match_points"] == 3
        assert result["group_match_points"] == 0
