import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:10000";

/**
 * FyersConnectButton - One-click automated FYERS OAuth button
 * 
 * Handles:
 * - Fetching FYERS login URL from backend
 * - Redirecting user to FYERS auth
 * - Error handling (network, missing config, etc.)
 * - Loading state feedback
 */
export default function FyersConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setLoading(true);
    setError("");

    try {
      // Step 1: Get login URL from backend
      // Backend validates FYERS_APP_ID and FYERS_REDIRECT_URI configuration
      const response = await fetch(`${API_BASE_URL}/api/fyers/login-url`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to get FYERS login URL from backend.");
      }

      if (!data.auth_url) {
        throw new Error("Backend returned empty auth URL.");
      }

      // Step 2: Redirect to FYERS OAuth page
      // User will log in and authorize TradeScope
      window.location.href = data.auth_url;
    } catch (err) {
      setLoading(false);
      setError(err.message || "Error connecting to FYERS. Please check backend configuration.");
      console.error("[FyersConnect]", err);
    }
  }

  return (
    <div className="fyers-connect-button-container">
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="fyers-connect-button"
      >
        {loading ? "Redirecting to FYERS..." : "Connect FYERS Account"}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}
