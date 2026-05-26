"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Image as ImageIcon, MessageCircle, Info } from "lucide-react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function ItemDetailsPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    const fetchItem = async () => {
      const { data } = await supabase
        .from("items")
        .select("*, profiles(username, full_name, city, rating)")
        .eq("id", params.id)
        .single();
      setItem(data);
      setLoading(false);
    };
    fetchItem();
  }, [params.id]);

  const handleMessage = async () => {
    if (!user) {
      alert("Please sign in to message the owner.");
      router.push("/auth");
      return;
    }
    
    // Check if conversation exists
    const { data: existing } = await supabase.from('conversations')
      .select('*')
      .eq('item_id', item.id)
      .eq('user1_id', user.id)
      .single();

    if (!existing) {
      // Create new conversation
      await supabase.from('conversations').insert({
        item_id: item.id,
        user1_id: user.id,
        user2_id: item.user_id,
        last_message_at: new Date().toISOString()
      });
    }
    
    router.push("/chat");
  };

  if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center' }}>Loading...</div>;
  if (!item) return <div style={{ paddingTop: '100px', textAlign: 'center' }}>Item not found.</div>;

  const owner = item.profiles;
  const isOwner = user?.id === item.user_id;

  return (
    <div className={styles.container}>
      <div className={styles.imageBox}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.title} />
        ) : (
          <ImageIcon size={64} opacity={0.3} />
        )}
      </div>

      <div>
        <div className={styles.badge}>{item.type}</div>
        <h1 className={styles.title}>{item.title}</h1>
        <div className={styles.price}>
          {item.type === "Sell" ? `₹${item.price}` : item.type === "Borrow" ? `₹${item.price}/day` : item.type === "Donate" ? "Free" : "Trade"}
        </div>

        <div className={styles.meta}>
          <div className={styles.metaItem}><MapPin size={18} /> {item.city || owner?.city || "Local"}</div>
          <div className={styles.metaItem} style={{ color: "var(--primary)" }}>🌿 -{item.co2_impact}kg CO₂</div>
          <div className={styles.metaItem}><Info size={18} /> Condition: {item.condition}</div>
        </div>

        <h3 className={styles.sectionTitle}>Description</h3>
        <p className={styles.description}>{item.description}</p>

        <h3 className={styles.sectionTitle}>Listed By</h3>
        <div className={styles.ownerBox}>
          <div className={styles.ownerInfo}>
            <div className={styles.ownerAvatar}>
              {(owner?.full_name || owner?.username || "U")[0].toUpperCase()}
            </div>
            <div>
              <div className={styles.ownerName}>{owner?.full_name || owner?.username || "Eco User"}</div>
              <div className={styles.ownerRating}>⭐ {owner?.rating || "5.0"} Community Rating</div>
            </div>
          </div>
          
          {!isOwner && (
            <button onClick={handleMessage} className={styles.messageBtn}>
              <MessageCircle size={18} /> Message Owner
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
