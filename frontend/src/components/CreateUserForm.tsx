import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next";

type User = {
  id: number
  fname: string
  lname: string
  email: string
  role: string
}

type CreateUserFormProps = {
  onCreated: (user: User) => void
  onClose: () => void
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export function CreateUserForm({ onCreated, onClose }: CreateUserFormProps) {
  const { t } = useTranslation();
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      fname: String(formData.get("fname") ?? ""),
      lname: String(formData.get("lname") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "user"),
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.detail || "Failed to create user")
      }

      const newUser = (await res.json()) as User
      onCreated(newUser)
      form.reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fname">{t("manageUsers.card.fname")}</FieldLabel>
          <Input id="fname" name="fname" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="lname">{t("manageUsers.card.lname")}</FieldLabel>
          <Input id="lname" name="lname" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">{t("manageUsers.card.email")}</FieldLabel>
          <Input id="email" name="email" type="email" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t("manageUsers.card.tempPass")}</FieldLabel>
          <Input 
            id="password" 
            name="password" 
            type="password"
            pattern="^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$" 
            required />
        </Field>

        <Field>
          <FieldLabel htmlFor="role">{t("manageUsers.card.role")}</FieldLabel>
          <select
            id="role"
            name="role"
            defaultValue="user"
            required
            className="h-8 w-full rounded-lg border border-input bg-zinc-300 dark:bg-zinc-700 0 px-2.5 py-1 text-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>  
          </select>
        </Field>

        <FieldError>{error}</FieldError>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save User"}
        </Button>
      </div>
    </form>
  )
}
