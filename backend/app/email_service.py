"""
Email notification service.

Sends deadline reminder emails to league members.
Configure via environment variables:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
  APP_URL  – base URL of the frontend (e.g. https://app.scorient.com)

Call schedule_deadline_reminders() on startup to register jobs.
"""
import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from typing import List

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@scorient.app")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def _send_email(to: str, subject: str, html_body: str) -> bool:
    if not SMTP_HOST or not SMTP_USER:
        logger.warning("Email not configured; skipping send to %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(EMAIL_FROM, [to], msg.as_string())
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_deadline_reminder(
    user_email: str,
    user_name: str,
    league_name: str,
    round_name: str,
    deadline: datetime,
) -> bool:
    subject = f"[Scorient] Predictions deadline approaching – {round_name}"
    deadline_str = deadline.strftime("%A %d %B %Y at %H:%M UTC")
    html = f"""
    <html><body style="font-family: Georgia, serif; color: #1e293b; max-width: 600px; margin: auto; padding: 24px;">
      <h1 style="color: #1e40af;">Scorient</h1>
      <p style="font-style:italic; color:#64748b;">Dignitatem in Proelio</p>
      <hr>
      <p>Hi {user_name or user_email},</p>
      <p>
        The deadline for <strong>{round_name}</strong> predictions in
        <strong>{league_name}</strong> is approaching:
      </p>
      <p style="font-size: 1.25rem; font-weight: bold; color: #1e40af;">{deadline_str}</p>
      <p>
        <a href="{APP_URL}/predictions"
           style="background: #1e40af; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Submit your predictions
        </a>
      </p>
      <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 32px;">
        You are receiving this because you are a member of the {league_name} prediction league.
      </p>
    </body></html>
    """
    return _send_email(user_email, subject, html)


def schedule_deadline_reminders(app):
    """
    Register APScheduler jobs to send reminder emails 24 h before each round deadline.
    Called from main.py lifespan if APScheduler is available.
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler()

        @scheduler.scheduled_job("interval", hours=1, id="check_deadlines")
        def check_and_send_reminders():
            _send_upcoming_reminders()

        scheduler.start()
        logger.info("APScheduler started: deadline reminder job registered.")
        return scheduler
    except ImportError:
        logger.warning("APScheduler not installed; email reminders disabled.")
        return None


def _send_upcoming_reminders():
    """Send 24-hour advance reminder for rounds whose deadline is within the next hour."""
    from .db import SessionLocal
    from .models import Round, LeagueMembership, League, User

    now = datetime.utcnow()
    window_start = now + timedelta(hours=23)
    window_end = now + timedelta(hours=24)

    db = SessionLocal()
    try:
        rounds = (
            db.query(Round)
            .filter(Round.deadline >= window_start, Round.deadline <= window_end)
            .all()
        )
        for r in rounds:
            leagues = db.query(League).filter(League.tournament_id == r.tournament_id).all()
            for league in leagues:
                members = db.query(LeagueMembership).filter(LeagueMembership.league_id == league.id).all()
                for membership in members:
                    user = db.query(User).filter(User.id == membership.user_id).first()
                    if user and user.email:
                        send_deadline_reminder(
                            user.email,
                            user.display_name or "",
                            league.name,
                            r.display_name,
                            r.deadline,
                        )
    finally:
        db.close()
