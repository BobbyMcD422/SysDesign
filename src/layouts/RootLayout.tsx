import { Outlet } from "react-router";
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}