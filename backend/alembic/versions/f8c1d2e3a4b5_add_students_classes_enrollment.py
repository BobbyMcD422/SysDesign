"""add students classes enrollment

Revision ID: f8c1d2e3a4b5
Revises: bf19160a09cc
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8c1d2e3a4b5"
down_revision: Union[str, Sequence[str], None] = "bf19160a09cc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("fname", sa.String(length=255), nullable=False),
        sa.Column("lname", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("student_id"),
    )
    op.create_index(op.f("ix_students_email"), "students", ["email"], unique=True)
    op.create_index(op.f("ix_students_student_id"), "students", ["student_id"], unique=False)

    op.create_table(
        "classes",
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("term", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("class_id"),
    )
    op.create_index(op.f("ix_classes_class_id"), "classes", ["class_id"], unique=False)

    op.create_table(
        "instructs",
        sa.Column("instructor_id", sa.Integer(), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.class_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["instructor_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("instructor_id", "class_id"),
    )

    op.create_table(
        "enrollment",
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.class_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.student_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("class_id", "student_id"),
    )


def downgrade() -> None:
    op.drop_table("enrollment")
    op.drop_table("instructs")
    op.drop_index(op.f("ix_classes_class_id"), table_name="classes")
    op.drop_table("classes")
    op.drop_index(op.f("ix_students_student_id"), table_name="students")
    op.drop_index(op.f("ix_students_email"), table_name="students")
    op.drop_table("students")
