import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { avg, calcEMA, findPivotHighs, findPivotLows } from "../_shared/indicators.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type PatternHit = {
  symbol: string;
  cmp: string;
  pattern: string;
  rim_resistance: string;
  handle_low: string;
  ema_21: string;
  vol_ratio: string;
  signal: string;
};

function detectCupHandle(symbol: string, candles: number[][], params: any): PatternHit | null {
  if (candles.length < 60) return null;

  const closes = candles.map((c) => c[4]);
  const highs = candles.map((c) => c[2]);
  const lows = candles.map((c) => c[3]);
  const vols = candles.map((c) => c[5]);
  const n = candles.length;

  const ltp = closes[n - 1];
  const ema21Arr = calcEMA(closes, 21);
  const ema50Arr = calcEMA(closes, 50);
  const ema21 = ema21Arr[ema21Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];

  if (ltp < (params.min_price ?? 20) || ltp <= ema50) return null;

  const emaRising =
    ema21Arr[ema21Arr.length - 1] > ema21Arr[ema21Arr.length - 2] &&
    ema21Arr[ema21Arr.length - 2] > ema21Arr[ema21Arr.length - 3] &&
    ema21Arr[ema21Arr.length - 3] > ema21Arr[ema21Arr.length - 4];

  if (!emaRising) return null;

  const touchDist = params.touch_dist ?? 2;
  const emaDistPct = Math.abs(((ltp - ema21) / ema21) * 100);
  const bounce = lows[n - 2] <= ema21Arr[ema21Arr.length - 2] && ltp > ema21;
  if (!(emaDistPct <= touchDist || bounce)) return null;

  const avg20Vol = avg(vols.slice(-20));
  const volRatio = vols[n - 1] / avg20Vol;

  const minCup = 7;
  const maxCup = 30;
  const minHandle = 2;
  const maxHandle = 6;
  const rimTol = (params.rim_tol_pct ?? 5) / 100;

  for (let h = minHandle; h <= maxHandle; h++) {
    const rightRimIdx = n - h - 1;
    if (rightRimIdx <= 25) continue;

    const handleLows = lows.slice(rightRimIdx + 1);
    const handleVols = vols.slice(rightRimIdx + 1);
    const handleLow = Math.min(...handleLows);
    const handleAvgVol = avg(handleVols);
    const rightRim = highs[rightRimIdx];

    for (let leftRimIdx = Math.max(0, rightRimIdx - maxCup); leftRimIdx <= rightRimIdx - minCup; leftRimIdx++) {
      const leftRim = highs[leftRimIdx];
      const rimDiff = Math.abs(rightRim - leftRim) / Math.max(rightRim, leftRim);
      if (rimDiff > rimTol) continue;

      const cupLow = Math.min(...lows.slice(leftRimIdx, rightRimIdx + 1));
      const cupLowIdx = lows.indexOf(cupLow, leftRimIdx);
      const rimRef = Math.min(leftRim, rightRim);
      const cupDepth = (rimRef - cupLow) / rimRef;
      if (cupDepth < 0.08 || cupDepth > 0.5) continue;

      const cupSpan = rightRimIdx - leftRimIdx;
      if (cupLowIdx - leftRimIdx < Math.floor(cupSpan * 0.2)) continue;
      if (rightRimIdx - cupLowIdx < Math.floor(cupSpan * 0.2)) continue;

      const leftQuarter = closes[leftRimIdx + Math.floor(cupSpan * 0.25)];
      const rightQuarter = closes[leftRimIdx + Math.floor(cupSpan * 0.75)];
      if (!(cupLow < leftQuarter * 0.95 && cupLow < rightQuarter * 0.95)) continue;

      const handleRetrace = (rightRim - handleLow) / rightRim;
      if (handleRetrace < 0.03 || handleRetrace > 0.35) continue;

      const cupUpperThird = cupLow + (rimRef - cupLow) / 3;
      if (handleLow < cupUpperThird) continue;
      if (handleAvgVol > avg20Vol * 1.3) continue;

      const leftHalfVol = avg(vols.slice(leftRimIdx, cupLowIdx + 1));
      const bottomBandVol = avg(vols.slice(Math.max(leftRimIdx, cupLowIdx - 2), Math.min(rightRimIdx + 1, cupLowIdx + 3)));
      if (!(leftHalfVol > bottomBandVol)) continue;

      const breakoutVol = params.breakout_vol ?? 1.2;
      const breakout = ltp > rightRim * 1.001 && volRatio >= breakoutVol;
      const preBreakout = !breakout && ltp >= handleLow && emaDistPct <= touchDist;
      if (!(breakout || preBreakout)) continue;

      return {
        symbol,
        cmp: ltp.toFixed(2),
        pattern: "Cup & Handle",
        rim_resistance: rightRim.toFixed(2),
        handle_low: handleLow.toFixed(2),
        ema_21: ema21.toFixed(2),
        vol_ratio: volRatio.toFixed(2),
        signal: breakout ? "BREAKOUT" : "PRE-BREAKOUT",
      };
    }
  }

  return null;
}

