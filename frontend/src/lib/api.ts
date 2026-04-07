const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

type LoginResponse = {
  message?: string
  user?: {
    id: string
    email: string
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse | null> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
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
