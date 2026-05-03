import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useTranslation } from "react-i18next"


type LoginFormProps = React.ComponentProps<"form"> & {
  error?: string
}

export function LoginForm({
  className,
  error,
  ...props
}: LoginFormProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("auth.login.title")}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t("auth.login.subtitle")}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">{t("auth.login.emailLabel")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("auth.login.emailPlaceholder")}
            required
            className="bg-background placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">{t("auth.login.passwordLabel")}</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              {t("auth.login.forgotPassword")}
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              pattern="^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$"
              required
              className="bg-background pr-10"
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
        {error ? (
          <Field>
            <FieldDescription className="text-center text-destructive text-red-500">
              {t("auth.login.defaultError")}
            </FieldDescription>
          </Field>
        ) : null}
        <Field>
          <Button type="submit">{t("auth.login.submit")}</Button>
        </Field>
      </FieldGroup>
    </form> 
  )
}
