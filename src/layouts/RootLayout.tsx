import { Outlet } from "react-router";
import { GalleryVerticalEnd } from "lucide-react"
import { Link } from "react-router";
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-zinc-300 text-black dark:bg-zinc-800 dark:text-white">
      <header className="flex items-center justify-between p-4 bg-slate-300 dark:bg-zinc-900">
        <Link to="/" className="flex items-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Academic Admin
        </Link>
        <ThemeToggle />
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}