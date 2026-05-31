"""Shared pytest fixtures."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.main import app
from app.auth import get_db
from app.models import User, Tournament, Round

TEST_DB_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def override_get_db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    u = User(email="admin@test.com", display_name="Admin", is_admin=1)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def regular_user(db):
    u = User(email="user@test.com", display_name="Player", is_admin=0)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def tournament(db):
    t = Tournament(key="test_t", name="Test Tournament", is_active=1)
    db.add(t)
    db.flush()
    for stage, name, order in [
        ("Group", "Matchday (Group Stage)", 0),
        ("Round of 32", "Round of 32", 1),
        ("Round of 16", "Round of 16", 2),
        ("Quarter-Final", "Quarter-Finals", 3),
        ("Semi-Final", "Semi-Finals", 4),
        ("Final", "Final", 5),
    ]:
        db.add(Round(tournament_id=t.id, stage=stage, display_name=name, display_order=order))
    db.commit()
    db.refresh(t)
    return t
