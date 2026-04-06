import { BrowserRouter, Routes, Route } from "react-router";

// Import Pages
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main routes */}
        <Route path="/" element={<LoginPage />} />

        {/* Catch-all (404) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;