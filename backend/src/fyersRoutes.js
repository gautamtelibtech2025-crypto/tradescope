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

router.post("/token", async (req, res, next) => {
  try {
    const authCode = String(req.body?.code || req.body?.auth_code || "").trim();
    const { appId, secretId } = getRequiredFyersConfig(req.body?.app_id);

    if (!authCode) {
      return res.status(400).json({ success: false, message: "FYERS auth code is required." });
    }

    const appIdHash = sha256Hex(`${appId}:${secretId}`);
    const fyersResponse = await fetch(`${FYERS_BASE_URL}/validate-authcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        appIdHash,
        code: authCode,
      }),
    });

    const text = await fyersResponse.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { s: "error", message: text || "FYERS returned a non-JSON response." };
    }

    if (!fyersResponse.ok || data.s !== "ok" || !data.access_token) {
      return res.status(fyersResponse.ok ? 400 : fyersResponse.status).json({
        success: false,
        message: data.message || "FYERS token exchange failed.",
        fyers: data,
      });
    }

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
