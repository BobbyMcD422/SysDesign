import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertCircle, ArrowLeft, Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  assignInstructor,
  enrollStudent,
  getClassDetail,
  getStudents,
  getUsers,
  removeInstructorFromClass,
  removeStudentFromClass,
} from "@/lib/api";
import type { ClassDetailRecord, StudentRecord, UserRecord } from "@/lib/api";

export default function ClassDetailPage() {
  const { classId } = useParams();
  const { t } = useTranslation();
  const numericClassId = Number(classId);
  const [classDetail, setClassDetail] = useState<ClassDetailRecord | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadClassRecords() {
    if (!numericClassId) {
      setError(t("manageStudents.classDetail.invalidClass"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [detail, studentRecords, userRecords] = await Promise.all([
        getClassDetail(numericClassId),
        getStudents(),
        getUsers(),
      ]);
      setClassDetail(detail);
      setStudents(studentRecords);
      setUsers(userRecords);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("manageStudents.errors.loadRecords"),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadClassRecords();
  }, [numericClassId]);

  const availableStudents = useMemo(() => {
    if (!classDetail) return [];
    return students.filter(
      (student) =>
        !classDetail.students.some(
          (classStudent) => classStudent.student_id === student.student_id,
        ),
    );
  }, [classDetail, students]);

  const availableInstructors = useMemo(() => {
    if (!classDetail) return [];
    return users.filter((user) => {
      const role = user.role.toLowerCase();
      const isTeacherRole = role === "admin" || role === "instructor";
      const isAssigned = classDetail.instructors.some(
        (instructor) => instructor.id === user.id,
      );
      return isTeacherRole && !isAssigned;
    });
  }, [classDetail, users]);

  async function handleAddStudent() {
    const studentId = Number(selectedStudentId);
    if (!classDetail || !studentId) {
      setError(t("manageStudents.validation.chooseStudent"));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await enrollStudent(classDetail.class_id, studentId);
      setSelectedStudentId("");
      await loadClassRecords();
      setMessage(t("manageStudents.messages.studentEnrolled"));
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : t("manageStudents.errors.enrollStudent"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignInstructor() {
    const instructorId = Number(selectedInstructorId);
    if (!classDetail || !instructorId) {
      setError(t("manageStudents.validation.chooseInstructor"));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await assignInstructor(classDetail.class_id, instructorId);
      setSelectedInstructorId("");
      await loadClassRecords();
      setMessage(t("manageStudents.messages.instructorAssigned"));
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : t("manageStudents.errors.assignInstructor"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveStudent(studentId: number) {
    if (!classDetail) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await removeStudentFromClass(classDetail.class_id, studentId);
      await loadClassRecords();
      setMessage(t("manageStudents.messages.studentRemovedFromClass"));
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : t("manageStudents.errors.removeStudentFromClass"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveInstructor(instructorId: number) {
    if (!classDetail) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await removeInstructorFromClass(classDetail.class_id, instructorId);
      await loadClassRecords();
      setMessage(t("manageStudents.messages.instructorRemovedFromClass"));
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : t("manageStudents.errors.removeInstructorFromClass"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 p-4 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid max-w-5xl gap-4">
        <Button asChild variant="outline" className="w-fit gap-2">
          <Link to="/manage-classes">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("manageStudents.classDetail.back")}
          </Link>
        </Button>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight">
            {classDetail?.name ?? t("manageStudents.classDetail.title")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {classDetail?.term ?? t("manageStudents.classDetail.subtitle")}
          </p>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="mb-1 size-4" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {message}
          </div>
        ) : null}

        {isLoading && !classDetail ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Loader2 className="size-4 animate-spin" />
            {t("manageStudents.classDetail.loading")}
          </div>
        ) : null}

        {classDetail ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="grid gap-3 rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="font-semibold">{t("manageStudents.classDetail.students")}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t("manageStudents.classDetail.studentsDescription")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  disabled={availableStudents.length === 0}
                  className="h-9 min-w-60 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="">
                    {availableStudents.length === 0
                      ? t("manageStudents.states.noAvailableStudents")
                      : t("manageStudents.fields.selectStudent")}
                  </option>
                  {availableStudents.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.fname} {student.lname} ({student.email})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void handleAddStudent()}
                  disabled={isSaving || availableStudents.length === 0}
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  {t("manageStudents.actions.addStudentToClass")}
                </Button>
              </div>

              <div className="grid gap-2">
                {classDetail.students.map((student) => (
                  <article
                    key={student.student_id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">
                        {student.fname} {student.lname}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <Mail className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{student.email}</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("manageStudents.actions.removeStudentFromClass", {
                        name: `${student.fname} ${student.lname}`,
                      })}
                      onClick={() => void handleRemoveStudent(student.student_id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                    </Button>
                  </article>
                ))}

                {classDetail.students.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {t("manageStudents.states.noClassStudents")}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="font-semibold">{t("manageStudents.classDetail.instructors")}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t("manageStudents.classDetail.instructorsDescription")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedInstructorId}
                  onChange={(event) => setSelectedInstructorId(event.target.value)}
                  disabled={availableInstructors.length === 0}
                  className="h-9 min-w-60 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="">
                    {availableInstructors.length === 0
                      ? t("manageStudents.states.noAvailableInstructors")
                      : t("manageStudents.fields.selectInstructor")}
                  </option>
                  {availableInstructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.fname} {instructor.lname} ({instructor.role})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void handleAssignInstructor()}
                  disabled={isSaving || availableInstructors.length === 0}
                >
                  <Users className="size-4" aria-hidden="true" />
                  {t("manageStudents.actions.assignInstructor")}
                </Button>
              </div>

              <div className="grid gap-2">
                {classDetail.instructors.map((instructor) => (
                  <article
                    key={instructor.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">
                        {instructor.fname} {instructor.lname}
                      </h3>
                      <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {instructor.email} - {instructor.role}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("manageStudents.actions.removeInstructorFromClass", {
                        name: `${instructor.fname} ${instructor.lname}`,
                      })}
                      onClick={() => void handleRemoveInstructor(instructor.id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                    </Button>
                  </article>
                ))}

                {classDetail.instructors.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {t("manageStudents.states.noClassInstructors")}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
