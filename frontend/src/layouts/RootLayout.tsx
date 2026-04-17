import { Outlet } from "react-router";
import { GalleryVerticalEnd } from "lucide-react"
import { Link } from "react-router";
import { DropdownMenuIcons } from "@/components/DropdownIcons";
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white">
    <header className="flex items-center justify-between p-4 shadow-sm bg-violet-300 border-b border-violet-200 dark:bg-zinc-900 dark:border-violet-900">
      <Link to="/" className="flex items-center gap-2 font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-5" />
        </div>
        <span>Academic Admin</span>
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <DropdownMenuIcons />
      </div>
    </header>


      <main>
        <Outlet />
      </main>
    </div>
  );
}