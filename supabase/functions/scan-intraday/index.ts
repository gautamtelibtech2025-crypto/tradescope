import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getHistoricalData } from "../_shared/fyers.ts";
import { avg, calcRSI } from "../_shared/indicators.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FO_MCAP_CR: Record<string, number> = {
  ADANIENT: 355000,
  ADANIPORTS: 300000,
  APOLLOHOSP: 96000,
  ASIANPAINT: 290000,
  AXISBANK: 380000,
  BAJAJ_AUTO: 270000,
  BAJAJFINSV: 300000,
  BAJFINANCE: 430000,
  BEL: 245000,
  BHARTIARTL: 910000,
  BPCL: 135000,
  BRITANNIA: 140000,
  CANBK: 86000,
  CIPLA: 120000,
  COALINDIA: 320000,
  DLF: 210000,
  DRREDDY: 115000,
  EICHERMOT: 145000,
  GAIL: 140000,
  GODREJCP: 120000,
  GRASIM: 180000,
  HCLTECH: 430000,
  HDFCBANK: 1200000,
  HDFCLIFE: 135000,
  HEROMOTOCO: 92000,
  HINDALCO: 135000,
  HINDUNILVR: 560000,
  ICICIBANK: 830000,
  INDUSINDBK: 110000,
  INFY: 660000,
  ITC: 560000,
  JINDALSTEL: 76000,
  JSWSTEEL: 230000,
  KOTAKBANK: 350000,
  LT: 520000,
  MANDM: 360000,
  MARUTI: 400000,
  NTPC: 380000,
  ONGC: 360000,
  PFC: 150000,
  POWERGRID: 300000,
  RELIANCE: 2000000,
  SBIN: 760000,
  SHRIRAMFIN: 125000,
  SUNPHARMA: 430000,
  TATACONSUM: 115000,
  TATAMOTORS: 320000,
  TATASTEEL: 210000,
  TCS: 1320000,
  TECHM: 150000,
  TITAN: 310000,
  ULTRACEMCO: 380000,
  VEDL: 160000,
  WIPRO: 330000,
  ZOMATO: 170000,
};

function normalizeSymbol(sym: string): string {
  return String(sym).replace("NSE:", "").replace("BSE:", "").replace("-EQ", "").trim().toUpperCase();
}

