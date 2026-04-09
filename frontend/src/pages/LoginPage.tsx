import { useState } from "react"
import { useNavigate } from "react-router"
import { LoginForm } from "@/components/login-form"
import { login } from "@/lib/api"
import bannerPic from "@/assets/capa.png"

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState("")

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs bg-white rounded-xl shadow-md border border-zinc-200 p-8 dark:bg-zinc-700">
            <LoginForm 
              onSubmit={handleSubmit} 
              error={error}
             />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src={bannerPic}
          alt="Image"
          className="absolute top-1/2 -translate-y-1/2 h-3/4 w-full object-cover dark:brightness-[0.6]"
        />
      </div>
    </div>
  )
}