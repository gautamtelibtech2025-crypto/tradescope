const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:10000";
const FYERS_AUTH_BASE = "https://api-t1.fyers.in/api/v3/generate-authcode";

export function getFyersCodeFromUrl(location = window.location) {
  const searchParams = new URLSearchParams(location.search || "");
  const hashParams = new URLSearchParams((location.hash || "").replace(/^#/, ""));

  return (
    searchParams.get("code") ||
    searchParams.get("auth_code") ||
    hashParams.get("code") ||
    hashParams.get("auth_code") ||
    ""
  ).trim();
}

export function buildFyersLoginUrl({ appId, redirectUri, state = "tradescope-dev" }) {
  const url = new URL(FYERS_AUTH_BASE);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeFyersCode(code) {
  const response = await fetch(`${API_BASE_URL}/api/fyers/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "FYERS token exchange failed.");
  }

  return data;
}
