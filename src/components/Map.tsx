"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useCallback } from "react";
import { MapPin, Navigation, X } from "lucide-react";

// Custom green marker icon
const greenIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:linear-gradient(135deg,#059669,#10b981);
    transform:rotate(-45deg);border:3px solid white;
    box-shadow:0 3px 12px rgba(5,150,105,0.5);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#3b82f6;border:3px solid white;
    box-shadow:0 0 0 6px rgba(59,130,246,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// City → coordinates cache using Nominatim
const geoCache: Record<string, [number, number]> = {};
async function geocodeCity(city: string): Promise<[number, number] | null> {
  if (geoCache[city]) return geoCache[city];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data && data[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geoCache[city] = coords;
      return coords;
    }
  } catch {}
  return null;
}

// Component that flies map to a location
function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

interface MapItem {
  id: string;
  title: string;
  type: string;
  city?: string;
  price?: number;
  image_url?: string;
  co2_impact?: number;
}

interface FullMapProps {
  items: MapItem[];
  onCityFilter: (city: string) => void;
  activeCity: string;
}

export default function FullMap({ items, onCityFilter, activeCity }: FullMapProps) {
  const [pins, setPins] = useState<Array<{ item: MapItem; coords: [number, number] }>>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [cityInput, setCityInput] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  // Geocode all items with a city
  useEffect(() => {
    let cancelled = false;
    const fetchPins = async () => {
      const results: Array<{ item: MapItem; coords: [number, number] }> = [];
      for (const item of items) {
        const cityName = item.city;
        if (!cityName) continue;
        const coords = await geocodeCity(cityName);
        if (coords && !cancelled) {
          // Slightly jitter overlapping pins
          const jitter: [number, number] = [
            coords[0] + (Math.random() - 0.5) * 0.01,
            coords[1] + (Math.random() - 0.5) * 0.01,
          ];
          results.push({ item, coords: jitter });
        }
      }
      if (!cancelled) setPins(results);
    };
    fetchPins();
    return () => { cancelled = true; };
  }, [items]);

  // Get user's location
  const handleNearMe = useCallback(() => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setFlyTarget({ center: coords, zoom: 12 });
        setGeoLoading(false);
      },
      () => {
        alert("Could not get your location. Please allow location access in your browser.");
        setGeoLoading(false);
      }
    );
  }, []);

  // Search by city name
  const handleCitySearch = useCallback(async () => {
    if (!cityInput.trim()) return;
    setGeoLoading(true);
    const coords = await geocodeCity(cityInput.trim());
    if (coords) {
      setFlyTarget({ center: coords, zoom: 11 });
      onCityFilter(cityInput.trim());
    } else {
      alert("City not found. Try a different name.");
    }
    setGeoLoading(false);
  }, [cityInput, onCityFilter]);

  const clearFilter = () => {
    onCityFilter("");
    setCityInput("");
  };

  const priceLabel = (item: MapItem) => {
    if (item.type === "Sell") return item.price ? `₹${item.price}` : "Price TBD";
    if (item.type === "Borrow") return item.price ? `₹${item.price}/day` : "Free to Borrow";
    if (item.type === "Donate") return "Free";
    return "Trade";
  };

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      {/* Map Controls Bar */}
      <div style={{ display: "flex", gap: "0.7rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", flex: 1, minWidth: "220px", borderRadius: "50px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>
          <input
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCitySearch()}
            placeholder="🔍  Search by city (e.g. Mumbai, Delhi)..."
            style={{ flex: 1, padding: "0.6rem 1.2rem", border: "none", background: "transparent", color: "var(--foreground)", fontFamily: "inherit", fontSize: "0.9rem", outline: "none" }}
          />
          <button onClick={handleCitySearch} style={{ padding: "0.6rem 1.2rem", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>
            {geoLoading ? "..." : "Go"}
          </button>
        </div>

        <button onClick={handleNearMe} disabled={geoLoading} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", borderRadius: "50px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", whiteSpace: "nowrap" }}>
          <Navigation size={16} color="var(--primary)" />
          {geoLoading ? "Locating..." : "Near Me"}
        </button>

        {activeCity && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "50px", background: "var(--secondary)", color: "var(--primary)", fontWeight: 600, fontSize: "0.88rem" }}>
            <MapPin size={14} />
            {activeCity}
            <button onClick={clearFilter} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
              <X size={14} color="var(--primary)" />
            </button>
          </div>
        )}

        <span style={{ fontSize: "0.82rem", color: "var(--secondary-foreground)", marginLeft: "auto" }}>
          {pins.length} item{pins.length !== 1 ? "s" : ""} on map
        </span>
      </div>

      {/* Map */}
      <div style={{ height: "420px", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 10px 40px rgba(5,150,105,0.1)" }}>
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">Carto</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {flyTarget && <MapFlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

          {/* User location pin */}
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup><b>📍 You are here</b></Popup>
            </Marker>
          )}

          {/* Item pins */}
          {pins.map(({ item, coords }) => (
            <Marker key={item.id} position={coords} icon={greenIcon}>
              <Popup>
                <div style={{ minWidth: "160px" }}>
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} />
                  )}
                  <b style={{ fontSize: "0.95rem" }}>{item.title}</b>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "50px", fontSize: "0.75rem", fontWeight: 600 }}>{item.type}</span>
                    <span style={{ background: "#f0fdf4", color: "#059669", padding: "2px 8px", borderRadius: "50px", fontSize: "0.75rem", fontWeight: 600 }}>{priceLabel(item)}</span>
                  </div>
                  {item.city && <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "4px" }}>📍 {item.city}</div>}
                  {item.co2_impact && <div style={{ fontSize: "0.78rem", color: "#059669", marginTop: "2px" }}>🌿 Saves ~{item.co2_impact}kg CO₂</div>}
                  <a href={`/marketplace`} style={{ display: "block", marginTop: "8px", background: "#059669", color: "white", textAlign: "center", padding: "5px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>View Details →</a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
