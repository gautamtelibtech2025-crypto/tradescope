import FyersConnectButton from "../components/FyersConnectButton";
import { buildFyersLoginUrl } from "../lib/fyersAuth";

const appId = import.meta.env.VITE_FYERS_APP_ID || "";
const redirectUri = import.meta.env.VITE_FYERS_REDIRECT_URI || `${window.location.origin}/callback`;

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

      {/* PRIMARY: One-click automated OAuth flow */}
      <section className="auth-section">
        <h2>Connect Your FYERS Account</h2>
        <FyersConnectButton />
      </section>

      {/* SECONDARY: Dev/Legacy manual auth (hidden by default) */}
      {devAuthEnabled ? (
        <section className="dev-section">
          <h3>Dev Mode: Manual Auth</h3>
          <button type="button" onClick={openManualFyersAuth}>
            Open FYERS Dev Auth
          </button>
        </section>
      ) : null}
    </main>
  );
}
