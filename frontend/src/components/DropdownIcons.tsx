import {
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "react-i18next"

export function DropdownMenuIcons() {
  const navigate = useNavigate()
  const { user, logoutUser } = useAuth()
  const { t } = useTranslation()

  async function handleLogout() {
    await logoutUser()
    navigate("/", { replace: true })
  }

  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {user.fname} {user.lname}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white">
        <DropdownMenuItem>
          <UserIcon />
          {t("navigation.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <SettingsIcon />
          {t("navigation.settings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleLogout()}
          className="text-red-500"
        >
          <LogOutIcon />
          {t("navigation.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
