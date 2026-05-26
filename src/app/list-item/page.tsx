"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Leaf, Upload, Navigation } from "lucide-react";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const TYPES = ["Swap", "Borrow", "Sell", "Donate"];
const CATEGORIES = ["Electronics", "Books", "Clothing", "Tools", "Furniture", "Garden", "Sports", "Toys", "Other"];

// CO2 estimates per category (kg)
const CO2_MAP: Record<string, number> = {
  Electronics: 15, Furniture: 25, Tools: 12, Clothing: 7,
  Books: 3, Garden: 8, Sports: 10, Toys: 5, Other: 10,
};

export default function ListItemPage() {
  const [selectedType, setSelectedType] = useState("Swap");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [detectingCity, setDetectingCity] = useState(false);
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const co2Impact = CO2_MAP[category] || 10;

  const detectLocation = () => {
    setDetectingCity(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "";
          setCity(detectedCity);
        } catch {}
        setDetectingCity(false);
      },
      () => {
        alert("Location access denied. Please type your city manually.");
        setDetectingCity(false);
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert("Please upload a photo of the item before publishing.");
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please sign in to list an item.");
      router.push("/auth");
      return;
    }

    const { error } = await supabase.from("items").insert({
      user_id: user.id,
      title,
      description,
      category,
      type: selectedType,
      condition,
      city,
      price: price ? parseFloat(price) : null,
      deposit: deposit ? parseFloat(deposit) : null,
      co2_impact: co2Impact,
      image_url: imageUrl || null,
      status: "active",
    });

    if (!error) {
      // Update user's eco score, eco points, and stats!
      const { data: profile } = await supabase.from('profiles').select('items_swapped, co2_saved, eco_score, eco_points').eq('id', user.id).single();
      if (profile) {
        await supabase.from('profiles').update({
          items_swapped: (profile.items_swapped || 0) + 1,
          co2_saved: (profile.co2_saved || 0) + co2Impact,
          eco_score: Math.min((profile.eco_score || 0) + 5, 100),
          eco_points: (profile.eco_points || 0) + 5
        }).eq('id', user.id);
      }
    }

    setLoading(false);
    if (error) {
      alert("Error listing item: " + error.message);
    } else {
      router.push("/marketplace");
    }
  };

  return (
    <div className={styles.page}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className={styles.pageTitle}>List an Item 📦</h1>
        <p className={styles.pageSubtitle}>Share something you no longer need — reduce waste and help your community.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Item Title *</label>
              <input className={styles.input} placeholder="e.g. Vintage Bicycle" required value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Category *</label>
              <select className={styles.select} required value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description *</label>
            <textarea className={styles.textarea} placeholder="Describe the item, its condition, and any relevant details…" required value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Exchange Type *</label>
            <div className={styles.typeGrid}>
              {TYPES.map(t => (
                <button key={t} type="button"
                  className={`${styles.typeBtn} ${selectedType === t ? styles.selected : ""}`}
                  onClick={() => setSelectedType(t)}>
                  {t === "Swap" && "🔄 "}{t === "Borrow" && "🤝 "}{t === "Sell" && "💰 "}{t === "Donate" && "🎁 "}{t}
                </button>
              ))}
            </div>
          </div>

          {(selectedType === "Sell" || selectedType === "Borrow") && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>{selectedType === "Sell" ? "Asking Price (₹)" : "Rental Price (₹/day)"}</label>
                <input type="number" className={styles.input} placeholder="0.00" min="0" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              {selectedType === "Borrow" && (
                <div className={styles.field}>
                  <label className={styles.label}>Security Deposit (₹)</label>
                  <input type="number" className={styles.input} placeholder="0.00" min="0" value={deposit} onChange={e => setDeposit(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>City / Area *</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className={styles.input}
                  placeholder="e.g. Downtown, Mumbai"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detectingCity}
                  title="Auto-detect my city"
                  style={{
                    padding: "0 1rem", borderRadius: "var(--radius)",
                    border: "1px solid var(--border)", background: "var(--secondary)",
                    color: "var(--primary)", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: "0.4rem", fontWeight: 600,
                    fontSize: "0.85rem", whiteSpace: "nowrap",
                  }}
                >
                  <Navigation size={15} />
                  {detectingCity ? "Detecting..." : "Detect"}
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Condition *</label>
              <select className={styles.select} required value={condition} onChange={e => setCondition(e.target.value)}>
                <option value="">Select condition…</option>
                <option>Like New</option><option>Good</option><option>Fair</option><option>Needs Repair</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Photos *</label>
            <label className={styles.uploadArea} style={{ display: 'block', position: 'relative', overflow: 'hidden' }}>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', opacity: 0, top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }} />
              ) : (
                <>
                  <div className={styles.uploadIcon}><Upload size={32} /></div>
                  <div className={styles.uploadText}>Click to upload a photo</div>
                  <div className={styles.uploadHint}>We'll securely save it to your listing</div>
                </>
              )}
            </label>
          </div>

          <div className={styles.ecoNote}>
            <Leaf size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Eco Impact:</strong> By listing this item instead of discarding it, you could save approx. <strong>~{co2Impact} kg of CO₂</strong>! This will be added to your sustainability dashboard.
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading || !imageUrl} 
            className={styles.submitBtn}
            style={{ 
              opacity: (loading || !imageUrl) ? 0.6 : 1, 
              cursor: (loading || !imageUrl) ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? "Publishing…" : "🌿 Publish Listing"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
