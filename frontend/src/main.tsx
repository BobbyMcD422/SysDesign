import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router";

import RootLayout from "./layouts/RootLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./lib/auth-context";
import { ProtectedRoute } from "./components/protected-route";

function DashboardPage() {
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        You are logged in.
      </p>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: "dashboard", element: <DashboardPage /> }],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
