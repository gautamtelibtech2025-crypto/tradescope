export function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calcRSI(closes: number[], period = 14): number {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + (d > 0 ? d : 0)) / period;
    avgL = (avgL * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  return avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
}

export function calcSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    sma.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return sma;
}

export function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function findPivotHighs(highs: number[], window = 5): number[] {
  const pivots: number[] = [];
  for (let i = window; i < highs.length - window; i++) {
    const slice = highs.slice(i - window, i + window + 1);
    if (highs[i] === Math.max(...slice)) pivots.push(i);
  }
  return pivots;
}

export function findPivotLows(lows: number[], window = 5): number[] {
  const pivots: number[] = [];
  for (let i = window; i < lows.length - window; i++) {
    const slice = lows.slice(i - window, i + window + 1);
    if (lows[i] === Math.min(...slice)) pivots.push(i);
  }
  return pivots;
}