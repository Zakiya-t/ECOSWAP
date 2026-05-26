"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Recycle, Wind, Users, Star, TrendingUp, Trash2, Edit2, Globe, MapPin, Phone, Edit, MessageSquare, CreditCard, Check, ChevronDown, Award, Mail, Hash, X, Bell
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";
import { supabase, type Profile, type Item, type Transaction, type AdminNotification } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

// ── Animated counter ──
function useCounter(end: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) return;
    let start = 0;
    const step = Math.max(1, Math.ceil(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
}


export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [communityCo2, setCommunityCo2] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const { t, language, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phoneNational, setPhoneNational] = useState("");

  // Admin notifications
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifBtnRef = useRef<HTMLButtonElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isCompletingItem, setIsCompletingItem] = useState<Item | null>(null);
  const [partnerSelectionType, setPartnerSelectionType] = useState<"registered" | "custom">("custom");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [customPartnerName, setCustomPartnerName] = useState<string>("");
  const [selectedTxType, setSelectedTxType] = useState<"Swap" | "Borrow" | "Sell" | "Donate">("Swap");
  const [txPrice, setTxPrice] = useState<string>("");
  const [partnerRating, setPartnerRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [availablePartners, setAvailablePartners] = useState<{ id: string; name: string }[]>([]);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch global community impact
      const { data: allItems } = await supabase.from('items').select('co2_impact');
      if (allItems) {
        setCommunityCo2(allItems.reduce((sum, item) => sum + (item.co2_impact || 0), 0));
      }

      if (!user) { setLoading(false); return; }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) {
        setProfile(profileData as Profile);
        setEditData(profileData as Profile);
        
        // Parse country code and national phone number
        const fullPhone = profileData.phone || "";
        if (fullPhone.startsWith("+") && fullPhone.length > 10) {
          const national = fullPhone.slice(-10);
          const code = fullPhone.slice(0, fullPhone.length - 10);
          setPhoneCountryCode(code);
          setPhoneNational(national);
        } else {
          setPhoneCountryCode("+91");
          setPhoneNational(fullPhone);
        }
      }

      // Fetch recent activity
      const { data: itemsData } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (itemsData) {
        setRecentItems(itemsData as Item[]);
      }

      // Fetch support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (tickets) {
        setSupportTickets(tickets);
      }

      // Fetch completed transactions
      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (txData) {
        setTransactions(txData as Transaction[]);
      }

      // Fetch dynamic unread messages count from DB
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", user.id);
      
      setUnreadMessages(unreadCount || 0);

      // Fetch admin broadcast notifications
      const { data: notifsData } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (notifsData) setAdminNotifications(notifsData as AdminNotification[]);

      // Fetch which ones this user has already read
      const { data: readsData } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      if (readsData) {
        setReadNotifIds(new Set(readsData.map((r: any) => r.notification_id)));
      }

      setLoading(false);
    };
    load();

    // Real-time profile updates
    const channel = supabase.channel("profile-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => { setProfile(payload.new as Profile); })
      .subscribe();

    // Real-time transactions updates
    const txChannel = supabase.channel("transaction-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => { setTransactions(prev => [payload.new as Transaction, ...prev]); })
      .subscribe();

    // Real-time admin notifications
    const notifChannel = supabase.channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => { setAdminNotifications(prev => [payload.new as AdminNotification, ...prev]); })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      supabase.removeChannel(txChannel);
      supabase.removeChannel(notifChannel);
    };
  }, []);

  // Mark all visible notifications as read
  const handleOpenNotifications = async () => {
    setShowNotifPanel(prev => !prev);
    if (showNotifPanel) return; // closing — no action needed
    const unreadIds = adminNotifications
      .filter(n => !readNotifIds.has(n.id))
      .map(n => n.id);
    if (!user || unreadIds.length === 0) return;
    // Optimistically update UI
    setReadNotifIds(prev => {
  const updated = new Set(prev);
  unreadIds.forEach(id => updated.add(id));
  return updated;
});
    // Insert reads into DB (ignore conflicts)
    await supabase.from('notification_reads').upsert(
      unreadIds.map(nid => ({ user_id: user.id, notification_id: nid })),
      { onConflict: 'user_id,notification_id' }
    );
  };

  const handleSendSupportMessage = async () => {
    if (!user || !supportMessage.trim()) return;
    setIsSendingSupport(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      message: supportMessage
    });
    
    if (!error) {
      setSupportMessage("");
      alert("Message sent to Admin!");
      // Refetch tickets
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setSupportTickets(data);
    } else {
      alert("Error sending message. Did you run the SQL script?");
    }
    setIsSendingSupport(false);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (!error) {
      setRecentItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      alert("Error deleting item: " + error.message);
    }
  };

  const handleCancelListing = async (itemId: string) => {
    if (!confirm("Are you sure you want to cancel this listing?")) return;
    const { error } = await supabase
      .from('items')
      .update({ status: 'cancelled' })
      .eq('id', itemId);

    if (!error) {
      setRecentItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'cancelled' } : item));
      alert("Listing marked as Cancelled.");
    } else {
      alert("Error cancelling item: " + error.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    const combinedPhone = phoneNational ? `${phoneCountryCode}${phoneNational}` : "";
    
    const updatePayload: any = {
      full_name: editData.full_name,
      avatar_url: editData.avatar_url,
      city: editData.city,
      pincode: editData.pincode || null,
      email: editData.email || null,
      phone: combinedPhone || null
    };

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);
    
    if (!error) {
      setProfile({ ...profile, ...editData, phone: combinedPhone } as Profile);
      setIsEditing(false);
    } else {
      alert("Error saving profile: " + error.message);
    }
  };

  const getEcoPointsAward = (type: string) => {
    switch (type) {
      case "Swap": return 15;
      case "Donate": return 20;
      case "Sell": return 10;
      case "Borrow": return 10;
      default: return 10;
    }
  };

  const handleCompleteTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isCompletingItem) return;
    setIsSubmittingCompletion(true);

    const partnerName = partnerSelectionType === "registered"
      ? (availablePartners.find(p => p.id === selectedPartnerId)?.name || "User")
      : customPartnerName.trim();

    if (!partnerName) {
      alert("Please specify who you transacted with.");
      setIsSubmittingCompletion(false);
      return;
    }

    try {
      // 1. Insert transaction record
      const priceVal = selectedTxType === "Sell" && txPrice ? parseFloat(txPrice) : null;
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        item_id: isCompletingItem.id,
        partner_name: partnerName,
        transaction_type: selectedTxType,
        item_title: isCompletingItem.title,
        price: priceVal
      });

      if (txErr) {
        if (
          txErr.code === "42P01" || 
          txErr.message.toLowerCase().includes("does not exist") || 
          txErr.message.toLowerCase().includes("relation") || 
          txErr.message.toLowerCase().includes("schema cache") || 
          txErr.message.toLowerCase().includes("could not find")
        ) {
          throw new Error("Supabase table 'transactions' not found. Please run the SQL schema script in update_schema.sql first!");
        }
        throw txErr;
      }

      // 2. Update item status to 'completed'
      const { error: itemErr } = await supabase
        .from("items")
        .update({ status: "completed" })
        .eq("id", isCompletingItem.id);

      if (itemErr) {
        if (itemErr.message.includes("check constraint") || itemErr.message.includes("violates")) {
          throw new Error("Could not update item status. Please run the SQL schema check constraint update first!");
        }
        throw itemErr;
      }

      // 3. Update user profile statistics
      const ptsAward = getEcoPointsAward(selectedTxType);
      const co2Impact = isCompletingItem.co2_impact || 10.0;

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("eco_points, co2_saved, items_swapped, eco_score")
        .eq("id", user.id)
        .single();

      if (currentProfile) {
        await supabase
          .from("profiles")
          .update({
            eco_points: (currentProfile.eco_points || 0) + ptsAward,
            co2_saved: (currentProfile.co2_saved || 0) + co2Impact,
            items_swapped: (currentProfile.items_swapped || 0) + 1,
            eco_score: Math.min((currentProfile.eco_score || 0) + 10, 100),
          })
          .eq("id", user.id);
      }

      // 4. Save review if registered partner is reviewed
      if (partnerSelectionType === "registered" && selectedPartnerId) {
        const { error: reviewErr } = await supabase.from("reviews").insert({
          reviewer_id: user.id,
          reviewed_id: selectedPartnerId,
          item_id: isCompletingItem.id,
          rating: partnerRating,
          comment: ratingComment
        });

        if (!reviewErr) {
          // Update the partner's average rating in their profile
          const { data: reviews } = await supabase
            .from("reviews")
            .select("rating")
            .eq("reviewed_id", selectedPartnerId);

          if (reviews && reviews.length > 0) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            await supabase
              .from("profiles")
              .update({ rating: parseFloat(avg.toFixed(2)) })
              .eq("id", selectedPartnerId);
          }
        }
      }

      // Success! Refetch dashboard data
      // Refetch transactions
      const { data: newTxData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (newTxData) {
        setTransactions(newTxData as Transaction[]);
      }

      // Refetch items
      const { data: newItemsData } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (newItemsData) {
        setRecentItems(newItemsData as Item[]);
      }

      // Refetch profile
      const { data: newProfileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (newProfileData) {
        setProfile(newProfileData as Profile);
      }

      // Close modal
      setIsCompletingItem(null);
      setCustomPartnerName("");
      setRatingComment("");
      setPartnerRating(5);
      alert("Transaction successfully completed! Eco points & CO₂ saved updated.");

    } catch (err: any) {
      alert("Error completing transaction: " + err.message);
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const userCo2Saved = recentItems.reduce((sum, item) => sum + (item.co2_impact || 0), 0);
  const co2Saved = profile?.co2_saved ? Math.max(profile.co2_saved, userCo2Saved) : userCo2Saved;
  const itemsSwapped = profile?.items_swapped ? Math.max(profile.items_swapped, recentItems.length) : recentItems.length;
  const ecoPoints = profile?.eco_points ?? 0;
  const commCo2Counter = useCounter(communityCo2);
  const ecoScore = profile?.eco_score ?? 0;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px" }}>
        <div style={{ color: "var(--secondary-foreground)" }}>Loading your eco data…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "1.2rem" }}>{t("signInPrompt")}</p>
        <a href="/auth" style={{ color: "var(--primary)", fontWeight: 600 }}>Sign In →</a>
      </div>
    );
  }



  // Use real data or sensible defaults
  const rating = profile?.rating ?? 5.0;
  const score = profile?.eco_score ?? 50;

  const STATS = [
    { icon: <Recycle size={24} />, label: "Items Listed", value: itemsSwapped, unit: "", color: "#d1fae5", iconColor: "#047857" },
    { icon: <Wind size={24} />, label: "Your CO₂ Saved", value: co2Saved, unit: " kg", color: "#dbeafe", iconColor: "#0284c7" },
    { icon: <Globe size={24} />, label: "App Total CO₂", value: commCo2Counter, unit: " kg", color: "#fce7f3", iconColor: "#db2777" },
    { icon: <Users size={24} />, label: "Eco Score", value: score, unit: "/100", color: "#ede9fe", iconColor: "#7c3aed" },
    { icon: <Award size={24} />, label: "Eco Points", value: ecoPoints, unit: " pts", color: "#fef3c7", iconColor: "#d97706" },
    { icon: <Star size={24} />, label: "Your Rating", value: rating, unit: " ⭐", color: "#fef9c3", iconColor: "#ca8a04" },
  ];

  const unreadNotifCount = adminNotifications.filter(n => !readNotifIds.has(n.id)).length;

  return (
    <div className={styles.page}>
      <motion.div className={styles.pageHeader} style={{ position: 'relative' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 className={styles.pageTitle}>
              {t("welcome")}, {profile?.full_name?.split(" ")[0] || "User"}! 👋
            </h1>
            <p className={styles.pageSubtitle}>{t("subtitle")}</p>
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              ref={notifBtnRef}
              id="notification-bell-btn"
              onClick={handleOpenNotifications}
              className={styles.notifBellBtn}
              aria-label="Notifications"
            >
              <Bell size={22} />
              {unreadNotifCount > 0 && (
                <span className={styles.notifBadge}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
              )}
            </button>

            {/* Slide-down notification panel */}
            <AnimatePresence>
              {showNotifPanel && (
                <motion.div
                  className={styles.notifPanel}
                  initial={{ opacity: 0, y: -12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.notifPanelHeader}>
                    <span className={styles.notifPanelTitle}>🔔 Notifications</span>
                    <button className={styles.closeBtn} onClick={() => setShowNotifPanel(false)}><X size={16} /></button>
                  </div>

                  {adminNotifications.length === 0 ? (
                    <div className={styles.notifEmpty}>
                      <Bell size={32} style={{ opacity: 0.3 }} />
                      <p>No announcements yet</p>
                    </div>
                  ) : (
                    <div className={styles.notifList}>
                      {adminNotifications.map(n => {
                        const isRead = readNotifIds.has(n.id);
                        return (
                          <div key={n.id} className={`${styles.notifItem} ${!isRead ? styles.notifItemUnread : ''}`}>
                            {!isRead && <span className={styles.notifDot} />}
                            <div style={{ flex: 1 }}>
                              <div className={styles.notifItemTitle}>{n.title}</div>
                              <div className={styles.notifItemMsg}>{n.message}</div>
                              <div className={styles.notifItemTime}>{new Date(n.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STATS.map((s, i) => (
          <motion.div key={i} className={styles.statCard}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
            <div className={styles.statIcon} style={{ background: s.color, color: s.iconColor }}>{s.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{typeof s.value === "number" ? s.value.toFixed(s.unit.includes("⭐") ? 1 : 0) : s.value}{s.unit}</span>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statChange} style={{ color: "#16a34a" }}>
                <TrendingUp size={12} style={{ display: "inline", marginRight: 3 }} />Live from Supabase
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main layout */}
      <div className={styles.mainGrid}>
        {/* Profile Card */}
        <motion.div className={styles.profileCard} style={{ position: 'relative' }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          {!isEditing ? (
            <>
              <button className={styles.editIconBtn} onClick={() => {
                setIsEditing(true);
                setEditData(profile || {});
                const fullPhone = profile?.phone || "";
                if (fullPhone.startsWith("+") && fullPhone.length > 10) {
                  const national = fullPhone.slice(-10);
                  const code = fullPhone.slice(0, fullPhone.length - 10);
                  setPhoneCountryCode(code);
                  setPhoneNational(national);
                } else {
                  setPhoneCountryCode("+91");
                  setPhoneNational(fullPhone);
                }
              }}>
                <Edit size={18} />
              </button>
              <div className={styles.profileAvatar}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  (profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U").toUpperCase()
                )}
              </div>
              <div className={styles.profileName}>{profile?.full_name || "User"}</div>
              <div className={styles.profileLocation}>
                <MapPin size={16} /> {profile?.city || "Planet Earth"}
              </div>
              
              <div className={styles.profileStats}>
                <div className={styles.profileStatRow}>
                  <span className={styles.profileStatLabel}><Phone size={14} /> Phone</span>
                  <span className={styles.profileStatValue}>{profile?.phone || t("notProvided")}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span className={styles.profileStatLabel}><MapPin size={14} /> City</span>
                  <span className={styles.profileStatValue}>{profile?.city || t("notProvided")}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span className={styles.profileStatLabel}><Hash size={14} /> Pincode</span>
                  <span className={styles.profileStatValue}>{profile?.pincode || t("notProvided")}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span className={styles.profileStatLabel}><Mail size={14} /> Email</span>
                  <span className={styles.profileStatValue}>{profile?.email || t("notProvided")}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span className={styles.profileStatLabel}><Star size={14} /> {t("communityRating")}</span>
                  <span className={styles.profileStatValue}>{rating} ⭐</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span className={styles.profileStatLabel}><Award size={14} /> Eco Points</span>
                  <span className={styles.profileStatValue}>{ecoPoints} pts</span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.editForm}>
              <h3 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>{t("editProfile")}</h3>
              <div className={styles.formGroup}>
                <label>{t("fullName")}</label>
                <input className={styles.input} value={editData.full_name || ''} onChange={(e) => setEditData({...editData, full_name: e.target.value})} placeholder="Your Name" />
              </div>
              <div className={styles.formGroup}>
                <label>{t("avatarUrl")}</label>
                <input className={styles.input} value={editData.avatar_url || ''} onChange={(e) => setEditData({...editData, avatar_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className={styles.formGroup}>
                <label>{t("city")}</label>
                <input className={styles.input} value={editData.city || ''} onChange={(e) => setEditData({...editData, city: e.target.value})} placeholder="City" />
              </div>
              <div className={styles.formGroup}>
                <label>Pincode</label>
                <input className={styles.input} value={editData.pincode || ''} onChange={(e) => setEditData({...editData, pincode: e.target.value})} placeholder="Pincode" />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input className={styles.input} value={editData.email || ''} onChange={(e) => setEditData({...editData, email: e.target.value})} placeholder="Email" />
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    style={{ width: '80px', textAlign: 'center' }} 
                    className={styles.input} 
                    value={phoneCountryCode} 
                    onChange={(e) => setPhoneCountryCode(e.target.value)} 
                    placeholder="+91" 
                  />
                  <input 
                    style={{ flex: 1 }} 
                    className={styles.input} 
                    value={phoneNational} 
                    onChange={(e) => setPhoneNational(e.target.value)} 
                    placeholder="10-digit number" 
                    maxLength={10}
                  />
                </div>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.cancelBtn} onClick={() => { setIsEditing(false); setEditData(profile || {}); }}>{t("cancel")}</button>
                <button className={styles.saveBtn} onClick={handleSaveProfile}>{t("save")}</button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Transaction History Card */}
        <motion.div className={styles.transactionCard} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className={styles.transactionHeader}>
            <h2 className={styles.transactionTitle}>
              <span className={styles.transactionTitleEmoji}>📊</span> Transaction History
            </h2>
          </div>
          <div className={styles.txList}>
            {transactions.length === 0 ? (
              <p style={{ color: "var(--secondary-foreground)", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0", width: "100%" }}>
                No transaction history yet. Mark items as completed to record your transfers!
              </p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txHeader}>
                    <span className={styles.txIcon}>
                      {tx.transaction_type === 'Donate' && '📦'}
                      {tx.transaction_type === 'Swap' && '🔄'}
                      {tx.transaction_type === 'Sell' && '💰'}
                      {tx.transaction_type === 'Borrow' && '🤝'}
                    </span>
                    <span className={styles.txStatus}>
                      {tx.transaction_type === 'Donate' && 'Completed'}
                      {tx.transaction_type === 'Swap' && 'Successful Swap'}
                      {tx.transaction_type === 'Sell' && 'Sold'}
                      {tx.transaction_type === 'Borrow' && 'Lent'}
                    </span>
                  </div>
                  <div className={styles.txDetails}>
                    <p className={styles.txDescription}>
                      {tx.transaction_type === 'Donate' && `${tx.item_title} donated to ${tx.partner_name}`}
                      {tx.transaction_type === 'Swap' && `${tx.item_title} swapped with ${tx.partner_name}`}
                      {tx.transaction_type === 'Sell' && `${tx.item_title} sold to ${tx.partner_name}`}
                      {tx.transaction_type === 'Borrow' && `${tx.item_title} lent to ${tx.partner_name}`}
                    </p>
                    <span className={styles.txDate}>
                      {(() => {
                        const d = new Date(tx.created_at);
                        return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
                      })()}
                    </span>
                    {tx.transaction_type === 'Sell' && tx.price !== undefined && tx.price !== null && (
                      <div className={styles.txPrice}>₹{Number(tx.price).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Help Centre */}
        <motion.div className={styles.helpCard} style={{ flex: '1 1 400px', marginTop: 0 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className={styles.helpContent}>
            <h3>{t("needAssistance")}</h3>
            <p>{t("helpText")}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <textarea 
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Type your message to the admin here..."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button 
              className={styles.contactBtn} 
              onClick={handleSendSupportMessage}
              disabled={isSendingSupport || !supportMessage.trim()}
              style={{ opacity: (isSendingSupport || !supportMessage.trim()) ? 0.5 : 1 }}
            >
              <MessageSquare size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> 
              {isSendingSupport ? 'Sending...' : t("contactAdmin")}
            </button>
          </div>

          {supportTickets.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: 'var(--foreground)' }}>Your Support Tickets</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '250px', overflowY: 'auto' }}>
                {supportTickets.map(ticket => (
                  <div key={ticket.id} style={{ background: 'var(--background)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>You</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ color: 'var(--foreground)', marginBottom: ticket.admin_reply ? '0.8rem' : 0 }}>{ticket.message}</p>
                    
                    {ticket.admin_reply && (
                      <div style={{ background: 'var(--surface-hover)', padding: '0.6rem', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.2rem', fontSize: '0.75rem' }}>Admin Reply</div>
                        <p style={{ color: 'var(--foreground)' }}>{ticket.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Language Selector */}
        <motion.div className={styles.statCard} style={{ flex: '0 0 auto', marginTop: 0, padding: '1.5rem 2rem' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>{t("appLanguage")}</span>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--foreground)', fontWeight: 600 }}
              >
                <Globe size={16} /> {language} <ChevronDown size={14} />
              </button>
              {showLangMenu && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem', zIndex: 10, minWidth: '150px', boxShadow: 'var(--shadow-md)' }}>
                  {["English", "Hindi (हिंदी)", "Marathi (मराठी)", "Spanish (Español)"].map((lang) => (
                    <div 
                      key={lang} 
                      onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                      style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {lang}
                      {language === lang && <Check size={14} color="var(--primary)" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity Feed — real items */}
      <motion.div className={styles.activityCard} style={{ marginBottom: "2rem" }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <div className={styles.cardTitle}>📋 {t("yourRecentListings")}</div>
        {recentItems.length === 0 ? (
          <p style={{ color: "var(--secondary-foreground)", fontSize: "0.9rem" }}>
            You haven't listed anything yet. <a href="/list-item" style={{ color: "var(--primary)", fontWeight: 600 }}>{t("listFirstItem")}</a>
          </p>
        ) : (
          <div className={styles.activityList}>
            {recentItems.map((item, i) => (
              <div key={item.id} className={styles.activityItem}>
                <div>
                  <div className={styles.activityDot} style={{ background: "#d1fae5", color: "#047857", fontSize: "1.1rem" }}>
                    {item.type === "Swap" ? "🔄" : item.type === "Borrow" ? "🤝" : item.type === "Sell" ? "💰" : "🎁"}
                  </div>
                  {i < recentItems.length - 1 && <div className={styles.activityLine} />}
                </div>
                <div>
                  <div className={styles.activityText}>
                    <strong>{item.title}</strong> — {item.type} · <span style={{ 
                      textTransform: "capitalize", 
                      fontWeight: 700, 
                      color: item.status === "completed" 
                        ? "var(--primary)" 
                        : item.status === "cancelled" 
                        ? "#dc2626" 
                        : item.status === "active" 
                        ? "#0284c7" 
                        : item.status === "pending" 
                        ? "#ca8a04" 
                        : "var(--secondary-foreground)" 
                    }}>{item.status}</span>
                  </div>
                  <div className={styles.activityTime}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  <span className={styles.activityCO2}>🌿 -{item.co2_impact}kg CO₂</span>
                  <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                    {item.status !== "completed" && item.status !== "cancelled" && (
                      <>
                        <button 
                          onClick={() => {
                            setIsCompletingItem(item);
                            setSelectedTxType(item.type);
                            setTxPrice(item.price ? String(item.price) : "");
                            
                            // Load chat partners for the user
                            if (user) {
                              supabase
                                .from("conversations")
                                .select("user1_id, user2_id")
                                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                                .then(({ data: convs }) => {
                                  if (convs && convs.length > 0) {
                                    const partnerIds = Array.from(new Set(convs.flatMap(c => [c.user1_id, c.user2_id]).filter(id => id !== user.id)));
                                    if (partnerIds.length > 0) {
                                      supabase
                                        .from("profiles")
                                        .select("id, full_name, username")
                                        .in("id", partnerIds)
                                        .then(({ data: profiles }) => {
                                          if (profiles) {
                                            setAvailablePartners(profiles.map(p => ({
                                              id: p.id,
                                              name: p.full_name || p.username || "Anonymous Swapper"
                                            })));
                                            if (profiles.length > 0) {
                                              setSelectedPartnerId(profiles[0].id);
                                              setPartnerSelectionType("registered");
                                            } else {
                                              setPartnerSelectionType("custom");
                                            }
                                          }
                                        });
                                    } else {
                                      setPartnerSelectionType("custom");
                                    }
                                  } else {
                                    setPartnerSelectionType("custom");
                                  }
                                });
                            }
                          }} 
                          style={{ background: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <Check size={12} /> Mark Completed
                        </button>
                        <button 
                          onClick={() => handleCancelListing(item.id)}
                          style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <X size={12} /> Cancel Listing
                        </button>
                      </>
                    )}
                    {item.status !== "completed" && item.status !== "cancelled" && (
                      <Link href={`/edit-item/${item.id}`}>
                        <button style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                          <Edit2 size={12} /> {t("edit")}
                        </button>
                      </Link>
                    )}
                    <button onClick={() => handleDelete(item.id)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                      <Trash2 size={12} /> {t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Transaction Completion Modal */}
      {isCompletingItem && (
        <div className={styles.modalOverlay}>
          <motion.div 
            className={styles.modalContent}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>🎉 Complete Transaction</h3>
              <button className={styles.closeBtn} onClick={() => setIsCompletingItem(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCompleteTransactionSubmit} className={styles.modalBody}>
              <div className={styles.modalGroup}>
                <label>Item Being Completed</label>
                <input className={styles.modalInput} value={isCompletingItem.title} disabled style={{ opacity: 0.7 }} />
              </div>

              <div className={styles.modalGroup}>
                <label>Transaction Type</label>
                <div className={styles.typeButtonGroup}>
                  {(["Swap", "Borrow", "Sell", "Donate"] as const).map((tType) => (
                    <button
                      key={tType}
                      type="button"
                      className={`${styles.typeBtn} ${selectedTxType === tType ? styles.typeBtnActive : ""}`}
                      onClick={() => {
                        setSelectedTxType(tType);
                        if (tType === "Sell") {
                          setTxPrice(isCompletingItem.price ? String(isCompletingItem.price) : "");
                        }
                      }}
                    >
                      {tType}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTxType === "Sell" && (
                <div className={styles.modalGroup}>
                  <label>Sale Price (₹)</label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="e.g. 50000"
                    required
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.modalGroup}>
                <label>Exchanged With</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${partnerSelectionType === "registered" ? styles.typeBtnActive : ""}`}
                    disabled={availablePartners.length === 0}
                    style={{ flex: 1 }}
                    onClick={() => setPartnerSelectionType("registered")}
                  >
                    Select Chat Partner ({availablePartners.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${partnerSelectionType === "custom" ? styles.typeBtnActive : ""}`}
                    style={{ flex: 1 }}
                    onClick={() => setPartnerSelectionType("custom")}
                  >
                    Custom Name
                  </button>
                </div>

                {partnerSelectionType === "registered" && availablePartners.length > 0 ? (
                  <select
                    className={styles.modalSelect}
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    required
                  >
                    {availablePartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="e.g. Priya, Rahul, Arjun"
                    required
                    value={customPartnerName}
                    onChange={(e) => setCustomPartnerName(e.target.value)}
                  />
                )}
              </div>

              {partnerSelectionType === "registered" && selectedPartnerId && (
                <div className={styles.modalGroup}>
                  <label>Rate your partner</label>
                  <div className={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={styles.starBtn}
                        onClick={() => setPartnerRating(star)}
                      >
                        <Star
                          size={24}
                          fill={star <= partnerRating ? "var(--primary)" : "none"}
                          color={star <= partnerRating ? "var(--primary)" : "var(--secondary-foreground)"}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={styles.modalTextarea}
                    placeholder="Leave an optional comment about the transaction..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    style={{ marginTop: "0.5rem" }}
                  />
                </div>
              )}

              <div className={styles.pointsPreview}>
                <span>🌿 Awarding:</span>
                <span className={styles.pointsPreviewDetail}>• +{isCompletingItem.co2_impact || 10.0} kg CO₂ saved</span>
                <span className={styles.pointsPreviewDetail}>• +{getEcoPointsAward(selectedTxType)} Eco Points!</span>
                <span className={styles.pointsPreviewDetail}>• +10 Eco Score points!</span>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setIsCompletingItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmittingCompletion}
                >
                  {isSubmittingCompletion ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
