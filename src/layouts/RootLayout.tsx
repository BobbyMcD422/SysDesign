import { Outlet } from "react-router";
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-black dark:bg-zinc-800 dark:text-white">
      <header className="flex justify-end p-4 bg-slate-300 dark:bg-zinc-900">
        <ThemeToggle />
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}