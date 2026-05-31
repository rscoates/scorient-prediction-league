from app.db import init_db, SessionLocal
from app.models import User, Match


def main():
    init_db()
    db = SessionLocal()
    try:
        email = "dev@example.com"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, display_name="Dev User", is_admin=1)
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.is_admin = 1
            db.commit()

        print(f"User: id={user.id} email={user.email} is_admin={user.is_admin}")

        m = db.query(Match).first()
        if not m:
            print("No matches found in DB.")
            return

        print("Before override:", m.match_uid, m.home_score, m.away_score)
        m.home_score = 2
        m.away_score = 1
        db.commit()
        print("After override:", m.match_uid, m.home_score, m.away_score)
    finally:
        db.close()


if __name__ == "__main__":
    main()
