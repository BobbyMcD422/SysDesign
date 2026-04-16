import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/lib/auth-context"

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
