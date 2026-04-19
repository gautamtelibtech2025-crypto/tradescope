import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { calcEMA, avg } from "../_shared/indicators.ts";

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

    const { timeframe = "D", ema_period = 21, setup_type = "Price Touching EMA", touch_dist = 0.5, ema_slope = "Any", vol_filter = "Any", min_price = 20 } = params;

    const results: object[] = [];

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token);
        if (data.s !== "ok" || !data.candles?.length) continue;

        const candles: number[][] = data.candles;
        const closes = candles.map((c) => c[4]);
        const vols   = candles.map((c) => c[5]);
        const ltp    = closes[closes.length - 1];
        const prevClose = closes[closes.length - 2];
        const chgPct = +((ltp - prevClose) / prevClose * 100).toFixed(2);

        if (ltp < min_price) continue;

        const ema9   = calcEMA(closes, 9);
        const ema21  = calcEMA(closes, 21);
        const ema50  = calcEMA(closes, 50);
        const ema200 = calcEMA(closes, 200);

        const emaMap: Record<number, number[]> = { 9: ema9, 21: ema21, 50: ema50, 200: ema200 };
        const emaArr = emaMap[ema_period] ?? ema21;
        const emaVal = emaArr[emaArr.length - 1];
        const emaPrev = emaArr[emaArr.length - 4];
        const slope = emaVal > emaPrev ? "Rising" : "Falling";
        const distPct = +((ltp - emaVal) / emaVal * 100).toFixed(2);

        const avgVol = avg(vols.slice(-20));
        const lastVol = vols[vols.length - 1];
        const volRatio = +(lastVol / avgVol).toFixed(2);

        if (ema_slope === "Rising" && slope !== "Rising") continue;
        if (ema_slope === "Falling" && slope !== "Falling") continue;

        if (vol_filter === "Above Avg" && volRatio < 1) continue;
        if (vol_filter === "2x Avg" && volRatio < 2) continue;

        let matched = false;
        if (setup_type === "Price Touching EMA" && Math.abs(distPct) <= touch_dist) matched = true;
        if (setup_type === "Price Bouncing from EMA" && distPct >= 0 && distPct <= 2) matched = true;
        if (setup_type === "EMA Crossover (Bull)") {
          const prev21 = ema21[ema21.length - 2];
          const prev9  = ema9[ema9.length - 2];
          if (ema9[ema9.length - 1] > ema21[ema21.length - 1] && prev9 <= prev21) matched = true;
        }
        if (setup_type === "EMA Crossover (Bear)") {
          const prev21 = ema21[ema21.length - 2];
          const prev9  = ema9[ema9.length - 2];
          if (ema9[ema9.length - 1] < ema21[ema21.length - 1] && prev9 >= prev21) matched = true;
        }
        if (setup_type === "Price Above All EMAs") {
          if (ltp > ema9[ema9.length - 1] && ltp > ema21[ema21.length - 1] && ltp > ema50[ema50.length - 1] && ltp > ema200[ema200.length - 1]) matched = true;
        }
        if (setup_type === "Golden Cross (50/200)") {
          const prev50 = ema50[ema50.length - 2], prev200 = ema200[ema200.length - 2];
          if (ema50[ema50.length - 1] > ema200[ema200.length - 1] && prev50 <= prev200) matched = true;
        }
        if (setup_type === "Death Cross (50/200)") {
          const prev50 = ema50[ema50.length - 2], prev200 = ema200[ema200.length - 2];
          if (ema50[ema50.length - 1] < ema200[ema200.length - 1] && prev50 >= prev200) matched = true;
        }

        if (!matched) continue;

        const name = sym.replace("NSE:", "").replace("BSE:", "").replace("-EQ", "");
        results.push({
          symbol: name, ltp: ltp.toFixed(2), change_pct: chgPct,
          ema_value: emaVal.toFixed(2), distance_pct: distPct,
          ema_slope: slope, vol_ratio: volRatio, setup: setup_type,
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
