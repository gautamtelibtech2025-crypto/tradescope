import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FYERS_BASE = "https://api-t1.fyers.in/api/v3";

async function sha256Hex(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const appId = String(body.app_id || Deno.env.get("FYERS_APP_ID") || "").trim();
    const secretId = String(Deno.env.get("FYERS_SECRET_ID") || "").trim();
    const authCode = String(body.auth_code || body.code || "").trim();

    if (!appId || !secretId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "FYERS_APP_ID/FYERS_SECRET_ID server secrets missing.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    if (!authCode) {
      return new Response(
        JSON.stringify({ success: false, message: "FYERS auth_code missing." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const appIdHash = await sha256Hex(`${appId}:${secretId}`);
    const fyersRes = await fetch(`${FYERS_BASE}/validate-authcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        appIdHash,
        code: authCode,
      }),
    });

    const text = await fyersRes.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { s: "error", message: text || "Invalid FYERS response" };
    }

    if (!fyersRes.ok || !data.access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(data.message || `FYERS token request failed (${fyersRes.status})`),
          data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: fyersRes.ok ? 400 : fyersRes.status },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        app_id: appId,
        access_token: data.access_token,
        refresh_token: data.refresh_token || "",
        data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
