import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AlertCircle, FileUp, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { BulkClassUploadForm } from "@/components/BulkClassUploadForm";
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
import { createClass, deleteClass, getClasses } from "@/lib/api";
import type { ClassRecord } from "@/lib/api";

export default function ManageClassesPage() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [bulkClassDialogOpen, setBulkClassDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadClasses() {
    setIsLoading(true);
    setError(null);

    try {
      setClasses(await getClasses());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("manageClasses.errors.loadClasses"),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadClasses();
  }, []);

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
      setMessage(t("manageClasses.messages.classCreated"));
      form.reset();
      setClassDialogOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("manageClasses.errors.createClass"),
      );
    } finally {
      setIsSaving(false);
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
      setMessage(t("manageClasses.messages.classRemoved"));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("manageClasses.errors.removeClass"),
      );
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 p-4 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight">
              {t("manageClasses.title")}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("manageClasses.subtitle")}
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void loadClasses()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            {t("manageClasses.actions.refresh")}
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
            <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" aria-hidden="true" />
                  {t("manageClasses.actions.addClass")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>{t("manageClasses.classDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("manageClasses.classDialog.description")}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateClass} className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name">
                        {t("manageClasses.fields.className")}
                      </FieldLabel>
                      <Input id="name" name="name" required />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="term">
                        {t("manageClasses.fields.term")}
                      </FieldLabel>
                      <Input id="term" name="term" placeholder="Spring 2026" required />
                    </Field>
                  </FieldGroup>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setClassDialogOpen(false)}
                    >
                      {t("manageClasses.actions.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {t("manageClasses.actions.saveClass")}
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
                  {t("manageClasses.classBulk.button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-800 dark:text-white">
                <DialogHeader>
                  <DialogTitle>{t("manageClasses.classBulk.title")}</DialogTitle>
                  <DialogDescription>
                    {t("manageClasses.classBulk.description")}
                  </DialogDescription>
                </DialogHeader>

                <BulkClassUploadForm
                  onCreated={(createdClasses) => {
                    setClasses((currentClasses) => [
                      ...currentClasses,
                      ...createdClasses,
                    ]);
                    setMessage(
                      t("manageClasses.messages.classesCreatedCount", {
                        count: createdClasses.length,
                      }),
                    );
                  }}
                  onClose={() => setBulkClassDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h2 className="font-semibold">{t("manageClasses.classes.title")}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t("manageClasses.classes.description")}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classRecord) => (
              <article
                key={classRecord.class_id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 dark:border-zinc-800"
              >
                <Link
                  to={`/manage-classes/${classRecord.class_id}`}
                  className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <h3 className="truncate text-sm font-semibold">
                    {classRecord.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {classRecord.term}
                  </p>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("manageClasses.actions.removeClass", {
                    name: classRecord.name,
                  })}
                  onClick={() => void handleDeleteClass(classRecord)}
                >
                  <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                </Button>
              </article>
            ))}

            {isLoading && classes.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
                <Loader2 className="size-4 animate-spin" />
                {t("manageClasses.states.loadingClasses")}
              </div>
            ) : null}

            {!isLoading && classes.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
                {t("manageClasses.states.noClasses")}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
