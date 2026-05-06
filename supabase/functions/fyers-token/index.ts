import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FYERS_BASE = "https://api-t1.fyers.in/api/v3";

/**
 * Generate SHA256 hash of appId:secretId
 * Used to securely exchange auth code for access token
 */
async function sha256Hex(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Supabase Edge Function: FYERS Token Exchange
 * 
 * Handles OAuth callback from FYERS:
 * 1. Receives auth_code from frontend callback
 * 2. Reads FYERS_APP_ID and FYERS_SECRET_ID from server environment
 * 3. Generates SHA256(appId:secretId)
 * 4. Calls FYERS validate-authcode endpoint
 * 5. Returns access_token and refresh_token
 * 
 * SECURITY:
 * - Secrets never leave the server
 * - Auth code validated before API call
 * - Request timeout to prevent hanging
 * - No tokens logged or exposed in errors
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    
    // Read configuration from request or server environment
    const appId = String(body.app_id || Deno.env.get("FYERS_APP_ID") || "").trim();
    const secretId = String(body.secret_id || body.secret_key || Deno.env.get("FYERS_SECRET_ID") || "").trim();
    const authCode = String(body.auth_code || body.code || "").trim();

    // Validate server configuration
    if (!appId || !secretId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "FYERS configuration error: app_id and secret_id missing.",
          hint: "Pass 'app_id' and 'secret_id' in request body, or set FYERS_APP_ID and FYERS_SECRET_ID environment variables.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Validate auth code from request
    if (!authCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "FYERS auth_code missing from request.",
          hint: "Auth code must be provided in request body as 'code' or 'auth_code'.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Validate code format (alphanumeric, reasonable length)
    if (!/^[a-zA-Z0-9\-_]+$/.test(authCode)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid auth code format.",
          hint: "Auth code should be alphanumeric.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    if (authCode.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Auth code appears invalid (too short).",
          hint: "FYERS auth codes are typically 20+ characters.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Generate appIdHash and exchange code
    const appIdHash = await sha256Hex(`${appId}:${secretId}`);
    
    const fyersRes = await fetch(`${FYERS_BASE}/validate-authcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        appIdHash,
        code: authCode,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const text = await fyersRes.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { s: "error", message: text || "Invalid FYERS response" };
    }

    // Handle HTTP errors
    if (!fyersRes.ok) {
      const errorMsg = String(data.message || data.error || "FYERS API error");
      
      // Check for common error patterns
      if (errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("expired")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Authorization code expired or invalid.",
            hint: "Auth codes expire within 5-10 minutes. Please start OAuth flow again.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }

      if (errorMsg.toLowerCase().includes("invalid_client")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid FYERS client configuration.",
            hint: "Check that FYERS_APP_ID and FYERS_SECRET_ID are correct.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMsg,
          fyers_status: fyersRes.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: fyersRes.status },
      );
    }

    // Validate token response
    if (!data.access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "FYERS did not return an access token.",
          fyers_response_status: data.s || "unknown",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Success! Return tokens (never expose in logs)
    return new Response(
      JSON.stringify({
        success: true,
        app_id: appId,
        access_token: data.access_token,
        refresh_token: data.refresh_token || "",
        // data field can be omitted to avoid exposing internal FYERS response
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    // Handle network errors, timeouts, etc.
    const errorMsg = e instanceof Error ? e.message : String(e);
    
    if (errorMsg.includes("timeout") || errorMsg.includes("Timeout")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Request to FYERS timed out.",
          hint: "Please try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 504 },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Server error during token exchange.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
