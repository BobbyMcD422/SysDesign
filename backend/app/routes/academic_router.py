import csv
import io
import json
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import File, UploadFile
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ClassGroup, Enrollment, Instructs, Student, User
from app.schemas import (
    BulkClassError,
    BulkCreateClassesResponse,
    BulkCreateStudentsResponse,
    BulkStudentError,
    ClassCreate,
    ClassDetailResponse,
    ClassResponse,
    EnrollmentRequest,
    InstructorAssignmentRequest,
    StudentCreate,
    StudentResponse,
    StudentWithClassesResponse,
)
from auth.services.auth_service import get_current_active_user, require_admin

academic_router = APIRouter(
    tags=["Academic Records"],
)

REQUIRED_BULK_CLASS_FIELDS = {"name", "term"}
REQUIRED_BULK_STUDENT_FIELDS = {"fname", "lname", "email"}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def clean_bulk_value(value: object) -> str:
    text = str(value or "").strip()
    return "".join(
        character
        for character in text
        if unicodedata.category(character) != "Cf"
    )


def parse_bulk_class_file(filename: str, contents: bytes) -> list[dict]:
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("File must be UTF-8 encoded") from exc

    if filename.lower().endswith(".json"):
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("classes")
        if not isinstance(data, list):
            raise ValueError("JSON file must contain a list of classes")
        return data

    if filename.lower().endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValueError("CSV file must include a header row")

        normalized_headers = {
            field.strip().lower() for field in reader.fieldnames if field
        }
        missing_fields = REQUIRED_BULK_CLASS_FIELDS - normalized_headers
        if missing_fields:
            raise ValueError(
                f"CSV file is missing required columns: {', '.join(sorted(missing_fields))}"
            )

        return [
            {
                clean_bulk_value(key).lower(): clean_bulk_value(value)
                for key, value in row.items()
            }
            for row in reader
        ]

    raise ValueError("Upload a .csv or .json file")


def parse_bulk_student_file(filename: str, contents: bytes) -> list[dict]:
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("File must be UTF-8 encoded") from exc

    if filename.lower().endswith(".json"):
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("students")
        if not isinstance(data, list):
            raise ValueError("JSON file must contain a list of students")
        return data

    if filename.lower().endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValueError("CSV file must include a header row")

        normalized_headers = {
            field.strip().lower() for field in reader.fieldnames if field
        }
        missing_fields = REQUIRED_BULK_STUDENT_FIELDS - normalized_headers
        if missing_fields:
            raise ValueError(
                f"CSV file is missing required columns: {', '.join(sorted(missing_fields))}"
            )

        return [
            {
                clean_bulk_value(key).lower(): clean_bulk_value(value)
                for key, value in row.items()
            }
            for row in reader
        ]

    raise ValueError("Upload a .csv or .json file")


@academic_router.get("/students", response_model=list[StudentWithClassesResponse])
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    students = db.query(Student).order_by(Student.lname, Student.fname).all()
    return [
        {
            "student_id": student.student_id,
            "fname": student.fname,
            "lname": student.lname,
            "email": student.email,
            "classes": [
                {
                    "class_id": enrollment.class_group.class_id,
                    "name": enrollment.class_group.name,
                    "term": enrollment.class_group.term,
                }
                for enrollment in student.enrollments
            ],
        }
        for student in students
    ]


@academic_router.post(
    "/students",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student = Student(
        fname=payload.fname.strip(),
        lname=payload.lname.strip(),
        email=normalize_email(payload.email),
    )
    db.add(student)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with that email already exists",
        ) from exc

    db.refresh(student)
    return student


@academic_router.post("/students/bulk-upload", response_model=BulkCreateStudentsResponse)
async def bulk_upload_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        rows = parse_bulk_student_file(file.filename or "", await file.read())
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    created_students: list[Student] = []
    errors: list[BulkStudentError] = []

    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(
                BulkStudentError(
                    row=index,
                    email=None,
                    error="Each row must be an object with student fields",
                )
            )
            continue

        row = {
            clean_bulk_value(key).lower(): clean_bulk_value(value)
            for key, value in row.items()
        }

        if all(row.get(field) == field for field in REQUIRED_BULK_STUDENT_FIELDS):
            continue

        try:
            payload = StudentCreate(
                fname=str(row.get("fname", "")),
                lname=str(row.get("lname", "")),
                email=str(row.get("email", "")),
            )
        except ValidationError as exc:
            errors.append(
                BulkStudentError(
                    row=index,
                    email=str(row.get("email", "")) or None,
                    error=exc.errors()[0]["msg"],
                )
            )
            continue

        if not payload.fname.strip() or not payload.lname.strip():
            errors.append(
                BulkStudentError(
                    row=index,
                    email=str(payload.email),
                    error="First name, last name, and email are required",
                )
            )
            continue

        student_email = normalize_email(payload.email)
        existing_student = (
            db.query(Student)
            .filter(Student.email == student_email)
            .first()
        )
        if existing_student:
            errors.append(
                BulkStudentError(
                    row=index,
                    email=student_email,
                    error="A student with that email already exists",
                )
            )
            continue

        student = Student(
            fname=payload.fname.strip(),
            lname=payload.lname.strip(),
            email=student_email,
        )
        db.add(student)
        db.flush()
        created_students.append(student)

    db.commit()
    for student in created_students:
        db.refresh(student)

    return BulkCreateStudentsResponse(
        created=[
            {
                "student_id": student.student_id,
                "fname": student.fname,
                "lname": student.lname,
                "email": student.email,
                "classes": [],
            }
            for student in created_students
        ],
        errors=errors,
    )


