"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Item } from "@/lib/supabase";
import ItemCard from "@/components/ItemCard";
import styles from "./page.module.css";
import { motion } from "framer-motion";
import { Star, Leaf, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";

export default function UserProfile({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");
  
  // Current user logic
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Review Form logic
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    // Fetch Profile
    const { data: profData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single();
    if (profData) setProfile(profData);

    // Fetch Active Items
    const { data: itemsData } = await supabase
      .from("items")
      .select("*, profiles(username, full_name, city, rating)")
      .eq("user_id", params.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (itemsData) setItems(itemsData as Item[]);

    // Fetch Reviews (and reviewer info)
    const { data: revData } = await supabase
      .from("reviews")
      .select("*, reviewer:profiles!reviewer_id(full_name, avatar_url)")
      .eq("reviewed_id", params.id)
      .order("created_at", { ascending: false });
    if (revData) setReviews(revData);

    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("You must be logged in to leave a review.");
      return;
    }
    
    setSubmitting(true);
    
    // Insert Review
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: currentUser.id,
      reviewed_id: params.id,
      rating: ratingInput,
      comment: commentInput
    });
    
    if (error) {
      alert("Error submitting review: " + error.message);
      setSubmitting(false);
      return;
    }

    // Client-side Rating Recalculation
    const currentTotal = reviews.reduce((sum, r) => sum + r.rating, 0);
    const newCount = reviews.length + 1;
    const newAverage = (currentTotal + ratingInput) / newCount;
    
    // Update profile with new average rating
    await supabase.from("profiles").update({
      rating: newAverage
    }).eq("id", params.id);

    setCommentInput("");
    setRatingInput(5);
    await fetchProfileData();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4rem", color: "var(--secondary-foreground)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginRight: "1rem" }} /> Loading profile…
      </div>
    );
  }

  if (!profile) {
    return <div style={{ textAlign: "center", padding: "4rem" }}>User not found.</div>;
  }

  const isOwnProfile = currentUser?.id === params.id;

  return (
    <div className={styles.container}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.profileHeader}>
        <div className={styles.avatar}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            profile.full_name?.charAt(0).toUpperCase() || "?"
          )}
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.name}>{profile.full_name}</h1>
          <div style={{ color: "var(--secondary-foreground)" }}>
            📍 {profile.city || "Local Community Member"}
          </div>
          
          <div className={styles.statsRow}>
            <div className={styles.statBadge} style={{ borderColor: "#fbbf24", color: "#b45309", background: "#fef3c7" }}>
              <Star size={16} fill="currentColor" />
              {Number(profile.rating).toFixed(1)} / 5.0
            </div>
            <div className={styles.statBadge} style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--secondary)" }}>
              <Leaf size={16} />
              {profile.eco_score} Eco Score
            </div>
            <div className={styles.statBadge}>
              📦 {profile.items_swapped || 0} Swaps
            </div>
          </div>
        </div>
        {!isOwnProfile && currentUser && (
          <Link href={`/chat`} style={{ padding: "0.8rem 1.5rem", background: "var(--primary)", color: "white", borderRadius: "50px", fontWeight: 600, textDecoration: "none" }}>
            Message User
          </Link>
        )}
      </motion.div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === "listings" ? styles.active : ""}`}
          onClick={() => setActiveTab("listings")}
        >
          Active Listings ({items.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === "reviews" ? styles.active : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {activeTab === "listings" ? (
        items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--secondary-foreground)" }}>
            This user currently has no active listings.
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
                price={item.type === "Sell" ? `$${item.price}` : item.type === "Borrow" ? `$${item.price}/day` : item.type === "Donate" ? "Free" : "Trade"}
                delay={index * 0.05}
                co2={item.co2_impact}
                imageUrl={item.image_url}
                ownerId={item.user_id}
                currentUserId={currentUser?.id}
              />
            ))}
          </div>
        )
      ) : (
        <div className={styles.reviewList}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--secondary-foreground)" }}>
              No reviews yet.
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {rev.reviewer?.full_name?.charAt(0) || "?"}
                    </div>
                    <span className={styles.reviewer}>{rev.reviewer?.full_name || "Anonymous"}</span>
                  </div>
                  <span className={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
                <div className={styles.stars}>
                  {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                </div>
                {rev.comment && <p className={styles.comment}>{rev.comment}</p>}
              </div>
            ))
          )}

          {!isOwnProfile && currentUser && (
            <form onSubmit={handleReviewSubmit} className={styles.reviewFormCard}>
              <h3 className={styles.formTitle}>Leave a Review for {profile.full_name}</h3>
              <div className={styles.ratingSelect}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={styles.starBtn}
                    onClick={() => setRatingInput(star)}
                  >
                    <Star
                      size={28}
                      fill={star <= ratingInput ? "#fbbf24" : "transparent"}
                      color={star <= ratingInput ? "#fbbf24" : "var(--border)"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className={styles.textarea}
                placeholder="How was your swap experience?"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                required
              />
              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                {submitting ? "Submitting..." : "Post Review"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
