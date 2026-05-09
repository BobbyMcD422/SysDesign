import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  BookOpen,
  FileUp,
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BulkClassUploadForm } from "@/components/BulkClassUploadForm";
import { BulkStudentUploadForm } from "@/components/BulkStudentUploadForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createClass,
  createStudent,
  deleteClass,
  deleteStudent,
  enrollStudent,
  getClasses,
  getStudents,
} from "@/lib/api";
import type { ClassRecord, StudentRecord } from "@/lib/api";

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [bulkStudentDialogOpen, setBulkStudentDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [bulkClassDialogOpen, setBulkClassDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentSelections, setEnrollmentSelections] = useState<
    Record<number, string>
  >({});

  const loadAcademicRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [studentRecords, classRecords] = await Promise.all([
        getStudents(),
        getClasses(),
      ]);
      setStudents(studentRecords);
      setClasses(classRecords);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load academic records",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAcademicRecords();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return students;
    }

    return students.filter((student) =>
      [
        student.fname,
        student.lname,
        student.email,
        ...student.classes.flatMap((classRecord) => [
          classRecord.name,
          classRecord.term,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, students]);

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const student = await createStudent({
        fname: String(formData.get("fname") ?? ""),
        lname: String(formData.get("lname") ?? ""),
        email: String(formData.get("email") ?? ""),
      });
      setStudents((currentStudents) => [...currentStudents, student]);
      setMessage("Student created.");
      form.reset();
      setStudentDialogOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create student",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const classRecord = await createClass({
        name: String(formData.get("name") ?? ""),
        term: String(formData.get("term") ?? ""),
      });
      setClasses((currentClasses) => [...currentClasses, classRecord]);
      setMessage("Class created.");
      form.reset();
      setClassDialogOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create class",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStudent(student: StudentRecord) {
    setError(null);
    setMessage(null);

    try {
      await deleteStudent(student.student_id);
      setStudents((currentStudents) =>
        currentStudents.filter(
          (currentStudent) => currentStudent.student_id !== student.student_id,
        ),
      );
      setMessage("Student removed.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove student",
      );
    }
  }

  async function handleDeleteClass(classRecord: ClassRecord) {
    setError(null);
    setMessage(null);

    try {
      await deleteClass(classRecord.class_id);
      setClasses((currentClasses) =>
        currentClasses.filter(
          (currentClass) => currentClass.class_id !== classRecord.class_id,
        ),
      );
      await loadAcademicRecords();
      setMessage("Class removed.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove class",
      );
    }
  }

  async function handleEnrollStudent(student: StudentRecord) {
    const selectedClassId = Number(enrollmentSelections[student.student_id]);
    if (!selectedClassId) {
      setError("Choose a class before enrolling the student.");
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await enrollStudent(selectedClassId, student.student_id);
      await loadAcademicRecords();
      setEnrollmentSelections((currentSelections) => ({
        ...currentSelections,
        [student.student_id]: "",
      }));
      setMessage("Student enrolled.");
    } catch (enrollError) {
      setError(
        enrollError instanceof Error
          ? enrollError.message
          : "Failed to enroll student",
      );
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 p-4 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight">
              Manage Students
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Maintain student contact records and class enrollments.
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void loadAcademicRecords()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            Refresh
          </Button>
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

        <section className="grid gap-3 rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" aria-hidden="true" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>Add Student</DialogTitle>
                  <DialogDescription>
                    Create a student contact record.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="fname">First Name</FieldLabel>
                      <Input id="fname" name="fname" required />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="lname">Last Name</FieldLabel>
                      <Input id="lname" name="lname" required />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input id="email" name="email" type="email" required />
                    </Field>
                  </FieldGroup>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStudentDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      Save Student
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={bulkStudentDialogOpen}
              onOpenChange={setBulkStudentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileUp className="size-4" aria-hidden="true" />
                  Mass Insert Students
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>Mass Insert Students</DialogTitle>
                  <DialogDescription>
                    Upload students from a CSV or JSON file.
                  </DialogDescription>
                </DialogHeader>

                <BulkStudentUploadForm
                  onCreated={(createdStudents) => {
                    setStudents((currentStudents) => [
                      ...currentStudents,
                      ...createdStudents,
                    ]);
                    setMessage(`${createdStudents.length} students created.`);
                  }}
                  onClose={() => setBulkStudentDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <BookOpen className="size-4" aria-hidden="true" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>Add Class</DialogTitle>
                  <DialogDescription>
                    Create a class group students can be enrolled in.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateClass} className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name">Class Name</FieldLabel>
                      <Input id="name" name="name" required />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="term">Term</FieldLabel>
                      <Input id="term" name="term" placeholder="Spring 2026" required />
                    </Field>
                  </FieldGroup>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setClassDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      Save Class
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={bulkClassDialogOpen}
              onOpenChange={setBulkClassDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileUp className="size-4" aria-hidden="true" />
                  Mass Insert Classes
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>Mass Insert Classes</DialogTitle>
                  <DialogDescription>
                    Upload classes from a CSV or JSON file.
                  </DialogDescription>
                </DialogHeader>

                <BulkClassUploadForm
                  onCreated={(createdClasses) => {
                    setClasses((currentClasses) => [
                      ...currentClasses,
                      ...createdClasses,
                    ]);
                    setMessage(`${createdClasses.length} classes created.`);
                  }}
                  onClose={() => setBulkClassDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <div className="relative min-w-64 flex-1 sm:max-w-xs">
              <label htmlFor="student-search" className="sr-only">
                Search students
              </label>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                id="student-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students"
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid gap-2">
            {isLoading && students.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <Loader2 className="size-4 animate-spin" />
                Loading students
              </div>
            ) : null}

            {filteredStudents.map((student) => {
              const availableClasses = classes.filter(
                (classRecord) =>
                  !student.classes.some(
                    (studentClass) =>
                      studentClass.class_id === classRecord.class_id,
                  ),
              );

              return (
                <article
                  key={student.student_id}
                  className="grid gap-3 rounded-lg border p-4 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">
                        {student.fname} {student.lname}
                      </h2>
                      <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <Mail className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{student.email}</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${student.fname} ${student.lname}`}
                      onClick={() => void handleDeleteStudent(student)}
                    >
                      <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    {student.classes.length > 0 ? (
                      student.classes.map((classRecord) => (
                        <span
                          key={classRecord.class_id}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          <Users className="size-4" aria-hidden="true" />
                          {classRecord.name} ({classRecord.term})
                        </span>
                      ))
                    ) : (
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Not enrolled
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={enrollmentSelections[student.student_id] ?? ""}
                      onChange={(event) =>
                        setEnrollmentSelections((currentSelections) => ({
                          ...currentSelections,
                          [student.student_id]: event.target.value,
                        }))
                      }
                      className="h-8 min-w-52 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      disabled={availableClasses.length === 0}
                    >
                      <option value="">
                        {availableClasses.length === 0
                          ? "No available classes"
                          : "Select class"}
                      </option>
                      {availableClasses.map((classRecord) => (
                        <option
                          key={classRecord.class_id}
                          value={classRecord.class_id}
                        >
                          {classRecord.name} ({classRecord.term})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleEnrollStudent(student)}
                      disabled={availableClasses.length === 0}
                    >
                      Enroll
                    </Button>
                  </div>
                </article>
              );
            })}

            {!isLoading && filteredStudents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                No students found.
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <h2 className="font-semibold">Classes</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Removing a class also removes related instructor assignments and enrollments.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classRecord) => (
              <article
                key={classRecord.class_id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    {classRecord.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {classRecord.term}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${classRecord.name}`}
                  onClick={() => void handleDeleteClass(classRecord)}
                >
                  <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                </Button>
              </article>
            ))}

            {!isLoading && classes.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
                No classes found.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