@academic_router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    db.delete(student)
    db.commit()
    return None


@academic_router.get("/classes", response_model=list[ClassResponse])
def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(ClassGroup).order_by(ClassGroup.term, ClassGroup.name)
    if current_user.role.lower() == "admin":
        return query.all()

    return (
        query
        .join(Instructs, Instructs.class_id == ClassGroup.class_id)
        .filter(Instructs.instructor_id == current_user.id)
        .all()
    )


@academic_router.post(
    "/classes",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_group = ClassGroup(
        name=payload.name.strip(),
        term=payload.term.strip(),
    )
    db.add(class_group)
    db.commit()
    db.refresh(class_group)
    return class_group


@academic_router.post("/classes/bulk-upload", response_model=BulkCreateClassesResponse)
async def bulk_upload_classes(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        rows = parse_bulk_class_file(file.filename or "", await file.read())
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    created_classes: list[ClassGroup] = []
    errors: list[BulkClassError] = []

    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(
                BulkClassError(
                    row=index,
                    name=None,
                    error="Each row must be an object with class fields",
                )
            )
            continue

        row = {
            clean_bulk_value(key).lower(): clean_bulk_value(value)
            for key, value in row.items()
        }

        if all(row.get(field) == field for field in REQUIRED_BULK_CLASS_FIELDS):
            continue

        try:
            payload = ClassCreate(
                name=str(row.get("name", "")),
                term=str(row.get("term", "")),
            )
        except ValidationError as exc:
            errors.append(
                BulkClassError(
                    row=index,
                    name=str(row.get("name", "")) or None,
                    error=exc.errors()[0]["msg"],
                )
            )
            continue

        if not payload.name.strip() or not payload.term.strip():
            errors.append(
                BulkClassError(
                    row=index,
                    name=payload.name or None,
                    error="Class name and term are required",
                )
            )
            continue

        class_group = ClassGroup(
            name=payload.name.strip(),
            term=payload.term.strip(),
        )
        db.add(class_group)
        db.flush()
        created_classes.append(class_group)

    db.commit()
    for class_group in created_classes:
        db.refresh(class_group)

    return BulkCreateClassesResponse(
        created=[
            {
                "class_id": class_group.class_id,
                "name": class_group.name,
                "term": class_group.term,
            }
            for class_group in created_classes
        ],
        errors=errors,
    )


@academic_router.get("/classes/{class_id}", response_model=ClassDetailResponse)
def get_class_detail(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_group = db.get(ClassGroup, class_id)
    if not class_group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return {
        "class_id": class_group.class_id,
        "name": class_group.name,
        "term": class_group.term,
        "students": [
            {
                "student_id": enrollment.student.student_id,
                "fname": enrollment.student.fname,
                "lname": enrollment.student.lname,
                "email": enrollment.student.email,
            }
            for enrollment in class_group.enrollments
        ],
        "instructors": [
            {
                "id": assignment.instructor.id,
                "fname": assignment.instructor.fname,
                "lname": assignment.instructor.lname,
                "email": assignment.instructor.email,
                "role": assignment.instructor.role,
            }
            for assignment in class_group.instructors
        ],
    }


@academic_router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_group = db.get(ClassGroup, class_id)
    if not class_group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    db.delete(class_group)
    db.commit()
    return None


@academic_router.post("/classes/{class_id}/instructors", status_code=status.HTTP_201_CREATED)
def assign_instructor(
    class_id: int,
    payload: InstructorAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_group = db.get(ClassGroup, class_id)
    instructor = db.get(User, payload.instructor_id)

    if not class_group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")

    assignment = Instructs(
        instructor_id=payload.instructor_id,
        class_id=class_id,
    )
    db.add(assignment)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Instructor is already assigned to this class",
        ) from exc

    return {"ok": True}


@academic_router.post("/classes/{class_id}/students", status_code=status.HTTP_201_CREATED)
def enroll_student(
    class_id: int,
    payload: EnrollmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_group = db.get(ClassGroup, class_id)
    student = db.get(Student, payload.student_id)

    if not class_group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    enrollment = Enrollment(
        class_id=class_id,
        student_id=payload.student_id,
    )
    db.add(enrollment)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already enrolled in this class",
        ) from exc

    return {"ok": True}


@academic_router.delete(
    "/classes/{class_id}/students/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_student_enrollment(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    enrollment = db.get(Enrollment, {"class_id": class_id, "student_id": student_id})
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    db.delete(enrollment)
    db.commit()
    return None


@academic_router.delete(
    "/classes/{class_id}/instructors/{instructor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_instructor_assignment(
    class_id: int,
    instructor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = db.get(Instructs, {"instructor_id": instructor_id, "class_id": class_id})
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor assignment not found")

    db.delete(assignment)
    db.commit()
    return None
