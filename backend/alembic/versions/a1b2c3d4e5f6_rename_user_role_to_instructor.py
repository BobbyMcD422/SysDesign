"""rename users table and role to instructor

Revision ID: a1b2c3d4e5f6
Revises: f8c1d2e3a4b5
Create Date: 2026-05-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f8c1d2e3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("users", "instructors")
    op.execute("UPDATE instructors SET role = 'instructor' WHERE role = 'user'")


def downgrade() -> None:
    op.execute("UPDATE instructors SET role = 'user' WHERE role = 'instructor'")
    op.rename_table("instructors", "users")
