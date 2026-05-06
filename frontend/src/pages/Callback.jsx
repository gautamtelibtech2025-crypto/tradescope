import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeFyersCode, getFyersCodeFromUrl } from "../lib/fyersAuth";

/**
 * Callback Page (/callback)
 * 
 * This page handles the FYERS OAuth callback automatically:
 * 1. Extracts auth_code from URL (no manual copy/paste needed)
 * 2. Calls backend to exchange auth_code for access_token
 * 3. Backend stores token securely (not exposed to frontend)
 * 4. Redirects to home page on success
 * 5. Shows clear error messages on failure
 * 
 * Prevents:
 * - Redirect loops via history.replaceState
 * - Stale token reuse (single exchange per redirect)
 * - Code exposure in logs (handled via backend only)
 */
export default function Callback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing FYERS authentication...");
  const [error, setError] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      try {
        // Step 1: Extract auth_code from URL parameters
        // Supports: ?code=..., ?auth_code=..., #code=..., #auth_code=...
        const code = getFyersCodeFromUrl(window.location);

        if (!code) {
          throw new Error(
            "FYERS authorization code not found in callback URL. " +
            "Did FYERS redirect you back correctly?"
          );
        }

        setStatus("Exchanging authorization code for access token...");
        setDetails("Sending code to backend securely...");

        // Step 2: Send auth_code to backend
        // Backend will:
        // - Validate code format
        // - Call FYERS API (validate-authcode endpoint)
        // - Exchange for access_token + refresh_token
        // - Store tokens securely (NOT returned to frontend)
        const response = await exchangeFyersCode(code);

        if (cancelled) return;

        if (!response.success) {
          throw new Error(
            response.message || "Failed to exchange FYERS authorization code."
          );
        }

        setStatus("FYERS authentication successful!");
        setDetails("Redirecting to dashboard...");

        // Step 3: Clean URL history to prevent redirect loops
        // Replaces callback URL with home URL in browser history
        window.history.replaceState({}, document.title, "/");

        // Step 4: Redirect to home page
        // Small delay to allow user to see success message
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 500);
      } catch (err) {
        if (cancelled) return;

        console.error("[Callback Error]", err);
        setStatus("FYERS authentication failed");
        setError(err.message || "An unexpected error occurred during authentication.");
        setDetails(
          "Please try again. If the problem persists, check that:\n" +
          "1. FYERS_APP_ID is set on the backend\n" +
          "2. FYERS_REDIRECT_URI matches this page URL\n" +
          "3. Your auth code hasn't expired (5-10 minutes typically)"
        );
      }
    }

    completeAuth();

    // Cleanup function: prevents state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="callback-page">
      <section className="callback-container">
        <h1>FYERS Authentication</h1>

        {error ? (
          <>
            <div className="error-section" role="alert">
              <h2>❌ {status}</h2>
              <p className="error-message">{error}</p>
              {details && (
                <details className="error-details">
                  <summary>Technical details</summary>
                  <pre>{details}</pre>
                </details>
              )}
            </div>
            <div className="error-actions">
              <button
                type="button"
                onClick={() => window.location.href = "/"}
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={() => window.location.href = "/"}
                className="secondary"
              >
                Try Again
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="loading-section">
              <p className="loading-status">⏳ {status}</p>
              {details && <p className="loading-detail">{details}</p>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
