import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { calcEMA, calcRSI, avg } from "../_shared/indicators.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { app_id, access_token, symbols, params } = await req.json();
    const { timeframe = "D", min_signals = 2, min_price = 50, enabled = ["volume", "ema", "breakout", "rsi"] } = params;

    const results: object[] = [];

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token);
        if (data.s !== "ok" || !data.candles?.length) continue;

        const candles: number[][] = data.candles;
        if (candles.length < 30) continue;

        const closes = candles.map((c) => c[4]);
        const highs  = candles.map((c) => c[2]);
        const lows   = candles.map((c) => c[3]);
        const vols   = candles.map((c) => c[5]);

        const ltp = closes[closes.length - 1];
        const prevClose = closes[closes.length - 2];
        const chgPct = +((ltp - prevClose) / prevClose * 100).toFixed(2);

        if (ltp < min_price) continue;

        const ema21Arr = calcEMA(closes, 21);
        const ema21    = ema21Arr[ema21Arr.length - 1];
        const ema21Prev = ema21Arr[ema21Arr.length - 4];
        const rsi      = calcRSI(closes);
        const avgVol   = avg(vols.slice(-20));
        const lastVol  = vols[vols.length - 1];
        const volRatio = +(lastVol / avgVol).toFixed(2);
        const emaDist  = Math.abs((ltp - ema21) / ema21 * 100);

        const signals: string[] = [];

        if (enabled.includes("volume") && volRatio >= 2) signals.push("VOL SURGE");
        if (enabled.includes("ema") && emaDist <= 1 && ema21 > ema21Prev) signals.push("21 EMA");
        if (enabled.includes("rsi") && rsi >= 50 && rsi <= 70) signals.push("RSI OK");

        // Breakout check
        if (enabled.includes("breakout")) {
          const rHigh = Math.max(...candles.slice(-11, -1).map((c) => c[2]));
          const rLow  = Math.min(...candles.slice(-11, -1).map((c) => c[3]));
          if ((rHigh - rLow) / rLow * 100 < 12 && ltp > rHigh * 1.002 && volRatio > 1.5)
            signals.push("BREAKOUT");
        }

        // W pattern rough check
        if (enabled.includes("double")) {
          const b1 = Math.min(...lows.slice(-25, -15));
          const b2 = Math.min(...lows.slice(-8));
          if (Math.abs(b1 - b2) / b1 < 0.04) signals.push("W PATTERN");
        }

        if (signals.length < min_signals) continue;

        const entry  = ltp.toFixed(2);
        const sl     = (ltp * 0.97).toFixed(2);
        const target = (ltp * 1.08).toFixed(2);
        const score  = Math.min(signals.length * 20, 100);

        const name = sym.replace("NSE:", "").replace("BSE:", "").replace("-EQ", "");
        results.push({
          symbol: name, ltp: entry, change_pct: chgPct,
          signals: signals.join(" + "), score: score + "%",
          ema_21: ema21.toFixed(2), vol_ratio: volRatio,
          rsi: rsi.toFixed(1), entry, sl, target,
        });

        await sleep(300);
      } catch (_) { continue; }
    }

    // Sort by score descending
    results.sort((a: any, b: any) => parseFloat(b.score) - parseFloat(a.score));

    return new Response(JSON.stringify({ success: true, results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});