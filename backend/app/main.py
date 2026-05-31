"""
Scorient Prediction API – main application entry point.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers import auth_router, tournaments, leagues, matches, predictions, admin, export
from .seed import ensure_wc2026_seeded


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    ensure_wc2026_seeded()
    yield


app = FastAPI(title="Scorient Prediction API", lifespan=lifespan)

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(tournaments.router)
app.include_router(leagues.router)
app.include_router(matches.router)
app.include_router(predictions.router)
app.include_router(admin.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok"}

