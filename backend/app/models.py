from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Integer, default=1)

    leagues = relationship("League", back_populates="tournament")
    rounds = relationship("Round", back_populates="tournament", order_by="Round.display_order")


class League(Base):
    __tablename__ = "leagues"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournament = relationship("Tournament", back_populates="leagues")
    memberships = relationship("LeagueMembership", back_populates="league")
    creator = relationship("User", foreign_keys=[created_by])


class LeagueMembership(Base):
    __tablename__ = "league_memberships"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    league = relationship("League", back_populates="memberships")
    __table_args__ = (UniqueConstraint("user_id", "league_id", name="uq_membership"),)


class Round(Base):
    __tablename__ = "rounds"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    stage = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=True)
    display_order = Column(Integer, default=0)

    tournament = relationship("Tournament", back_populates="rounds")


class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    match_uid = Column(String, unique=True, index=True, nullable=False)
    results_match_id = Column(Integer, nullable=True)
    stage = Column(String, nullable=True)
    home_team = Column(String, nullable=True)
    away_team = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    group_name = Column(String, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    admin_home_score = Column(Integer, nullable=True)
    admin_away_score = Column(Integer, nullable=True)
    raw = Column(Text, nullable=True)

    @property
    def effective_home_score(self):
        return self.admin_home_score if self.admin_home_score is not None else self.home_score

    @property
    def effective_away_score(self):
        return self.admin_away_score if self.admin_away_score is not None else self.away_score


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_admin = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("LeagueMembership", back_populates="user")


class MatchPrediction(Base):
    __tablename__ = "match_predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_uid = Column(String, ForeignKey("matches.match_uid"), nullable=False)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    __table_args__ = (UniqueConstraint("user_id", "match_uid", name="uq_match_pred"),)


class KnockoutPrediction(Base):
    """Pre-tournament prediction: which teams will advance through each round."""
    __tablename__ = "knockout_predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    r32_teams = Column(Text, nullable=True)    # JSON list of 32 teams
    r16_teams = Column(Text, nullable=True)    # JSON list of 16 teams
    qf_teams = Column(Text, nullable=True)     # JSON list of 8 teams
    sf_teams = Column(Text, nullable=True)     # JSON list of 4 teams
    final_teams = Column(Text, nullable=True)  # JSON list of 2 teams
    winner = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    __table_args__ = (UniqueConstraint("user_id", "tournament_id", name="uq_knockout_pred"),)


class BonusPrediction(Base):
    __tablename__ = "bonus_predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    top_scorer = Column(String, nullable=True)
    top_assists = Column(String, nullable=True)
    total_goals = Column(Integer, nullable=True)
    total_red_cards = Column(Integer, nullable=True)
    final_referee = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    __table_args__ = (UniqueConstraint("user_id", "tournament_id", name="uq_bonus_pred"),)


class BonusResult(Base):
    """Admin-set actual bonus results."""
    __tablename__ = "bonus_results"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), unique=True, nullable=False)
    top_scorer = Column(String, nullable=True)
    top_assists = Column(String, nullable=True)
    total_goals = Column(Integer, nullable=True)
    total_red_cards = Column(Integer, nullable=True)
    final_referee = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnockoutResult(Base):
    """Admin-set actual knockout advancement results."""
    __tablename__ = "knockout_results"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), unique=True, nullable=False)
    r32_teams = Column(Text, nullable=True)
    r16_teams = Column(Text, nullable=True)
    qf_teams = Column(Text, nullable=True)
    sf_teams = Column(Text, nullable=True)
    final_teams = Column(Text, nullable=True)
    winner = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