function detectHeadShoulders(symbol: string, candles: number[][], params: any): PatternHit | null {
  if (candles.length < 55) return null;
  const closes = candles.map((c) => c[4]);
  const highs = candles.map((c) => c[2]);
  const lows = candles.map((c) => c[3]);
  const vols = candles.map((c) => c[5]);
  const n = candles.length;

  const ema21Arr = calcEMA(closes, 21);
  const ema21 = ema21Arr[ema21Arr.length - 1];
  const avg20Vol = avg(vols.slice(-20));
  const volRatio = vols[n - 1] / avg20Vol;

  const pivots = findPivotHighs(highs.slice(-40), 2).map((i) => i + (n - 40));
  if (pivots.length < 3) return null;

  for (let i = 0; i < pivots.length - 2; i++) {
    const p1 = pivots[i], p2 = pivots[i + 1], p3 = pivots[i + 2];
    const h1 = highs[p1], h2 = highs[p2], h3 = highs[p3];
    if (!(h2 > h1 * 1.02 && h2 > h3 * 1.02)) continue;
    if (Math.abs(h1 - h3) / Math.max(h1, h3) > 0.12) continue;

    const neck1 = Math.min(...lows.slice(p1, p2 + 1));
    const neck2 = Math.min(...lows.slice(p2, p3 + 1));
    const neckline = (neck1 + neck2) / 2;

    const ltp = closes[n - 1];
    if (ltp < params.min_price) continue;

    const breakdown = ltp < neckline * 0.995 && volRatio >= 1.2;
    const setup = !breakdown && ltp <= neckline * 1.03;
    if (!(breakdown || setup)) continue;

    return {
      symbol,
      cmp: ltp.toFixed(2),
      pattern: "Head & Shoulders",
      rim_resistance: neckline.toFixed(2),
      handle_low: Math.min(neck1, neck2).toFixed(2),
      ema_21: ema21.toFixed(2),
      vol_ratio: volRatio.toFixed(2),
      signal: breakdown ? "BREAKDOWN" : "SETUP",
    };
  }

  return null;
}

