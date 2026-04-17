import { createContext, useContext, useEffect, useState } from "react"
import { getCurrentUser, logout } from "@/lib/api"

type AuthUser = {
  id: number
  email: string
  fname: string
  lname: string
  role: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  refreshUser: () => Promise<void>
  logoutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } finally {
      setLoading(false)
    }
  }

  async function logoutUser() {
    await logout()
    setUser(null)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
