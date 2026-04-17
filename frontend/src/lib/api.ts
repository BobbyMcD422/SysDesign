const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

type LoginResponse = {
  ok: boolean
  user: {
    id: number
    email: string
    fname: string
    lname: string
    role: string
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse | null> {
  const body = new URLSearchParams()
  body.set("username", email)
  body.set("password", password)

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: "include",
    body,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Login failed")
  }

  if (res.status === 204) {
    return null
  }

  return res.json().catch(() => null)
}

type CurrentUserResponse = {
  id: number
  email: string
  fname: string
  lname: string
  role: string
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: "include",
  })

  if (res.status === 401) {
    return null
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Failed to fetch current user")
  }

  return res.json()
}

export async function logout() {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Logout failed")
  }

  return res.json().catch(() => null)
}
