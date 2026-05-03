import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Mail,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError(t("profile.changePassword.passwordMismatch"));
      setSubmitting(false);
      return;
    }

    try {
      await changePassword(password);
      form.reset();
      setSuccess(t("profile.changePassword.success"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("profile.changePassword.defaultError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return null;
  }

  const fullName = `${user.fname} ${user.lname}`;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 px-4 py-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-lg bg-zinc-700 text-lg font-semibold text-white dark:bg-slate-600 dark:text-zinc-950">
              {user.fname.charAt(0)}
              {user.lname.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{fullName}</h1>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <IdCard className="size-4 text-zinc-500" />
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("profile.userId")}
              </span>
              <span className="ml-auto font-medium">{user.id}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <Mail className="size-4 text-zinc-500" />
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("profile.email")}
              </span>
              <span className="ml-auto truncate font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <Shield className="size-4 text-zinc-500" />
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("profile.role")}
              </span>
              <span className="ml-auto rounded-md bg-sky-100 px-2 py-1 text-xs font-medium capitalize text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                {user.role}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <KeyRound className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t("profile.changePassword.title")}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("profile.changePassword.description")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">
                  {t("profile.changePassword.newPassword")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    pattern="^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((current) => !current)}
                    title={
                      showPassword
                        ? t("common.hidePassword")
                        : t("common.showPassword")
                    }
                    aria-label={
                      showPassword
                        ? t("common.hidePassword")
                        : t("common.showPassword")
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  {t("profile.changePassword.confirmPassword")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    pattern="^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    title={
                      showConfirmPassword
                        ? t("common.hidePassword")
                        : t("common.showPassword")
                    }
                    aria-label={
                      showConfirmPassword
                        ? t("common.hidePassword")
                        : t("common.showPassword")
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </Field>

              <FieldError>{error}</FieldError>

              {success ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  {success}
                </div>
              ) : null}
            </FieldGroup>

            <Button type="submit" disabled={submitting}>
              {submitting
                ? t("profile.changePassword.submitting")
                : t("profile.changePassword.submit")}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
