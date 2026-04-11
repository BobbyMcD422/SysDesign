from pathlib import Path
import json
import bcrypt
from alembic import op
import sqlalchemy as sa

revision = "521e3a9533ac"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=255), nullable=False),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    users_table = sa.table(
        "users",
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("role", sa.String),
    )

    seed_path = Path(__file__).resolve().parents[1] / "seeds" / "default_users.json"
    raw_users = json.loads(seed_path.read_text())
    print(f"Seed path: {seed_path}")

    rows = []
    for user in raw_users:
        rows.append(
            {
                "email": user["email"],
                "password_hash": bcrypt.hashpw(
                    user["password"].encode("utf-8"),
                    bcrypt.gensalt(),
                ).decode("utf-8"),
                "role": user["role"],
            }
        )

    op.bulk_insert(users_table, rows)

def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
