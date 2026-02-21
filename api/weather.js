export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon parameters" });

  try {
    // Open-Meteo is completely free, no API key required
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=4`;
    const response = await fetch(url, {
      headers: { "User-Agent": "NexusBoard/1.0" },
    });
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
