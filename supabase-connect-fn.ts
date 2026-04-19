import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { fyersGet } from "../_shared/fyers.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { app_id, access_token } = await req.json();
    if (!app_id || !access_token)
      return new Response(JSON.stringify({ success: false, message: "App ID aur Token dono required hain" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });

    const data = await fyersGet("/profile", app_id, access_token);

    if (data.s === "ok") {
      return new Response(
        JSON.stringify({ success: true, name: data.data?.name || "Fyers User", data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, message: data.message || "Invalid credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});