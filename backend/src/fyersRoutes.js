import crypto from "node:crypto";
import express from "express";
import {
  getFyersAccessToken,
  getFyersTokenState,
  hasFyersAccessToken,
  saveFyersToken,
} from "./fyersTokenStore.js";

const router = express.Router();
const FYERS_BASE_URL = "https://api-t1.fyers.in/api/v3";

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function getRequiredFyersConfig(appIdOverride) {
  const appId = String(appIdOverride || process.env.FYERS_APP_ID || "").trim();
  const secretId = String(process.env.FYERS_SECRET_ID || "").trim();

  if (!appId || !secretId) {
    const error = new Error("FYERS_APP_ID and FYERS_SECRET_ID must be configured on the backend.");
    error.status = 500;
    throw error;
  }

  return { appId, secretId };
}

router.get("/login-url", (req, res, next) => {
  try {
    const { appId } = getRequiredFyersConfig(req.query.app_id);
    const redirectUri = String(process.env.FYERS_REDIRECT_URI || "").trim();

    if (!redirectUri) {
      return res.status(500).json({
        success: false,
        message: "FYERS_REDIRECT_URI must be configured on the backend.",
      });
    }

    const url = new URL(`${FYERS_BASE_URL}/generate-authcode`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", String(req.query.state || "tradescope-dev"));

    res.json({ success: true, auth_url: url.toString(), redirect_uri: redirectUri });
  } catch (error) {
    next(error);
  }
});

// Non-sensitive debug endpoint to check backend FYERS config presence (does NOT expose secrets)
router.get('/debug', (req, res) => {
  const appIdConfigured = Boolean(process.env.FYERS_APP_ID || getFyersTokenState().appId);
  const redirectConfigured = Boolean(process.env.FYERS_REDIRECT_URI);
  const frontendOrigin = process.env.FRONTEND_ORIGIN || null;
  const tokenState = getFyersTokenState();

  res.json({
    success: true,
    fyers_app_id_present: appIdConfigured,
    redirect_uri_configured: redirectConfigured,
    frontend_origin: frontendOrigin,
    token_stored: hasFyersAccessToken(),
    token_updated_at: tokenState.updatedAt || null,
  });
});

router.post("/token", async (req, res, next) => {
  try {
    const authCode = String(req.body?.code || req.body?.auth_code || "").trim();
    const { appId, secretId } = getRequiredFyersConfig(req.body?.app_id);

    if (!authCode) {
      return res.status(400).json({
        success: false,
        message: "FYERS auth code is required.",
        hint: "Auth code must be provided in request body as 'code' or 'auth_code'.",
      });
    }

    // Validate code format (should be alphanumeric, typically 20-40 chars)
    if (!/^[a-zA-Z0-9\-_]+$/.test(authCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FYERS auth code format.",
        hint: "Auth code should be alphanumeric.",
      });
    }

    if (authCode.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Auth code appears too short.",
        hint: "FYERS auth codes are typically 20+ characters.",
      });
    }

    // Generate hash and exchange code with FYERS
    const appIdHash = sha256Hex(`${appId}:${secretId}`);

    let fyersResponse;
    let text;
    try {
      fyersResponse = await fetch(`${FYERS_BASE_URL}/validate-authcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          appIdHash,
          code: authCode,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      text = await fyersResponse.text();
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") {
        return res.status(504).json({
          success: false,
          message: "FYERS API request timed out.",
          hint: "The request to FYERS took too long. Please try again.",
        });
      }
      throw fetchErr;
    }

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { s: "error", message: text || "FYERS returned a non-JSON response." };
    }

    // Handle various FYERS error responses
    if (!fyersResponse.ok) {
      const errorMsg = data.message || data.error || "FYERS API returned an error.";
      
      // Common FYERS error codes
      if (errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("expired")) {
        return res.status(400).json({
          success: false,
          message: "Authorization code expired or invalid.",
          hint: "Auth codes expire within 5-10 minutes. Please start the OAuth flow again.",
          fyers_error: errorMsg,
        });
      }

      if (errorMsg.toLowerCase().includes("invalid_client")) {
        return res.status(400).json({
          success: false,
          message: "Invalid FYERS client configuration.",
          hint: "Check that FYERS_APP_ID and FYERS_SECRET_ID are correct.",
          fyers_error: errorMsg,
        });
      }

      return res.status(fyersResponse.status).json({
        success: false,
        message: errorMsg,
        fyers_status: fyersResponse.status,
      });
    }

    // Check for successful response
    if (data.s !== "ok" || !data.access_token) {
      return res.status(400).json({
        success: false,
        message: data.message || "FYERS token exchange failed - no access token returned.",
        fyers_response_status: data.s,
      });
    }

    // Success! Save token securely on backend
    saveFyersToken({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      appId,
      raw: data,
    });

    const payload = {
      success: true,
      app_id: appId,
      token_stored: true,
      updated_at: getFyersTokenState().updatedAt,
    };

    // Only return tokens if explicitly enabled (for testing)
    if (process.env.FYERS_RETURN_TOKEN === "true") {
      payload.access_token = data.access_token;
      payload.refresh_token = data.refresh_token || "";
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get("/token/status", (_req, res) => {
  const state = getFyersTokenState();
  res.json({
    success: true,
    token_available: hasFyersAccessToken(),
    app_id: state.appId || process.env.FYERS_APP_ID || "",
    updated_at: state.updatedAt,
  });
});

router.get("/profile", async (_req, res, next) => {
  try {
    const appId = process.env.FYERS_APP_ID || getFyersTokenState().appId;
    const accessToken = getFyersAccessToken();

    if (!appId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "FYERS token is not available. Complete /auth/callback first.",
      });
    }

    const fyersResponse = await fetch(`${FYERS_BASE_URL}/profile`, {
      headers: { Authorization: `${appId}:${accessToken}` },
    });
    const data = await fyersResponse.json();

    res.status(fyersResponse.ok ? 200 : fyersResponse.status).json({
      success: fyersResponse.ok && data.s === "ok",
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