function istDateKey(epochSec: number): string {
  const d = new Date((epochSec + 19800) * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcAtrPercent(dailyCandles: number[][], period = 14): number {
  if (dailyCandles.length < period + 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < dailyCandles.length; i++) {
    const high = dailyCandles[i][2];
    const low = dailyCandles[i][3];
    const prevClose = dailyCandles[i - 1][4];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  const atr = avg(trs.slice(-period));
  const ltp = dailyCandles[dailyCandles.length - 1][4];
  return ltp > 0 ? (atr / ltp) * 100 : 0;
}

function calcSessionVwap(candles: number[][]): number {
  let tpv = 0;
  let vol = 0;
  for (const c of candles) {
    const typical = (c[2] + c[3] + c[4]) / 3;
    tpv += typical * c[5];
    vol += c[5];
  }
  return vol > 0 ? tpv / vol : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const app_id = body.app_id || Deno.env.get("FYERS_APP_ID") || "";
    const access_token = body.access_token || Deno.env.get("FYERS_ACCESS_TOKEN") || "";
    const { symbols = [], params = {} } = body;

    if (!app_id || !access_token) {
      return new Response(JSON.stringify({ success: false, message: "FYERS credentials missing on server." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const {
      vol_ratio_min = 2,
      min_volume = 5000000,
      first_hour_move = 1.5,
      atr_min = 1.8,
      min_price = 100,
      max_price = 2500,
      min_mcap_cr = 5000,
      rsi_period = 14,
      rsi_min = 35,
      rsi_max = 70,
      require_gap_or_first_hour = true,
    } = params;

    const todayKey = istDateKey(Math.floor(Date.now() / 1000));
    const results: object[] = [];
    let apiFailures = 0;
    let noDataCount = 0;
    let sampleFailure = "";

    for (const sym of symbols) {
      try {
        const name = normalizeSymbol(sym);
        const mcapCr = FO_MCAP_CR[name];
        if (!mcapCr || mcapCr < min_mcap_cr) continue;

        const [dailyData, intradayData] = await Promise.all([
          getHistoricalData(sym, "D", app_id, access_token, 400),
          getHistoricalData(sym, "15", app_id, access_token, 20),
        ]);

        if (dailyData.s !== "ok" || !dailyData.candles?.length || intradayData.s !== "ok" || !intradayData.candles?.length) {
          const msg = String(dailyData?.message || intradayData?.message || dailyData?.s || intradayData?.s || "").toLowerCase();
          if (msg.includes("no_data") || msg.includes("no data")) {
            noDataCount += 1;
            continue;
          }
          apiFailures += 1;
          if (!sampleFailure) sampleFailure = `${sym}: ${dailyData?.message || intradayData?.message || "No candles"}`;
          continue;
        }

        const dCandles: number[][] = dailyData.candles;
        if (dCandles.length < 30) continue;

        const lastDaily = dCandles[dCandles.length - 1];
        const prevDaily = dCandles[dCandles.length - 2];
        const ltp = lastDaily[4];
        const openToday = lastDaily[1];
        const prevClose = prevDaily[4];
        const volumeToday = lastDaily[5];

        if (ltp < min_price || ltp > max_price) continue;

        const avg10Vol = avg(dCandles.slice(-11, -1).map((c) => c[5]));
        const volRatio = volumeToday / avg10Vol;
        if (volumeToday < min_volume || volRatio < vol_ratio_min) continue;

        const gapPct = ((openToday - prevClose) / prevClose) * 100;
        const atrPct = calcAtrPercent(dCandles, 14);
        if (atrPct < atr_min) continue;

        const iCandles: number[][] = intradayData.candles;
        const todayIntraday = iCandles.filter((c) => istDateKey(c[0]) === todayKey);
        if (todayIntraday.length < 4) continue;

        const firstHourOpen = todayIntraday[0][1];
        const firstHourClose = todayIntraday[Math.min(3, todayIntraday.length - 1)][4];
        const firstHourPct = ((firstHourClose - firstHourOpen) / firstHourOpen) * 100;
        const firstHourPass = Math.abs(firstHourPct) >= first_hour_move;
        const gapPass = Math.abs(gapPct) >= first_hour_move;
        if (require_gap_or_first_hour && !(firstHourPass || gapPass)) continue;

        const closes15 = iCandles.map((c) => c[4]);
        if (closes15.length < rsi_period + 5) continue;
        const rsi = calcRSI(closes15, rsi_period);
        if (rsi < rsi_min || rsi > rsi_max) continue;

        const vwap = calcSessionVwap(todayIntraday);
        if (!vwap) continue;
        const lastPrice = todayIntraday[todayIntraday.length - 1][4];
        const vwapBias = lastPrice >= vwap ? "ABOVE VWAP" : "BELOW VWAP";

        const changePct = ((ltp - prevClose) / prevClose) * 100;
        const direction = changePct >= 0 ? "LONG" : "SHORT";

        results.push({
          symbol: name,
          ltp: ltp.toFixed(2),
          change_pct: changePct.toFixed(2),
          first_hour_pct: firstHourPct.toFixed(2),
          gap_pct: gapPct.toFixed(2),
          volume: Math.round(volumeToday),
          avg10_volume: Math.round(avg10Vol),
          vol_ratio: volRatio.toFixed(2),
          atr_pct: atrPct.toFixed(2),
          rsi_15m: rsi.toFixed(1),
          vwap: vwap.toFixed(2),
          vwap_bias: vwapBias,
          market_cap_cr: mcapCr,
          signal: direction,
        });

        await sleep(180);
      } catch (err) {
        apiFailures += 1;
        if (!sampleFailure) sampleFailure = `${sym}: ${err instanceof Error ? err.message : String(err)}`;
        continue;
      }
    }

    results.sort((a: any, b: any) => {
      const av = Math.abs(parseFloat(a.first_hour_pct));
      const bv = Math.abs(parseFloat(b.first_hour_pct));
      return bv - av;
    });

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
