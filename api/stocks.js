export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "Missing symbols parameter" });

  const symbolList = symbols.split(",").map(s => s.trim().toUpperCase());

  try {
    const results = await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          // Use Yahoo Finance v8 chart endpoint (free, no auth required)
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
          });
          const data = await response.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose;
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;
            return {
              symbol,
              regularMarketPrice: price,
              regularMarketChange: change,
              regularMarketChangePercent: changePercent,
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const filtered = results.filter(Boolean);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({ quoteResponse: { result: filtered } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
