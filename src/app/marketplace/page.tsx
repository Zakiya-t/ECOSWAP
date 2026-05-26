"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type Item } from "@/lib/supabase";
import ItemCard from "@/components/ItemCard";
import LocationMap from "@/components/LocationMap";
import styles from "./page.module.css";
import { Filter, SlidersHorizontal, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const TYPES = ["All", "Swap", "Borrow", "Sell", "Donate"];
const CATEGORIES = ["All Categories", "Electronics", "Books", "Clothing", "Tools", "Furniture", "Garden", "Sports", "Toys", "Other"];

export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("All");
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [sortOrder, setSortOrder] = useState("newest");
  const [search, setSearch] = useState("");
  const [activeCity, setActiveCity] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("items")
      .select("*, profiles(username, full_name, city, rating)")
      .eq("status", "active");

    // Apply Sorting
    if (sortOrder === "price_asc") query = query.order("price", { ascending: true });
    else if (sortOrder === "price_desc") query = query.order("price", { ascending: false });
    else if (sortOrder === "eco_desc") query = query.order("co2_impact", { ascending: false });
    else query = query.order("created_at", { ascending: false }); // newest

    // Apply Filters
    if (activeType !== "All") query = query.eq("type", activeType);
    if (activeCategory !== "All Categories") query = query.eq("category", activeCategory);
    if (search) query = query.ilike("title", `%${search}%`);
    if (activeCity) query = query.ilike("city", `%${activeCity}%`);

    const { data, error } = await query;
    if (!error && data) setItems(data as Item[]);
    setLoading(false);
  }, [activeType, activeCategory, sortOrder, search, activeCity]);

  useEffect(() => {
    fetchItems();

    // ── Real-time subscription: new items appear instantly ──
    const channel = supabase
      .channel("public:items")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "items" }, (payload) => {
        setItems(prev => [payload.new as Item, ...prev]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "items" }, (payload) => {
        setItems(prev => prev.filter(i => i.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Explore the Marketplace</h1>
          <p className={styles.subtitle}>Find, borrow, or swap items in your local community — in real time.</p>
        </div>
        <div style={{ display: "flex", gap: "0.8rem" }}>
          <Link href="/list-item" style={{
            background: "var(--primary)", color: "white", padding: "0.6rem 1.2rem",
            borderRadius: "var(--radius)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem"
          }}>
            <Plus size={18} /> List Item
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 0.5rem' }}>
            <SlidersHorizontal size={16} color="var(--secondary-foreground)" />
            <select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '0.6rem 0.2rem', outline: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
            >
              <option value="newest">Newest First</option>
              <option value="eco_desc">Highest Eco Impact</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 0.5rem' }}>
            <Filter size={16} color="var(--secondary-foreground)" />
            <select 
              value={activeCategory} 
              onChange={e => setActiveCategory(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '0.6rem 0.2rem', outline: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search items..."
        style={{
          width: "100%", padding: "0.8rem 1.2rem", borderRadius: "var(--radius)",
          border: "1px solid var(--border)", background: "var(--surface)",
          color: "var(--foreground)", fontFamily: "inherit", fontSize: "0.95rem",
          marginBottom: "1.5rem", outline: "none",
        }}
      />

      {/* Type filter tabs */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setActiveType(t)} style={{
            padding: "0.45rem 1rem", borderRadius: "50px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
            border: "1.5px solid", transition: "all 0.2s",
            borderColor: activeType === t ? "var(--primary)" : "var(--border)",
            background: activeType === t ? "var(--secondary)" : "transparent",
            color: activeType === t ? "var(--primary)" : "var(--secondary-foreground)",
          }}>{t}</button>
        ))}
      </div>

      {/* Map — fully wired with city filter */}
      <LocationMap items={items} onCityFilter={setActiveCity} activeCity={activeCity} />

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4rem", color: "var(--secondary-foreground)" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginRight: "1rem" }} /> Loading listings…
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--secondary-foreground)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
          <p style={{ fontSize: "1.1rem" }}>No items found. Be the first to <Link href="/list-item" style={{ color: "var(--primary)", fontWeight: 600 }}>list one!</Link></p>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              id={item.id}
              title={item.title}
              type={item.type}
              location={item.city || item.profiles?.city || "Local"}
              price={item.type === "Sell" ? `₹${item.price}` : item.type === "Borrow" ? `₹${item.price}/day` : item.type === "Donate" ? "Free" : "Trade"}
              delay={index * 0.05}
              co2={item.co2_impact}
              imageUrl={item.image_url}
              ownerId={item.user_id}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
