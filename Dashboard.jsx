import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIGURATION ──────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  calendarUrls: [],
  stockSymbols: ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META"],
  cryptoIds: ["bitcoin", "ethereum", "solana", "cardano", "dogecoin", "ripple"],
};

function loadConfig() {
  try {
    const saved = localStorage.getItem("nexus-config");
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_CONFIG;
}
function saveConfig(config) {
  try { localStorage.setItem("nexus-config", JSON.stringify(config)); } catch {}
}

// ─── HELPERS ─────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatTime(date) {
  let h = date.getHours(), m = date.getMinutes(), ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function parseICS(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key) => {
      const regex = new RegExp(`${key}[^:]*:(.+)`, "m");
      const m = block.match(regex);
      return m ? m[1].trim() : "";
    };
    const parseDate = (val) => {
      if (!val) return null;
      if (val.length === 8) return new Date(val.slice(0,4), parseInt(val.slice(4,6))-1, val.slice(6,8));
      try {
        const y = val.slice(0,4), mo = val.slice(4,6), d = val.slice(6,8);
        const h = val.slice(9,11) || "00", mi = val.slice(11,13) || "00", s = val.slice(13,15) || "00";
        if (val.endsWith("Z")) return new Date(Date.UTC(+y, +mo-1, +d, +h, +mi, +s));
        return new Date(+y, +mo-1, +d, +h, +mi, +s);
      } catch { return null; }
    };
    const summary = get("SUMMARY");
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    const location = get("LOCATION");
    if (summary && dtstart) {
      events.push({
        title: summary.replace(/\\,/g, ",").replace(/\\n/g, " "),
        start: parseDate(dtstart),
        end: parseDate(dtend),
        location: location.replace(/\\,/g, ","),
        allDay: dtstart.length === 8,
      });
    }
  }
  return events.filter(e => e.start).sort((a,b) => a.start - b.start);
}

// Weather code to icon/description mapping
function getWeatherInfo(code) {
  if (code === 0) return { icon: "☀️", label: "Clear" };
  if (code === 1) return { icon: "🌤️", label: "Mostly Clear" };
  if (code === 2) return { icon: "⛅", label: "Partly Cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Fog" };
  if (code === 51 || code === 53 || code === 55) return { icon: "🌧️", label: "Drizzle" };
  if (code === 56 || code === 57) return { icon: "🌧️", label: "Freezing Drizzle" };
  if (code === 61 || code === 63 || code === 65) return { icon: "🌧️", label: "Rain" };
  if (code === 66 || code === 67) return { icon: "🌧️", label: "Freezing Rain" };
  if (code === 71 || code === 73 || code === 75) return { icon: "❄️", label: "Snow" };
  if (code === 77) return { icon: "❄️", label: "Snow Grains" };
  if (code === 80 || code === 81 || code === 82) return { icon: "🌦️", label: "Showers" };
  if (code === 85 || code === 86) return { icon: "🌨️", label: "Snow Showers" };
  if (code === 95) return { icon: "⛈️", label: "Thunderstorm" };
  if (code === 96 || code === 99) return { icon: "⛈️", label: "Thunderstorm + Hail" };
  return { icon: "☁️", label: "Cloudy" };
}

// ─── AURORA BACKGROUND ───────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", background: "#0a0a1a" }}>
      <div style={{
        position: "absolute", width: "140%", height: "140%", top: "-20%", left: "-20%",
        background: `
          radial-gradient(ellipse 80% 50% at 20% 40%, rgba(72, 0, 255, 0.25) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 75% 25%, rgba(0, 210, 255, 0.2) 0%, transparent 55%),
          radial-gradient(ellipse 50% 60% at 50% 80%, rgba(255, 0, 128, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse 70% 30% at 85% 70%, rgba(0, 255, 170, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse 90% 40% at 10% 90%, rgba(255, 165, 0, 0.1) 0%, transparent 50%)
        `,
        animation: "auroraShift 25s ease-in-out infinite alternate",
      }}/>
      <style>{`
        @keyframes auroraShift {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(30px, -20px) rotate(2deg) scale(1.02); }
          66% { transform: translate(-20px, 30px) rotate(-1deg) scale(0.98); }
          100% { transform: translate(10px, 10px) rotate(1deg) scale(1.01); }
        }
      `}</style>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat", opacity: 0.5,
      }}/>
    </div>
  );
}

