import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "./ui/spinner"
import { useTranslation } from "react-i18next"

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-zinc-500">
        <Spinner className="size-8"/>
        <span>{t("common.loading")}</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
