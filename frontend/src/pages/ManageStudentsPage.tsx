import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, FileUp, Loader2, Mail, Plus, RefreshCcw, Search, Trash2, Users } from "lucide-react";

import { BulkStudentUploadForm } from "@/components/BulkStudentUploadForm";
import { Button } from "@/components/ui/button";
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
import { createStudent, deleteStudent, getStudents } from "@/lib/api";
import type { StudentRecord } from "@/lib/api";

export default function ManageStudentsPage() {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [bulkStudentDialogOpen, setBulkStudentDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStudents() {
    setIsLoading(true);
    setError(null);

    try {
      setStudents(await getStudents());
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
    void loadStudents();
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
      setMessage(t("manageStudents.messages.studentCreated"));
      form.reset();
      setStudentDialogOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("manageStudents.errors.createStudent"),
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
      setMessage(t("manageStudents.messages.studentRemoved"));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("manageStudents.errors.removeStudent"),
      );
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 p-4 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight">
              {t("manageStudents.title")}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("manageStudents.subtitle")}
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void loadStudents()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            {t("manageStudents.actions.refresh")}
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
                  {t("manageStudents.actions.addStudent")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>{t("manageStudents.studentDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("manageStudents.studentDialog.description")}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="fname">
                        {t("manageStudents.fields.firstName")}
                      </FieldLabel>
                      <Input id="fname" name="fname" required />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="lname">
                        {t("manageStudents.fields.lastName")}
                      </FieldLabel>
                      <Input id="lname" name="lname" required />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email">
                        {t("manageStudents.fields.email")}
                      </FieldLabel>
                      <Input id="email" name="email" type="email" required />
                    </Field>
                  </FieldGroup>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStudentDialogOpen(false)}
                    >
                      {t("manageStudents.actions.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {t("manageStudents.actions.saveStudent")}
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
                  {t("manageStudents.studentBulk.button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>{t("manageStudents.studentBulk.title")}</DialogTitle>
                  <DialogDescription>
                    {t("manageStudents.studentBulk.description")}
                  </DialogDescription>
                </DialogHeader>

                <BulkStudentUploadForm
                  onCreated={(createdStudents) => {
                    setStudents((currentStudents) => [
                      ...currentStudents,
                      ...createdStudents,
                    ]);
                    setMessage(
                      t("manageStudents.messages.studentsCreatedCount", {
                        count: createdStudents.length,
                      }),
                    );
                  }}
                  onClose={() => setBulkStudentDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <div className="relative min-w-64 flex-1 sm:max-w-xs">
              <label htmlFor="student-search" className="sr-only">
                {t("manageStudents.search.label")}
              </label>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                id="student-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("manageStudents.search.placeholder")}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid gap-2">
            {isLoading && students.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <Loader2 className="size-4 animate-spin" />
                {t("manageStudents.states.loadingStudents")}
              </div>
            ) : null}

            {filteredStudents.map((student) => (
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
                    aria-label={t("manageStudents.actions.removeStudent", {
                      name: `${student.fname} ${student.lname}`,
                    })}
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
                      {t("manageStudents.states.notEnrolled")}
                    </span>
                  )}
                </div>
              </article>
            ))}

            {!isLoading && filteredStudents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {t("manageStudents.states.noStudents")}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
