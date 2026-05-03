import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./lib/i18n";
import { createBrowserRouter, RouterProvider } from "react-router";

// Pages
import RootLayout from "./layouts/RootLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";

import { AuthProvider } from "./lib/auth-context";
import { AdminRoute, ProtectedRoute } from "./components/protected-route";



const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      {
        element: <AdminRoute/>,
        children: [{ path: "manage-users", element: <AdminPage /> }],
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