function detectWMPattern(symbol: string, candles: number[][], params: any): PatternHit | null {
  if (candles.length < 45) return null;

  const closes = candles.map((c) => c[4]);
  const highs = candles.map((c) => c[2]);
  const lows = candles.map((c) => c[3]);
  const vols = candles.map((c) => c[5]);
  const n = candles.length;

  const ema21Arr = calcEMA(closes, 21);
  const ema21 = ema21Arr[ema21Arr.length - 1];
  const avg20Vol = avg(vols.slice(-20));
  const volRatio = vols[n - 1] / avg20Vol;
  const ltp = closes[n - 1];
  if (ltp < params.min_price) return null;

  const pivotL = findPivotLows(lows.slice(-35), 2).map((i) => i + (n - 35));
  for (let i = 0; i < pivotL.length - 1; i++) {
    const a = pivotL[i], b = pivotL[i + 1];
    if (b - a < 4 || b - a > 20) continue;
    const l1 = lows[a], l2 = lows[b];
    if (Math.abs(l1 - l2) / Math.max(l1, l2) > 0.05) continue;

    const neckline = Math.max(...highs.slice(a, b + 1));
    const breakout = ltp > neckline * 1.003 && volRatio >= 1.2;
    const setup = !breakout && ltp >= Math.min(l1, l2) && ltp <= neckline;
    if (!(breakout || setup)) continue;

    return {
      symbol,
      cmp: ltp.toFixed(2),
      pattern: "W Pattern",
      rim_resistance: neckline.toFixed(2),
      handle_low: Math.min(l1, l2).toFixed(2),
      ema_21: ema21.toFixed(2),
      vol_ratio: volRatio.toFixed(2),
      signal: breakout ? "BREAKOUT" : "SETUP",
    };
  }

  const pivotH = findPivotHighs(highs.slice(-35), 2).map((i) => i + (n - 35));
  for (let i = 0; i < pivotH.length - 1; i++) {
    const a = pivotH[i], b = pivotH[i + 1];
    if (b - a < 4 || b - a > 20) continue;
    const h1 = highs[a], h2 = highs[b];
    if (Math.abs(h1 - h2) / Math.max(h1, h2) > 0.05) continue;

    const trigger = Math.min(...lows.slice(a, b + 1));
    const breakdown = ltp < trigger * 0.997 && volRatio >= 1.2;
    const setup = !breakdown && ltp <= Math.max(h1, h2) && ltp >= trigger;
    if (!(breakdown || setup)) continue;

    return {
      symbol,
      cmp: ltp.toFixed(2),
      pattern: "M Pattern",
      rim_resistance: trigger.toFixed(2),
      handle_low: Math.max(h1, h2).toFixed(2),
      ema_21: ema21.toFixed(2),
      vol_ratio: volRatio.toFixed(2),
      signal: breakdown ? "BREAKDOWN" : "SETUP",
    };
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const app_id = body.app_id || Deno.env.get("FYERS_APP_ID") || "";
    const access_token = body.access_token || Deno.env.get("FYERS_ACCESS_TOKEN") || "";
    if (!app_id || !access_token) {
      return new Response(JSON.stringify({ success: false, message: "FYERS credentials missing on server." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { symbols = [], params = {} } = body;
    const timeframe = params.timeframe || "D";
    const patternType = params.pattern_type || "cup_handle";
    const lookbackDays = timeframe === "W" ? 3650 : timeframe === "D" ? 1460 : 120;

    const results: PatternHit[] = [];
    let apiFailures = 0;
    let noDataCount = 0;
    let sampleFailure = "";

    for (const sym of symbols) {
      try {
        const data = await getHistoricalData(sym, timeframe, app_id, access_token, lookbackDays);
        if (data.s !== "ok" || !data.candles?.length) {
          const msg = String(data?.message || data?.s || "").toLowerCase();
          if (msg.includes("no_data") || msg.includes("no data")) {
            noDataCount += 1;
            continue;
          }
          apiFailures += 1;
          if (!sampleFailure) sampleFailure = `${sym}: ${data?.message || data?.s || "No candles"}`;
          continue;
        }

        const formatted = String(sym).replace("NSE:", "").replace("BSE:", "").replace("-EQ", "");

        let hit: PatternHit | null = null;
        if (patternType === "cup_handle") hit = detectCupHandle(formatted, data.candles, params);
        if (patternType === "head_shoulders") hit = detectHeadShoulders(formatted, data.candles, params);
        if (patternType === "wm_pattern") hit = detectWMPattern(formatted, data.candles, params);

        if (hit) results.push(hit);
        await sleep(200);
      } catch (err) {
        apiFailures += 1;
        if (!sampleFailure) sampleFailure = `${sym}: ${err instanceof Error ? err.message : String(err)}`;
        continue;
      }
    }

    results.sort((a, b) => parseFloat(b.vol_ratio) - parseFloat(a.vol_ratio));

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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
