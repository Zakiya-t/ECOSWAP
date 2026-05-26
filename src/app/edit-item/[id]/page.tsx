"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Leaf, Upload } from "lucide-react";
import styles from "../../list-item/page.module.css";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const TYPES = ["Swap", "Borrow", "Sell", "Donate"];
const CATEGORIES = ["Electronics", "Books", "Clothing", "Tools", "Furniture", "Garden", "Sports", "Toys", "Other"];

const CO2_MAP: Record<string, number> = {
  Electronics: 15, Furniture: 25, Tools: 12, Clothing: 7,
  Books: 3, Garden: 8, Sports: 10, Toys: 5, Other: 10,
};

export default function EditItemPage({ params }: { params: { id: string } }) {
  const [selectedType, setSelectedType] = useState("Swap");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchItem = async () => {
      const { data, error } = await supabase.from("items").select("*").eq("id", params.id).single();
      if (data && !error) {
        setTitle(data.title);
        setCategory(data.category);
        setDescription(data.description || "");
        setSelectedType(data.type);
        setCondition(data.condition || "");
        setCity(data.city || "");
        setPrice(data.price?.toString() || "");
        setDeposit(data.deposit?.toString() || "");
        setImageUrl(data.image_url || "");
      }
      setInitialLoad(false);
    };
    fetchItem();
  }, [params.id]);

  const co2Impact = CO2_MAP[category] || 10;

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
    setLoading(true);

    const { error } = await supabase.from("items").update({
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
    }).eq("id", params.id);

    if (!error) {
      // Award +2 Eco Points for updating listing
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('eco_points').eq('id', user.id).single();
        if (profile) {
          await supabase.from('profiles').update({
            eco_points: (profile.eco_points || 0) + 2
          }).eq('id', user.id);
        }
      }
    }

    setLoading(false);
    if (error) {
      alert("Error updating item: " + error.message);
    } else {
      router.push("/dashboard");
    }
  };

  if (initialLoad) return <div style={{ paddingTop: '100px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className={styles.page}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className={styles.pageTitle}>Edit Listing ✏️</h1>
        <p className={styles.pageSubtitle}>Update your item details or change its status.</p>

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
              <input className={styles.input} placeholder="e.g. Downtown, Mumbai" required value={city} onChange={e => setCity(e.target.value)} />
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
            <label className={styles.label}>Photos</label>
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

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Saving…" : "💾 Save Changes"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
