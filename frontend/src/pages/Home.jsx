import { buildFyersLoginUrl } from "../lib/fyersAuth";

const appId = import.meta.env.VITE_FYERS_APP_ID || "";
const redirectUri = import.meta.env.VITE_FYERS_REDIRECT_URI || `${window.location.origin}/auth/callback`;

export default function Home() {
  const devAuthEnabled = new URLSearchParams(window.location.search).get("devAuth") === "1";

  function openManualFyersAuth() {
    if (!appId) {
      alert("Set VITE_FYERS_APP_ID before opening FYERS auth.");
      return;
    }

    window.location.href = buildFyersLoginUrl({
      appId,
      redirectUri,
      state: "tradescope-dev",
    });
  }

  return (
    <main>
      <h1>TradeScope</h1>
      <p>Trading dashboard goes here.</p>

      {devAuthEnabled ? (
        <button type="button" onClick={openManualFyersAuth}>
          Open FYERS Dev Auth
        </button>
      ) : null}
    </main>
  );
}
