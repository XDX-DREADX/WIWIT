import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

const CITIES = {
  Jakarta: { lat: -6.2088, lon: 106.8456 },
  Surabaya: { lat: -7.2575, lon: 112.7521 },
  Bandung: { lat: -6.9175, lon: 107.6191 },
  Medan: { lat: 3.5952, lon: 98.6722 },
  Bali: { lat: -8.4095, lon: 115.1889 },
  Makassar: { lat: -5.1477, lon: 119.4327 },
  Yogyakarta: { lat: -7.7956, lon: 110.3695 },
};

export default function WeatherWidget() {
  const { language } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [selectedCity, setSelectedCity] = useState("Jakarta");
  const [showModal, setShowModal] = useState(false);

  const getWeatherDescription = (code) => {
    const codes = {
      0: "Cerah",
      1: "Cerah Berawan",
      2: "Berawan",
      3: "Mendung",
      45: "Berkabut",
      48: "Kabut Es",
      51: "Gerimis Ringan",
      53: "Gerimis",
      55: "Gerimis Lebat",
      61: "Hujan Ringan",
      63: "Hujan",
      65: "Hujan Lebat",
      80: "Hujan Lokal",
      95: "Badai Petir",
    };
    return codes[code] || "Berawan";
  };

  const getWeatherIcon = (code) => {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 65) return "🌧️";
    if (code >= 95) return "⚡";
    return "🌡️";
  };

  const fetchWeather = async (cityKey = selectedCity) => {
    setLoading(true);
    try {
      const { lat, lon } = CITIES[cityKey];
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
      );
      const data = await res.json();

      setWeather({
        temp: data.current.temperature_2m,
        code: data.current.weather_code,
        desc: getWeatherDescription(data.current.weather_code),
        icon: getWeatherIcon(data.current.weather_code),
        humidity: data.current.relative_humidity_2m,
      });

      const daily = data.daily;
      const forecastData = daily.time.map((time, index) => ({
        date: time,
        max: daily.temperature_2m_max[index],
        min: daily.temperature_2m_min[index],
        code: daily.weather_code[index],
        icon: getWeatherIcon(daily.weather_code[index]),
        desc: getWeatherDescription(daily.weather_code[index]),
      }));

      setForecast(forecastData);
      setLastRefreshed(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Weather error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(() => fetchWeather(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedCity]);

  const handleRefresh = (e) => {
    e.stopPropagation();
    fetchWeather();
  };

  const handleCityChange = (e) => {
    e.stopPropagation();
    setSelectedCity(e.target.value);
  };

  // Modal Component
  const WeatherModal = () => (
    <div className="weather-modal-overlay" onClick={() => setShowModal(false)}>
      <div className="weather-modal" onClick={(e) => e.stopPropagation()}>
        <div className="weather-modal-header">
          <div>
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              Prakiraan Cuaca - {selectedCity}
            </h3>
            <p className="text-muted" style={{ fontSize: "0.8rem" }}>
              Update:{" "}
              {lastRefreshed?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="btn btn-ghost"
            style={{ fontSize: "1.2rem" }}
          >
            ✕
          </button>
        </div>

        <div className="weather-modal-body">
          {/* Current Weather */}
          <div
            className="flex items-center gap-4 mb-6 p-4"
            style={{ background: "rgba(99,102,241,0.1)", borderRadius: "16px" }}
          >
            <div style={{ fontSize: "4rem" }}>{weather?.icon}</div>
            <div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                {weather?.temp}°C
              </div>
              <div className="text-muted">{weather?.desc}</div>
              <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                Kelembapan: {weather?.humidity}%
              </div>
            </div>
          </div>

          {/* Location & Refresh */}
          <div className="flex justify-between items-center mb-4">
            <select
              value={selectedCity}
              onChange={handleCityChange}
              className="form-select"
              style={{ width: "auto", padding: "8px 12px" }}
            >
              {Object.keys(CITIES).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              className="btn btn-secondary btn-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {/* 7-Day Forecast */}
          <h4 className="font-bold mb-3">Prakiraan 7 Hari</h4>
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}
          >
            {forecast.map((day, idx) => (
              <div
                key={idx}
                className="text-center p-3"
                style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    marginBottom: "6px",
                    color: "var(--text-muted)",
                  }}
                >
                  {new Date(day.date).toLocaleDateString(
                    language === "id" ? "id-ID" : "en-US",
                    { weekday: "short" },
                  )}
                </div>
                <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>
                  {day.icon}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                  {Math.round(day.max)}°
                </div>
                <div
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  {Math.round(day.min)}°
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Compact Widget Card */}
      <div
        className="card widget-weather"
        style={{
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))",
          cursor: "pointer",
        }}
        onClick={() => setShowModal(true)}
      >
        {loading ? (
          <div
            className="flex justify-center items-center h-full text-muted"
            style={{ minHeight: "80px" }}
          >
            Loading...
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div style={{ fontSize: "2.5rem" }}>{weather?.icon}</div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                  {weather?.temp}°C
                </div>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {weather?.desc}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                {selectedCity}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {lastRefreshed?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--primary-400)",
                  marginTop: "4px",
                }}
              >
                Klik untuk detail →
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && <WeatherModal />}
    </>
  );
}
