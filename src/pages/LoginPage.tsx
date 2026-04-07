
import { LoginForm } from "@/components/login-form"
import bannerPic from "@/assets/capa.png"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
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