"use client";

import { MapPin, Image as ImageIcon, User } from "lucide-react";
import styles from "./ItemCard.module.css";
import { motion } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ItemProps {
  id: string;
  title: string;
  type: "Swap" | "Borrow" | "Sell" | "Free" | "Donate";
  location: string;
  price?: string;
  delay?: number;
  co2?: number;
  imageUrl?: string;
  ownerId?: string;
  currentUserId?: string;
}

export default function ItemCard({ id, title, type, location, price, delay = 0, co2, imageUrl, ownerId, currentUserId }: ItemProps) {
  const isOwner = ownerId === currentUserId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this listing?")) return;
    await supabase.from('items').delete().eq('id', id);
    // Realtime subscription in Marketplace will automatically remove it!
  };
  return (
    <motion.div 
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className={styles.badge}>{type}</div>
      <div className={styles.imagePlaceholder}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ImageIcon size={40} opacity={0.5} />
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.location}>
          <MapPin size={16} />
          {location}
        </div>
        <div className={styles.footer}>
          <span className={styles.price}>{price || "Free"}</span>
          {co2 && <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>🌿 -{co2}kg CO₂</span>}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {ownerId && (
              <Link href={`/user/${ownerId}`}>
                <button className={styles.actionBtn} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <User size={16} />
                </button>
              </Link>
            )}
            <Link href={`/item/${id}`}>
              <button className={styles.actionBtn}>View Details</button>
            </Link>
          </div>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <Link href={`/edit-item/${id}`} style={{ flex: 1 }}>
              <button className={styles.actionBtn} style={{ width: '100%', background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>Edit</button>
            </Link>
            <button onClick={handleDelete} className={styles.actionBtn} style={{ flex: 1, background: '#fee2e2', color: '#dc2626' }}>Delete</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
