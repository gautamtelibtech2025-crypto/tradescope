import { BrowserRouter, Route, Routes } from "react-router-dom";
import FyersCallback from "./pages/FyersCallback";
import Callback from "./pages/Callback";
import Home from "./pages/Home";
import ManualExchange from "./pages/ManualExchange";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Primary OAuth callback route - used by FYERS redirect */}
        <Route path="/callback" element={<Callback />} />
        {/* Legacy callback route - kept for backward compatibility */}
        <Route path="/auth/callback" element={<FyersCallback />} />
        <Route path="/manual-exchange" element={<ManualExchange />} />
      </Routes>
    </BrowserRouter>
  );
}
