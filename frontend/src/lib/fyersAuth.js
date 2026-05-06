const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:10000";
const FYERS_AUTH_BASE = "https://api-t1.fyers.in/api/v3/generate-authcode";

/**
 * Extract FYERS access token from various input formats
 * Supports: Bearer token, JSON, JWT, direct token
 */
export function extractFyersAccessToken(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if (/^Bearer\s+/i.test(value)) {
    return value.replace(/^Bearer\s+/i, "").trim();
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const token = String(parsed.access_token || parsed.accessToken || "").trim();
      if (token) return token;
    }
  } catch {
    // Non-JSON input is handled below.
  }

  const directMatch = value.match(/(?:^|["'\s,;{])(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)(?:$|["'\s,;}])/);
  if (directMatch) return directMatch[1].trim();

  const explicitMatch = value.match(/(?:access_token|token)\s*[:=]\s*["']?([^"'\s,}]+)["']?/i);
  if (explicitMatch) return explicitMatch[1].trim();

  return value;
}

/**
 * Extract FYERS auth code from callback URL
 * Searches: query params (?code=, ?auth_code=) and hash params (#code=, #auth_code=)
 */
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

/**
 * Build FYERS OAuth login URL
 * User will be redirected to this URL to authorize TradeScope
 */
export function buildFyersLoginUrl({ appId, redirectUri, state = "tradescope-dev" }) {
  const url = new URL(FYERS_AUTH_BASE);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Exchange FYERS auth code for access token
 * Calls backend endpoint which:
 * 1. Validates auth code
 * 2. Calls FYERS API with app ID hash
 * 3. Exchanges code for access_token + refresh_token
 * 4. Stores tokens securely on backend
 * 5. Never exposes tokens to frontend logs/UI
 * 
 * @throws {Error} If exchange fails
 * @returns {Promise<Object>} Response with success flag
 */
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
