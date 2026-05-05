import { BrowserRouter, Route, Routes } from "react-router-dom";
import FyersCallback from "./pages/FyersCallback";
import Home from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/callback" element={<FyersCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
