import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSymbolMaster } from "../_shared/fyers.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { exchange = "NSE", limit = 500 } = await req.json();

    let symbols: string[] = [];

    if (exchange === "NSE+BSE") {
      const [nse, bse] = await Promise.all([getSymbolMaster("NSE"), getSymbolMaster("BSE")]);
      symbols = [...new Set([...nse, ...bse])];
    } else {
      symbols = await getSymbolMaster(exchange as "NSE" | "BSE");
    }

    return new Response(
      JSON.stringify({ success: true, symbols: symbols.slice(0, limit), total: symbols.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
