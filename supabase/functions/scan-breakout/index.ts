import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { calcEMA, calcRSI, avg } from "../_shared/indicators.ts";

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

    const { timeframe = "D", cons_period = 10, max_range_pct = 12, bo_vol = 1.5, direction = "Upside", rsi_filter = "Any", ema_filter = "Any", min_price = 20 } = params;

    const results: object[] = [];

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token);
        if (data.s !== "ok" || !data.candles?.length) continue;

        const candles: number[][] = data.candles;
        if (candles.length < cons_period + 5) continue;

        const closes = candles.map((c) => c[4]);
        const vols   = candles.map((c) => c[5]);

        const ltp = closes[closes.length - 1];
        const prevClose = closes[closes.length - 2];
        const chgPct = +((ltp - prevClose) / prevClose * 100).toFixed(2);

        if (ltp < min_price) continue;

        const consCandles = candles.slice(-cons_period - 1, -1);
        const rHigh = Math.max(...consCandles.map((c) => c[2]));
        const rLow  = Math.min(...consCandles.map((c) => c[3]));
        const rangeWidth = (rHigh - rLow) / rLow * 100;

        if (rangeWidth > max_range_pct) continue;

        const isBullBreak = ltp > rHigh * 1.002;
        const isBearBreak = ltp < rLow * 0.998;
        if (direction === "Upside" && !isBullBreak) continue;
        if (direction === "Downside" && !isBearBreak) continue;
        if (direction === "Both" && !isBullBreak && !isBearBreak) continue;

        const avgVol = avg(vols.slice(-20));
        const lastVol = vols[vols.length - 1];
        const volRatio = +(lastVol / avgVol).toFixed(2);
        if (volRatio < bo_vol) continue;

        const ema21Arr = calcEMA(closes, 21);
        const ema21 = ema21Arr[ema21Arr.length - 1];
        if (ema_filter === "Above 21 EMA" && ltp < ema21) continue;

        const rsi = calcRSI(closes);
        if (rsi_filter === "Above 50" && rsi < 50) continue;
        if (rsi_filter === "Above 60" && rsi < 60) continue;
        if (rsi_filter === "Below 50" && rsi > 50) continue;

        const name = sym.replace("NSE:", "").replace("BSE:", "").replace("-EQ", "");
        results.push({
          symbol: name, ltp: ltp.toFixed(2), change_pct: chgPct,
          range_high: rHigh.toFixed(2), range_low: rLow.toFixed(2),
          range_pct: rangeWidth.toFixed(1),
          vol_ratio: volRatio, ema_21: ema21.toFixed(2),
          rsi: rsi.toFixed(1),
          signal: isBullBreak ? "BULL BO" : "BEAR BO",
        });
      } catch (_) { continue; }
      finally { await sleep(250); }
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
