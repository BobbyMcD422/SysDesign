import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { StudentRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type BulkUploadError = {
  row: number;
  email?: string | null;
  error: string;
};

type BulkUploadResponse = {
  created: StudentRecord[];
  errors: BulkUploadError[];
};

type BulkStudentUploadFormProps = {
  onCreated: (students: StudentRecord[]) => void;
  onClose: () => void;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function BulkStudentUploadForm({
  onCreated,
  onClose,
}: BulkStudentUploadFormProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkUploadResponse | null>(null);

  function handleFiles(files: FileList | null) {
    setError("");
    setResults(null);
    setFile(files?.[0] ?? null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResults(null);

    if (!file) {
      setError(t("manageStudents.studentBulk.noFile"));
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/students/bulk-upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail || t("manageStudents.studentBulk.defaultError"));
      }

      const uploadResults = data as BulkUploadResponse;
      setResults(uploadResults);
      if (uploadResults.created.length > 0) {
        onCreated(uploadResults.created);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("manageStudents.studentBulk.defaultError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center transition-colors dark:border-zinc-700 dark:bg-zinc-900",
          dragging && "border-sky-500 bg-sky-50 dark:bg-sky-950",
        )}
      >
        <Upload className="size-8 text-zinc-500" />
        <span className="text-sm font-medium">
          {file ? file.name : t("manageStudents.studentBulk.dropTitle")}
        </span>
        <span className="max-w-sm text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {t("manageStudents.studentBulk.dropDescription")}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
        {t("manageStudents.studentBulk.formatHelp")}
      </div>

      <FieldError>{error}</FieldError>

      {results ? (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <p>
            {t("manageStudents.messages.studentsCreatedCount", {
              count: results.created.length,
            })}
          </p>
          {results.errors.length > 0 ? (
            <div className="space-y-1 text-red-600 dark:text-red-400">
              {results.errors.map((rowError) => (
                <p key={`${rowError.row}-${rowError.email ?? "unknown"}`}>
                  {t("manageStudents.studentBulk.rowError", {
                    row: rowError.row,
                    email:
                      rowError.email ??
                      t("manageStudents.studentBulk.unknownEmail"),
                    error: rowError.error,
                  })}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t("manageStudents.actions.close")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? t("manageStudents.actions.uploading")
            : t("manageStudents.studentBulk.upload")}
        </Button>
      </div>
    </form>
  );
}
