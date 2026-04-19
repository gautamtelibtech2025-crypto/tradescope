import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { avg } from "../_shared/indicators.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const app_id = body.app_id || Deno.env.get("FYERS_APP_ID") || "";
    const access_token = body.access_token || Deno.env.get("FYERS_ACCESS_TOKEN") || "";
    const { symbols, params } = body;
    if (!app_id || !access_token) {
      return new Response(JSON.stringify({ success: false, message: "FYERS credentials missing on server." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const { timeframe = "D", vol_ratio = 2, avg_period = 20, min_price = 20, min_avg_vol = 100000, min_last_vol = 0, direction = "Any" } = params;

    const results: object[] = [];
    let apiFailures = 0;
    let noDataCount = 0;
    let sampleFailure = "";

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token);
        if (data.s !== "ok" || !data.candles?.length) {
          const msg = String(data?.message || data?.s || "").toLowerCase();
          if (msg.includes("no_data") || msg.includes("no data")) {
            noDataCount += 1;
            continue;
          }
          apiFailures += 1;
          if (!sampleFailure) {
            sampleFailure = `${sym}: ${data?.message || data?.s || "No candles"}`;
          }
          continue;
        }

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
        if (lastVol < min_last_vol) continue;
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
      } catch (err) {
        apiFailures += 1;
        if (!sampleFailure) {
          sampleFailure = `${sym}: ${err instanceof Error ? err.message : String(err)}`;
        }
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      count: results.length,
      meta: {
        api_failures: apiFailures,
        no_data_skipped: noDataCount,
        sample_failure: sampleFailure,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
