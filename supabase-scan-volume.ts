import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { avg } from "../_shared/indicators.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { app_id, access_token, symbols, params } = await req.json();
    const { timeframe = "D", vol_ratio = 2, avg_period = 20, min_price = 20, min_avg_vol = 100000, direction = "Any" } = params;

    const results: object[] = [];

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token);
        if (data.s !== "ok" || !data.candles?.length) continue;

        const candles: number[][] = data.candles;
        if (candles.length < avg_period + 2) continue;

        const closes = candles.map((c) => c[4]);
        const highs  = candles.map((c) => c[2]);
        const lows   = candles.map((c) => c[3]);
        const vols   = candles.map((c) => c[5]);

        const last     = candles[candles.length - 1];
        const ltp      = last[4];
        const prevClose = candles[candles.length - 2][4];
        const chgPct   = +((ltp - prevClose) / prevClose * 100).toFixed(2);
        const lastVol  = last[5];
        const avgVol   = avg(vols.slice(-avg_period - 1, -1));
        const ratio    = +(lastVol / avgVol).toFixed(2);
        const h52      = Math.max(...highs.slice(-52));
        const l52      = Math.min(...lows.slice(-52));

        if (ltp < min_price) continue;
        if (avgVol < min_avg_vol) continue;
        if (ratio < vol_ratio) continue;
        if (direction === "Bullish" && chgPct < 0) continue;
        if (direction === "Bearish" && chgPct >= 0) continue;

        const name = sym.replace("NSE:", "").replace("BSE:", "").replace("-EQ", "");
        results.push({
          symbol: name, ltp: ltp.toFixed(2), change_pct: chgPct,
          volume: lastVol, avg_vol: Math.round(avgVol), vol_ratio: ratio,
          signal: chgPct >= 0 ? "BULLISH" : "BEARISH",
          high_52w: h52.toFixed(2), low_52w: l52.toFixed(2),
        });

        await sleep(300);
      } catch (_) { continue; }
    }

    return new Response(JSON.stringify({ success: true, results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});