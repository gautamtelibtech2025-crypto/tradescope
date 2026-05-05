import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeFyersCode, getFyersCodeFromUrl } from "../lib/fyersAuth";

export default function FyersCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Reading FYERS authorization code...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        const code = getFyersCodeFromUrl(window.location);
        if (!code) {
          throw new Error("FYERS did not return an auth code in the callback URL.");
        }

        setStatus("Exchanging auth code for access token...");
        await exchangeFyersCode(code);

        if (cancelled) return;
        setStatus("FYERS token stored on backend. Redirecting...");
        window.history.replaceState({}, document.title, "/auth/callback");
        setTimeout(() => navigate("/", { replace: true }), 800);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "FYERS callback failed.");
      }
    }

    completeLogin();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="auth-callback">
      <section>
        <h1>FYERS Authentication</h1>
        {error ? <p role="alert">{error}</p> : <p>{status}</p>}
      </section>
    </main>
  );
}
