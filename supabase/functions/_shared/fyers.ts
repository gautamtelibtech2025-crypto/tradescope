const FYERS_BASE = "https://api-t1.fyers.in/api/v3";

export async function fyersGet(endpoint: string, appId: string, token: string) {
  const res = await fetch(`${FYERS_BASE}${endpoint}`, {
    headers: { Authorization: `${appId}:${token}` },
  });
  return res.json();
}

export async function getHistoricalData(
  symbol: string,
  resolution: string,
  appId: string,
  token: string,
  lookbackDays = 365
) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - lookbackDays * 24 * 3600;
  const encodedSymbol = encodeURIComponent(symbol);
  const encodedResolution = encodeURIComponent(resolution);
  const url = `https://api-t1.fyers.in/data/history?symbol=${encodedSymbol}&resolution=${encodedResolution}&date_format=0&range_from=${from}&range_to=${to}&cont_flag=1`;
  const maxRetries = 3;
  let lastBody = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `${appId}:${token}` },
    });

    const bodyText = await res.text();
    lastBody = bodyText;

    let parsed: any = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = { s: "error", message: bodyText };
    }

    const msg = String(parsed?.message || "").toLowerCase();
    const rateLimited = res.status === 429 || msg.includes("request limit") || msg.includes("too many requests");

    if (!rateLimited || attempt === maxRetries) {
      return parsed;
    }

    const waitMs = 1200 * (attempt + 1);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  return { s: "error", message: lastBody || "FYERS history request failed" };
}

export async function getSymbolMaster(exchange: "NSE" | "BSE"): Promise<string[]> {
  const res = await fetch(`https://public.fyers.in/sym_details/${exchange}_CM.csv`);
  const text = await res.text();
  return text
    .split("\n")
    .slice(1)
    .filter((l) => l.includes("EQ"))
    .map((l) => l.split(",")[13]?.trim())
    .map((sym) => {
      if (!sym) return "";
      if (sym.includes(":")) return sym;
      return `${exchange}:${sym.endsWith("-EQ") ? sym : `${sym}-EQ`}`;
    })
    .filter(Boolean) as string[];
}
