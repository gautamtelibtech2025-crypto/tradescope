import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { calcEMA, calcRSI, avg, findPivotHighs, findPivotLows } from "../_shared/indicators.ts";

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

    const {
      timeframe = "D",
      rsi_period = 14,
      setup_type = "RSI above 60 (Momentum)",
      rsi_min = 40,
      rsi_max = 65,
      vol_filter = "Any",
      min_price = 20,
    } = params;

    const results: object[] = [];

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token);
        if (data.s !== "ok" || !data.candles?.length) continue;

        const candles: number[][] = data.candles;
        if (candles.length < Math.max(rsi_period + 5, 30)) continue;

        const closes = candles.map((c) => c[4]);
        const highs  = candles.map((c) => c[2]);
        const lows   = candles.map((c) => c[3]);
        const vols   = candles.map((c) => c[5]);

        const ltp = closes[closes.length - 1];
        if (ltp < min_price) continue;

        const prevClose = closes[closes.length - 2];
        const chgPct = +((ltp - prevClose) / prevClose * 100).toFixed(2);

        const rsi = calcRSI(closes, rsi_period);
        const prevRsi = calcRSI(closes.slice(0, -1), rsi_period);
        const ema21Arr = calcEMA(closes, 21);
        const ema21 = ema21Arr[ema21Arr.length - 1];

        const avgVol = avg(vols.slice(-20));
        const volRatio = +(vols[vols.length - 1] / avgVol).toFixed(2);

        if (vol_filter === "Above Avg" && volRatio < 1) continue;
        if (vol_filter === "2x Avg" && volRatio < 2) continue;

        let matched = false;
        let signal = "NEUTRAL";

        if (setup_type === "Oversold Bounce (<30)") {
          matched = rsi >= 30 && prevRsi < 30;
          signal = matched ? "OVERSOLD BOUNCE" : signal;
        } else if (setup_type === "Overbought (>70)") {
          matched = rsi >= 70;
          signal = matched ? "OVERBOUGHT" : signal;
        } else if (setup_type === "RSI above 60 (Momentum)") {
          matched = rsi >= 60;
          signal = matched ? "MOMENTUM" : signal;
        } else if (setup_type === "RSI crossing 50") {
          matched = prevRsi < 50 && rsi >= 50;
          signal = matched ? "CROSS 50" : signal;
        } else if (setup_type === "Custom Range") {
          matched = rsi >= rsi_min && rsi <= rsi_max;
          signal = matched ? "IN RANGE" : signal;
        } else if (setup_type === "Bullish Divergence") {
          const piv = findPivotLows(lows, 3);
          if (piv.length >= 2) {
            const i1 = piv[piv.length - 2];
            const i2 = piv[piv.length - 1];
            const p1 = lows[i1];
            const p2 = lows[i2];
            const r1 = calcRSI(closes.slice(0, i1 + 1), rsi_period);
            const r2 = calcRSI(closes.slice(0, i2 + 1), rsi_period);
            matched = p2 < p1 && r2 > r1;
            signal = matched ? "BULL DIV" : signal;
          }
        } else if (setup_type === "Bearish Divergence") {
          const piv = findPivotHighs(highs, 3);
          if (piv.length >= 2) {
            const i1 = piv[piv.length - 2];
            const i2 = piv[piv.length - 1];
            const p1 = highs[i1];
            const p2 = highs[i2];
            const r1 = calcRSI(closes.slice(0, i1 + 1), rsi_period);
            const r2 = calcRSI(closes.slice(0, i2 + 1), rsi_period);
            matched = p2 > p1 && r2 < r1;
            signal = matched ? "BEAR DIV" : signal;
          }
        }

        if (!matched) continue;

        const name = sym.replace("NSE:", "").replace("BSE:", "").replace("-EQ", "");
        results.push({
          symbol: name,
          ltp: ltp.toFixed(2),
          change_pct: chgPct,
          rsi: rsi.toFixed(1),
          rsi_signal: signal,
          ema_21: ema21.toFixed(2),
          vol_ratio: volRatio,
          setup: setup_type,
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