// ─── CLOCK WIDGET ────────────────────────────────────────────────────
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ textAlign: "center", padding: "clamp(6px, 1.5vw, 16px) 0" }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(36px, 7vw, 96px)",
        fontWeight: 700, letterSpacing: "4px",
        background: "linear-gradient(135deg, #00d4ff, #7b2ff7, #ff0080)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0 0 30px rgba(123,47,247,0.3))",
      }}>
        {formatTime(now)}
      </div>
      <div style={{
        fontFamily: "'Outfit', sans-serif", fontSize: "clamp(11px, 1.8vw, 22px)",
        color: "rgba(255,255,255,0.6)", letterSpacing: "3px", textTransform: "uppercase", marginTop: 4,
      }}>
        {formatDate(now)}
      </div>
    </div>
  );
}

// ─── WEATHER WIDGET ──────────────────────────────────────────────────
function WeatherWidget({ weather }) {
  if (!weather || !weather.daily) return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: "clamp(10px, 1.2vw, 16px)",
      border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(12px, 1.5vw, 20px)",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", fontWeight: 600,
        color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14,
      }}>🌤️ Daily Forecast</div>
      <div style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit', sans-serif", fontSize: "clamp(11px, 1vw, 13px)", textAlign: "center", padding: "clamp(10px, 1.5vw, 20px) 0" }}>
        Loading weather...
      </div>
    </div>
  );

  const { daily } = weather;
  const today = new Date();

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: "clamp(10px, 1.2vw, 16px)",
      border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(12px, 1.5vw, 20px)",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", fontWeight: 600,
        color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase", marginBottom: "clamp(10px, 1.2vw, 14px)",
      }}>🌤️ Daily Forecast</div>

      {daily.time.map((date, i) => {
        const d = new Date(date + "T12:00:00");
        const isToday = i === 0;
        const dayLabel = isToday ? "Today" : SHORT_DAYS[d.getDay()];
        const { icon } = getWeatherInfo(daily.weathercode[i]);
        const low = Math.round(daily.temperature_2m_min[i]);
        const high = Math.round(daily.temperature_2m_max[i]);
        const precip = daily.precipitation_probability_max[i];

        // Temperature bar: position relative to the range across all 4 days
        const allLows = daily.temperature_2m_min.map(Math.round);
        const allHighs = daily.temperature_2m_max.map(Math.round);
        const globalMin = Math.min(...allLows);
        const globalMax = Math.max(...allHighs);
        const range = globalMax - globalMin || 1;
        const barLeft = ((low - globalMin) / range) * 100;
        const barWidth = ((high - low) / range) * 100;

        return (
          <div key={i}>
            {i > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0" }}/>}
            <div style={{
              display: "grid", gridTemplateColumns: "clamp(40px, 5vw, 60px) clamp(28px, 3.5vw, 40px) 1fr",
              alignItems: "center", gap: "clamp(6px, 1vw, 12px)",
              padding: "clamp(8px, 1vw, 12px) 0",
            }}>
              {/* Day label */}
              <div style={{
                fontFamily: "'Outfit', sans-serif", fontSize: "clamp(12px, 1.2vw, 16px)", fontWeight: 600,
                color: isToday ? "#00d4ff" : "rgba(255,255,255,0.7)",
              }}>
                {dayLabel}
              </div>

              {/* Weather icon + precip */}
              <div style={{ textAlign: "center", position: "relative" }}>
                <div style={{ fontSize: "clamp(18px, 2vw, 28px)", lineHeight: 1 }}>{icon}</div>
                {precip > 30 && (
                  <div style={{
                    fontFamily: "'Outfit', sans-serif", fontSize: "clamp(8px, 0.7vw, 10px)", fontWeight: 600,
                    color: "#44aaff", marginTop: 1,
                  }}>{precip}%</div>
                )}
              </div>

              {/* Temp range bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 0.8vw, 10px)" }}>
                <span style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: "clamp(12px, 1.2vw, 16px)", fontWeight: 500,
                  color: "rgba(255,255,255,0.5)", minWidth: "clamp(26px, 3vw, 36px)", textAlign: "right",
                }}>{low}°</span>
                <div style={{
                  flex: 1, height: "clamp(4px, 0.4vw, 6px)", borderRadius: 10,
                  background: "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: 0, bottom: 0,
                    left: `${barLeft}%`, width: `${Math.max(barWidth, 5)}%`,
                    borderRadius: 10,
                    background: "linear-gradient(90deg, #44aaff, #00d4ff, #00ffaa)",
                  }}/>
                </div>
                <span style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: "clamp(12px, 1.2vw, 16px)", fontWeight: 600,
                  color: "#fff", minWidth: "clamp(26px, 3vw, 36px)",
                }}>{high}°</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CALENDAR WIDGET (compact — reduced by 2/3) ─────────────────────
function CalendarWidget({ events, loading, onOpenSettings }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
  const upcoming = events.filter(e => e.start >= today && e.start < nextWeek);
  const grouped = {};
  upcoming.forEach(e => {
    const key = e.start.toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const ACCENT_COLORS = ["#00d4ff", "#7b2ff7", "#ff0080", "#00ffaa", "#ffaa00", "#ff4444", "#44aaff"];

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: "clamp(10px, 1.2vw, 16px)",
      border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(10px, 1.2vw, 16px)",
      backdropFilter: "blur(20px)", overflow: "auto",
    }}>
      <div style={{
        fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.9vw, 11px)", fontWeight: 600,
        color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase", marginBottom: "clamp(6px, 0.8vw, 10px)",
      }}>
        📅 Upcoming Events
      </div>

      {loading && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit', sans-serif", fontSize: 12, textAlign: "center", padding: 16 }}>
          <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}>Loading...</div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit', sans-serif", fontSize: 11, textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🗓️</div>
          Add calendar URLs in <span onClick={onOpenSettings} style={{ color: "#00d4ff", cursor: "pointer", textDecoration: "underline" }}>settings</span>
        </div>
      )}

      {Object.entries(grouped).map(([dateStr, dayEvents], di) => {
        const d = new Date(dateStr);
        const isToday = d.toDateString() === today.toDateString();
        return (
          <div key={dateStr} style={{ marginBottom: "clamp(4px, 0.6vw, 8px)" }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.9vw, 11px)", fontWeight: 600,
              color: isToday ? "#00d4ff" : "rgba(255,255,255,0.5)", marginBottom: 3,
            }}>
              {isToday ? "Today" : `${SHORT_DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`}
            </div>
            {dayEvents.map((ev, ei) => (
              <div key={ei} style={{
                display: "flex", gap: 8, padding: "clamp(3px, 0.4vw, 5px) clamp(6px, 0.7vw, 10px)", marginBottom: 3,
                background: "rgba(255,255,255,0.03)", borderRadius: 6,
                borderLeft: `2px solid ${ACCENT_COLORS[(di + ei) % ACCENT_COLORS.length]}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 0.9vw, 12px)", fontWeight: 500,
                    color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {ev.title}
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(8px, 0.7vw, 10px)", color: "rgba(255,255,255,0.35)" }}>
                    {ev.allDay ? "All Day" : formatTime(ev.start)}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── MINI CALENDAR GRID ──────────────────────────────────────────────
function MiniCalendar({ events }) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDates = new Set(events.map(e => e.start?.toDateString()));
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: "clamp(10px, 1.2vw, 16px)",
      border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(12px, 1.5vw, 20px)",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        fontFamily: "'Outfit', sans-serif", fontSize: "clamp(13px, 1.2vw, 16px)", fontWeight: 600,
        color: "#fff", textAlign: "center", marginBottom: 14,
      }}>
        {MONTHS[month]} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {["S","M","T","W","T","F","S"].map((d,i) => (
          <div key={i} style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(8px, 0.8vw, 10px)", color: "rgba(255,255,255,0.3)", padding: 4 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`}/>;
          const isToday = d === now.getDate();
          const dateStr = new Date(year, month, d).toDateString();
          const hasEvent = eventDates.has(dateStr);
          return (
            <div key={i} style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 0.9vw, 12px)", padding: "5px 2px",
              borderRadius: 8, position: "relative",
              background: isToday ? "linear-gradient(135deg, #7b2ff7, #00d4ff)" : "transparent",
              color: isToday ? "#fff" : hasEvent ? "#00d4ff" : "rgba(255,255,255,0.5)",
              fontWeight: isToday ? 700 : hasEvent ? 600 : 400,
            }}>
              {d}
              {hasEvent && !isToday && (
                <div style={{
                  position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)",
                  width: 4, height: 4, borderRadius: "50%", background: "#00d4ff",
                }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STOCK TICKER CRAWL (4x speed) ──────────────────────────────────
function StockTicker({ stocks }) {
  if (!stocks.length) return null;
  const items = [...stocks, ...stocks, ...stocks];
  return (
    <div style={{
      background: "rgba(0,0,0,0.5)", borderTop: "1px solid rgba(255,255,255,0.08)",
      overflow: "hidden", padding: "clamp(6px, 0.8vw, 10px) 0", position: "relative",
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(90deg, rgba(10,10,26,0.9), transparent)", zIndex: 2 }}/>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(270deg, rgba(10,10,26,0.9), transparent)", zIndex: 2 }}/>
      <div style={{
        display: "flex", gap: "clamp(20px, 3vw, 40px)",
        animation: `tickerScroll ${items.length * 0.75}s linear infinite`,
        whiteSpace: "nowrap",
      }}>
        {items.map((s, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "clamp(4px, 0.6vw, 10px)", flexShrink: 0 }}>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", fontWeight: 700, color: "#fff", letterSpacing: 1 }}>{s.symbol}</span>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(11px, 1.1vw, 14px)", color: "rgba(255,255,255,0.8)" }}>${s.price?.toFixed(2)}</span>
            <span style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.9vw, 12px)", fontWeight: 600,
              color: s.change >= 0 ? "#00ffaa" : "#ff4444",
              background: s.change >= 0 ? "rgba(0,255,170,0.1)" : "rgba(255,68,68,0.1)",
              padding: "2px 8px", borderRadius: 20,
            }}>
              {s.change >= 0 ? "▲" : "▼"} {Math.abs(s.changePercent || 0).toFixed(2)}%
            </span>
            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "clamp(12px, 1.2vw, 18px)" }}>│</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
      `}</style>
    </div>
  );
}

// ─── CRYPTO TICKER CRAWL (4x speed) ─────────────────────────────────
function CryptoTicker({ cryptos }) {
  if (!cryptos.length) return null;
  const items = [...cryptos, ...cryptos, ...cryptos];
  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6))",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden", padding: "clamp(6px, 0.8vw, 10px) 0", position: "relative",
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(90deg, rgba(10,10,26,0.9), transparent)", zIndex: 2 }}/>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(270deg, rgba(10,10,26,0.9), transparent)", zIndex: 2 }}/>
      <div style={{
        display: "flex", gap: "clamp(20px, 3vw, 40px)",
        animation: `cryptoScroll ${items.length * 0.875}s linear infinite`,
        whiteSpace: "nowrap",
      }}>
        {items.map((c, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "clamp(4px, 0.6vw, 10px)", flexShrink: 0 }}>
            {c.image && <img src={c.image} alt="" style={{ width: "clamp(14px, 1.4vw, 20px)", height: "clamp(14px, 1.4vw, 20px)", borderRadius: "50%" }}/>}
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(9px, 0.9vw, 12px)", fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>{c.symbol}</span>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(11px, 1.1vw, 14px)", color: "rgba(255,255,255,0.8)" }}>
              ${c.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.9vw, 12px)", fontWeight: 600,
              color: c.change24h >= 0 ? "#00ffaa" : "#ff4444",
              background: c.change24h >= 0 ? "rgba(0,255,170,0.1)" : "rgba(255,68,68,0.1)",
              padding: "2px 8px", borderRadius: 20,
            }}>
              {c.change24h >= 0 ? "▲" : "▼"} {Math.abs(c.change24h || 0).toFixed(2)}%
            </span>
            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "clamp(12px, 1.2vw, 18px)" }}>│</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes cryptoScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
      `}</style>
    </div>
  );
}

// ─── SETTINGS MODAL ──────────────────────────────────────────────────
function SettingsModal({ config, setConfig, onClose }) {
  const [calUrl, setCalUrl] = useState("");
  const [stockInput, setStockInput] = useState(config.stockSymbols.join(", "));
  const [cryptoInput, setCryptoInput] = useState(config.cryptoIds.join(", "));
  const [testStatus, setTestStatus] = useState({});

  const addCal = () => {
    if (calUrl.trim()) {
      let url = calUrl.trim().replace(/^webcal:\/\//, "https://");
      setConfig(c => ({ ...c, calendarUrls: [...c.calendarUrls, url] }));
      setCalUrl("");
    }
  };
  const removeCal = (idx) => setConfig(c => ({ ...c, calendarUrls: c.calendarUrls.filter((_, i) => i !== idx) }));

  const testCal = async (url, idx) => {
    setTestStatus(s => ({ ...s, [idx]: "testing" }));
    try {
      const resp = await fetch(`/api/calendar?url=${encodeURIComponent(url)}`);
      const text = await resp.text();
      const events = parseICS(text);
      setTestStatus(s => ({ ...s, [idx]: `✓ Found ${events.length} events` }));
    } catch {
      setTestStatus(s => ({ ...s, [idx]: "✗ Could not reach calendar" }));
    }
  };

  const saveStocks = () => setConfig(c => ({ ...c, stockSymbols: stockInput.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) }));
  const saveCryptos = () => setConfig(c => ({ ...c, cryptoIds: cryptoInput.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) }));

  const inputStyle = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "'Outfit', sans-serif",
    fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box",
  };
  const btnStyle = {
    background: "linear-gradient(135deg, #7b2ff7, #00d4ff)", border: "none",
    borderRadius: 10, padding: "10px 20px", color: "#fff", fontFamily: "'Outfit', sans-serif",
    fontWeight: 600, fontSize: 14, cursor: "pointer",
  };
  const sectionTitle = {
    fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
    color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, marginTop: 24,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(20px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "rgba(20,20,40,0.95)", borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.1)", padding: "clamp(20px, 3vw, 32px)",
        maxWidth: 520, width: "90%", maxHeight: "85vh", overflow: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(16px, 1.6vw, 20px)", fontWeight: 700,
            background: "linear-gradient(135deg, #00d4ff, #7b2ff7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>⚙ Settings</div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
            width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer",
          }}>✕</button>
        </div>

        <div style={sectionTitle}>Calendar Feeds (iCal / .ics URLs)</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit', sans-serif", marginBottom: 10, lineHeight: 1.5 }}>
          <b style={{ color: "rgba(255,255,255,0.5)" }}>Google:</b> Settings → Calendar → "Secret address in iCal format"<br/>
          <b style={{ color: "rgba(255,255,255,0.5)" }}>Apple:</b> iCloud.com → Calendar → Share → Public Calendar link
        </div>
        {config.calendarUrls.map((url, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{
                flex: 1, fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif",
                background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: 8,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{url}</div>
              <button onClick={() => testCal(url, i)} style={{
                background: "rgba(0,212,255,0.15)", border: "none", borderRadius: 8,
                color: "#00d4ff", padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Outfit', sans-serif",
              }}>Test</button>
              <button onClick={() => removeCal(i)} style={{
                background: "rgba(255,68,68,0.2)", border: "none", borderRadius: 8,
                color: "#ff4444", padding: "4px 10px", cursor: "pointer", fontSize: 12,
              }}>✕</button>
            </div>
            {testStatus[i] && (
              <div style={{ fontSize: 11, fontFamily: "'Outfit', sans-serif", marginTop: 4, marginLeft: 4,
                color: testStatus[i].startsWith("✓") ? "#00ffaa" : testStatus[i] === "testing" ? "#ffaa00" : "#ff4444"
              }}>{testStatus[i]}</div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input placeholder="Paste iCal / .ics / webcal:// URL..." value={calUrl} onChange={e => setCalUrl(e.target.value)}
            style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === "Enter" && addCal()}/>
          <button onClick={addCal} style={btnStyle}>Add</button>
        </div>

        <div style={sectionTitle}>Stock Symbols</div>
        <input value={stockInput} onChange={e => setStockInput(e.target.value)} onBlur={saveStocks}
          placeholder="AAPL, GOOGL, MSFT..." style={inputStyle}/>

        <div style={sectionTitle}>Cryptocurrency IDs</div>
        <input value={cryptoInput} onChange={e => setCryptoInput(e.target.value)} onBlur={saveCryptos}
          placeholder="bitcoin, ethereum, solana..." style={inputStyle}/>

        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={onClose} style={{ ...btnStyle, width: "100%", padding: "14px 20px" }}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── DEMO DATA ───────────────────────────────────────────────────────
const DEMO_STOCKS = [
  { symbol: "AAPL", price: 242.35, change: 3.21, changePercent: 1.34 },
  { symbol: "GOOGL", price: 191.18, change: -1.47, changePercent: -0.76 },
  { symbol: "MSFT", price: 438.92, change: 5.63, changePercent: 1.30 },
  { symbol: "AMZN", price: 225.47, change: 2.89, changePercent: 1.30 },
  { symbol: "TSLA", price: 361.62, change: -8.54, changePercent: -2.31 },
  { symbol: "NVDA", price: 131.28, change: 4.17, changePercent: 3.28 },
  { symbol: "META", price: 719.44, change: 6.32, changePercent: 0.89 },
];
const DEMO_CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", price: 97234.12, change24h: 2.14, image: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png" },
  { symbol: "ETH", name: "Ethereum", price: 2734.88, change24h: -0.89, image: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  { symbol: "SOL", name: "Solana", price: 196.52, change24h: 5.32, image: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  { symbol: "ADA", name: "Cardano", price: 0.812, change24h: 1.27, image: "https://assets.coingecko.com/coins/images/975/small/cardano.png" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.267, change24h: -1.58, image: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png" },
  { symbol: "XRP", name: "Ripple", price: 2.54, change24h: 3.44, image: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png" },
];

// ─── MAIN APP ────────────────────────────────────────────────────────
export default function Dashboard() {
  const [config, setConfig] = useState(loadConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [events, setEvents] = useState([]);
  const [stocks, setStocks] = useState(DEMO_STOCKS);
  const [cryptos, setCryptos] = useState(DEMO_CRYPTOS);
  const [weather, setWeather] = useState(null);
  const [calLoading, setCalLoading] = useState(false);
  const [dataLabel, setDataLabel] = useState("demo");

  useEffect(() => { saveConfig(config); }, [config]);

  // Get user location and fetch weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const resp = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const data = await resp.json();
            if (data?.daily) setWeather(data);
          } catch (e) { console.warn("Weather fetch error:", e); }
        },
        (err) => { console.warn("Geolocation denied:", err.message); }
      );
    }
  }, []);

  const fetchCalendars = useCallback(async () => {
    if (config.calendarUrls.length === 0) { setEvents([]); return; }
    setCalLoading(true);
    const allEvents = [];
    for (const url of config.calendarUrls) {
      try {
        const resp = await fetch(`/api/calendar?url=${encodeURIComponent(url)}`);
        if (resp.ok) { allEvents.push(...parseICS(await resp.text())); }
      } catch (e) { console.warn("Calendar fetch error:", e); }
    }
    setEvents(allEvents);
    setCalLoading(false);
  }, [config.calendarUrls]);

  const fetchStocks = useCallback(async () => {
    try {
      const resp = await fetch(`/api/stocks?symbols=${config.stockSymbols.join(",")}`);
      const data = await resp.json();
      if (data?.quoteResponse?.result?.length) {
        setStocks(data.quoteResponse.result.map(q => ({
          symbol: q.symbol, price: q.regularMarketPrice,
          change: q.regularMarketChange, changePercent: q.regularMarketChangePercent,
        })));
        setDataLabel("live");
      }
    } catch (e) { console.warn("Stock fetch fallback to demo:", e); }
  }, [config.stockSymbols]);

  const fetchCryptos = useCallback(async () => {
    try {
      const resp = await fetch(`/api/crypto?ids=${config.cryptoIds.join(",")}`);
      const data = await resp.json();
      if (Array.isArray(data) && data.length) {
        setCryptos(data.map(c => ({
          symbol: c.symbol?.toUpperCase(), name: c.name, price: c.current_price,
          change24h: c.price_change_percentage_24h, image: c.image,
        })));
        setDataLabel("live");
      }
    } catch (e) { console.warn("Crypto fetch fallback to demo:", e); }
  }, [config.cryptoIds]);

  useEffect(() => { fetchCalendars(); }, [fetchCalendars]);
  useEffect(() => {
    fetchStocks(); fetchCryptos();
    const interval = setInterval(() => { fetchStocks(); fetchCryptos(); }, 60000);
    return () => clearInterval(interval);
  }, [fetchStocks, fetchCryptos]);

  return (
    <div style={{ minHeight: "100vh", height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { font-size: clamp(10px, 1.2vw, 16px); }
        body { margin: 0; padding: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @media (max-width: 900px) {
          .nx-main-grid { grid-template-columns: 1fr !important; }
          .nx-sidebar { max-height: 50vh; overflow-y: auto; }
        }
        @media (max-width: 600px) {
          .nx-topbar { flex-direction: column; gap: 8px; text-align: center; }
          .nx-main-grid { padding: 8px !important; gap: 8px !important; }
        }
        @media (min-width: 1800px) { html { font-size: 18px; } }
        @media (min-width: 2400px) { html { font-size: 22px; } }
      `}</style>
      <AuroraBackground/>

      {/* Top bar */}
      <div className="nx-topbar" style={{
        position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "clamp(6px, 1vw, 14px) clamp(10px, 2vw, 24px)",
        background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)", flexWrap: "wrap", flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(12px, 1.3vw, 16px)", fontWeight: 800,
          background: "linear-gradient(135deg, #00d4ff, #7b2ff7, #ff0080)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 3,
        }}>NEXUS BOARD</div>
        <div style={{ display: "flex", gap: "clamp(6px, 0.8vw, 12px)", alignItems: "center" }}>
          {dataLabel === "demo" && (
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.8vw, 11px)", color: "rgba(255,165,0,0.7)", background: "rgba(255,165,0,0.1)", padding: "3px 10px", borderRadius: 20 }}>DEMO DATA</span>
          )}
          {dataLabel === "live" && (
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.8vw, 11px)", color: "rgba(0,255,170,0.7)", background: "rgba(0,255,170,0.1)", padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ffaa", animation: "pulse 2s infinite" }}/>LIVE
            </span>
          )}
          <button onClick={() => setShowSettings(true)} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "clamp(4px, 0.6vw, 8px) clamp(8px, 1.2vw, 16px)",
            color: "#fff", fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", cursor: "pointer", fontWeight: 500,
          }}>⚙ Settings</button>
        </div>
      </div>

      {/* Stock Ticker */}
      <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
        <StockTicker stocks={stocks}/>
      </div>

      {/* Crypto Ticker — now directly under stocks */}
      <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
        <CryptoTicker cryptos={cryptos}/>
      </div>

      {/* Main Content */}
      <div className="nx-main-grid" style={{
        flex: 1, position: "relative", zIndex: 10, padding: "clamp(8px, 2vw, 24px)",
        display: "grid", gridTemplateColumns: "1fr clamp(200px, 25vw, 380px)",
        gap: "clamp(8px, 1.5vw, 24px)", overflow: "auto", minHeight: 0,
      }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 1.5vw, 24px)", minHeight: 0 }}>
          <ClockWidget/>
          <div style={{ flex: "0 0 auto", maxHeight: "30%", overflow: "auto" }}>
            <CalendarWidget events={events} loading={calLoading} onOpenSettings={() => setShowSettings(true)}/>
          </div>
        </div>

        {/* Right Column */}
        <div className="nx-sidebar" style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 1.5vw, 24px)", minHeight: 0, overflow: "auto" }}>
          <MiniCalendar events={events}/>
          <WeatherWidget weather={weather}/>

          {/* Market Snapshot */}
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: "clamp(10px, 1.2vw, 16px)",
            border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(12px, 1.5vw, 20px)",
            backdropFilter: "blur(20px)", flex: 1, overflow: "auto",
          }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", fontWeight: 600,
              color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14,
            }}>📊 Market Snapshot</div>
            {stocks.slice(0, 5).map((s, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "clamp(4px, 0.6vw, 8px) 0",
                borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(10px, 0.9vw, 12px)", color: "#fff", fontWeight: 600 }}>{s.symbol}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(11px, 1.1vw, 14px)", color: "#fff" }}>${s.price?.toFixed(2)}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.8vw, 11px)", color: s.change >= 0 ? "#00ffaa" : "#ff4444" }}>
                    {s.change >= 0 ? "+" : ""}{s.changePercent?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", fontWeight: 600,
              color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase",
              marginBottom: 14, marginTop: 20,
            }}>🪙 Crypto</div>
            {cryptos.slice(0, 4).map((c, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "clamp(4px, 0.6vw, 8px) 0",
                borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {c.image && <img src={c.image} alt="" style={{ width: "clamp(14px, 1.3vw, 18px)", height: "clamp(14px, 1.3vw, 18px)", borderRadius: "50%" }}/>}
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(10px, 1vw, 13px)", color: "#fff" }}>{c.symbol}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(11px, 1.1vw, 14px)", color: "#fff" }}>
                    ${c.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(9px, 0.8vw, 11px)", color: c.change24h >= 0 ? "#00ffaa" : "#ff4444" }}>
                    {c.change24h >= 0 ? "+" : ""}{c.change24h?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSettings && <SettingsModal config={config} setConfig={setConfig} onClose={() => setShowSettings(false)}/>}
    </div>
  );
}
