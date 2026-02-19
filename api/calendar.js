export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NexusBoard/1.0",
        "Accept": "text/calendar, text/plain, */*",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(response.status).send(`Calendar fetch failed: ${response.statusText}`);
    }

    const text = await response.text();
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).send(text);
  } catch (err) {
    return res.status(500).send(`Error fetching calendar: ${err.message}`);
  }
}
