"""One-time CLI to create the first Admin account.

Usage (from backend/, with the venv active):
    python -m scripts.create_admin --name "Jane Doe" --email admin@college.edu --password "ChangeMe123!"
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, init_db  # noqa: E402
from app.modules.users.models import UserRole  # noqa: E402
from app.modules.users.service import EmailAlreadyRegisteredError, create_user  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        user, _ = create_user(db, args.name, args.email, UserRole.ADMIN, None, args.password)
        user.must_change_password = False
        db.commit()
        print(f"Admin account created: {user.email}")
    except EmailAlreadyRegisteredError as exc:
        print(f"Error: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
