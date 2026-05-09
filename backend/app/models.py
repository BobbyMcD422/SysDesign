from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    fname: Mapped[str] = mapped_column(String(255))
    lname: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    instructed_classes: Mapped[list["Instructs"]] = relationship(
        back_populates="instructor",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Student(Base):
    __tablename__ = "students"

    student_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fname: Mapped[str] = mapped_column(String(255))
    lname: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ClassGroup(Base):
    __tablename__ = "classes"

    class_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    term: Mapped[str] = mapped_column(String(255))
    instructors: Mapped[list["Instructs"]] = relationship(
        back_populates="class_group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="class_group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Instructs(Base):
    __tablename__ = "instructs"

    instructor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.class_id", ondelete="CASCADE"),
        primary_key=True,
    )
    instructor: Mapped["User"] = relationship(back_populates="instructed_classes")
    class_group: Mapped["ClassGroup"] = relationship(back_populates="instructors")


class Enrollment(Base):
    __tablename__ = "enrollment"

    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.class_id", ondelete="CASCADE"),
        primary_key=True,
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.student_id", ondelete="CASCADE"),
        primary_key=True,
    )
    class_group: Mapped["ClassGroup"] = relationship(back_populates="enrollments")
    student: Mapped["Student"] = relationship(back_populates="enrollments")
