"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div style={{
      height: "420px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "2.5rem",
      color: "var(--secondary-foreground)",
      fontSize: "0.95rem",
    }}>
      🗺️ Loading map...
    </div>
  ),
});

interface LocationMapProps {
  items: any[];
  onCityFilter: (city: string) => void;
  activeCity: string;
}

export default function LocationMap({ items, onCityFilter, activeCity }: LocationMapProps) {
  return <Map items={items} onCityFilter={onCityFilter} activeCity={activeCity} />;
}
