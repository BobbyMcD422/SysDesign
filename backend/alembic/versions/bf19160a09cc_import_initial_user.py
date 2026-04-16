from pathlib import Path
import json
import bcrypt
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union

revision = "bf19160a09cc"
down_revision: str = "59969d740780"
branch_labels = None
depends_on = None


def upgrade() -> None:
    users_table = sa.table(
        "users",
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("fname", sa.String),
        sa.column("lname", sa.String),
        sa.column("role", sa.String),
    )

    seed_path = Path(__file__).resolve().parents[1] / "seeds" / "default_users.json"
    raw_users = json.loads(seed_path.read_text())

    rows = []
    for user in raw_users:
        rows.append(
            {
                "email": user["email"],
                "password_hash": bcrypt.hashpw(
                    user["password"].encode("utf-8"),
                    bcrypt.gensalt(),
                ).decode("utf-8"),
                "fname": user["fname"],
                "lname": user["lname"],
                "role": user["role"],
            }
        )

    if rows:
        op.bulk_insert(users_table, rows)


def downgrade() -> None:
    seed_path = Path(__file__).resolve().parents[1] / "seeds" / "default_users.json"
    raw_users = json.loads(seed_path.read_text())

    emails = [user["email"] for user in raw_users]
    if emails:
        quoted = ", ".join(f"'{email}'" for email in emails)
        op.execute(f"DELETE FROM users WHERE email IN ({quoted})")