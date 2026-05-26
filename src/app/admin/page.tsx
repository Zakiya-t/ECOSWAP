"use client";

import { motion } from "framer-motion";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { supabase, type AdminNotification } from "@/lib/supabase";

const COLORS = ["#047857", "#0284c7", "#7c3aed", "#db2777", "#ca8a04"];

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = (s === "active" || s === "swap" || s === "verified") ? styles.badgeActive
    : (s === "pending" || s === "borrow") ? styles.badgePending
    : (s === "flagged" || s === "donate") ? styles.badgeFlagged
    : styles.badgeSold;
  return <span className={`${styles.badge} ${cls}`} style={{ textTransform: 'capitalize' }}>{status}</span>;
}

export default function AdminPage() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState(false);
  const [loading, setLoading] = useState(true);

  // Broadcast notifications state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const fetchData = async () => {
      const { data: itemsData } = await supabase
        .from('items')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      const { data: notifsData } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (itemsData) setItems(itemsData);
      if (usersData) setUsers(usersData);
      if (ticketsData) setSupportTickets(ticketsData);
      if (notifsData) setNotifications(notifsData as AdminNotification[]);
      setLoading(false);
    };
    fetchData();
  }, [isAdminAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === "zakiyatahasildar@eco.com" && adminPassword === "zakiya@eco098") {
      setIsAdminAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid admin credentials.");
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setIsSendingNotif(true);

    const { data, error } = await supabase
      .from('admin_notifications')
      .insert({ title: notifTitle.trim(), message: notifMessage.trim() })
      .select()
      .single();

    if (!error && data) {
      setNotifications(prev => [data as AdminNotification, ...prev]);
      setNotifTitle("");
      setNotifMessage("");
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 3500);
    } else {
      alert("Error sending notification. Did you run the SQL script?\n" + (error?.message || ""));
    }
    setIsSendingNotif(false);
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm("Delete this notification? Users will no longer see it.")) return;
    const { error } = await supabase.from('admin_notifications').delete().eq('id', id);
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const text = replyText[ticketId];
    if (!text?.trim()) return;
    setIsReplying(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({ admin_reply: text, status: 'resolved' })
      .eq('id', ticketId);
    if (!error) {
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, admin_reply: text, status: 'resolved' } : t));
      setReplyText(prev => ({ ...prev, [ticketId]: "" }));
    } else {
      alert("Error sending reply. Did you run the SQL script?");
    }
    setIsReplying(false);
  };

  // ── Login wall ──
  if (!isAdminAuthenticated) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--surface)', padding: '3rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--foreground)', fontSize: '1.5rem', fontWeight: 800 }}>🛡️ Admin Portal</h2>
          <p style={{ textAlign: 'center', color: 'var(--secondary-foreground)', marginBottom: '2rem', fontSize: '0.9rem' }}>Authorized personnel only.</p>
          {loginError && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{loginError}</div>
          )}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Admin Email</label>
              <input type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} placeholder="admin@eco.com" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Password</label>
              <input type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} placeholder="••••••••" />
            </div>
            <button type="submit" style={{ background: 'var(--primary)', color: 'white', padding: '0.8rem', borderRadius: '50px', fontWeight: 700, marginTop: '1rem', border: 'none', cursor: 'pointer' }}>
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground)' }}>Loading Admin Data...</div>;
  }

  const totalUsers = users.length;
  const activeListings = items.filter(i => i.status === 'active').length;
  const totalCo2 = items.reduce((acc, curr) => acc + (curr.co2_impact || 0), 0);
  const flaggedItems = items.filter(i => i.status === 'flagged').length;

  const STATS = [
    { icon: "👥", label: "Total Users",     value: totalUsers },
    { icon: "📦", label: "Active Listings", value: activeListings },
    { icon: "🔄", label: "Total Listings",  value: items.length },
    { icon: "🌍", label: "CO₂ Saved (kg)",  value: totalCo2.toFixed(1) },
    { icon: "⚠️", label: "Flagged Items",   value: flaggedItems },
  ];

  return (
    <div className={styles.page}>
      <motion.div className={styles.pageHeader} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className={styles.pageTitle}>🛡️ Admin Panel</h1>
        <p className={styles.pageSubtitle}>Manage users, listings, and monitor platform health.</p>
      </motion.div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STATS.map((s, i) => (
          <motion.div key={i} className={styles.statCard}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Broadcast Notifications ── */}
      <motion.div className={styles.tableCard} style={{ marginBottom: '2rem' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>📣 Broadcast Notification to All Users</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>{notifications.length} sent so far</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {notifSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: '#d1fae5', color: '#047857', padding: '0.8rem 1.2rem', borderRadius: '8px', marginBottom: '1.2rem', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              ✅ Notification sent! All users will see it in their dashboard.
            </motion.div>
          )}

          <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notification Title
              </label>
              <input
                type="text"
                required
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                placeholder="e.g. 🎉 New Feature Launched!"
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.95rem', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Message Body
              </label>
              <textarea
                required
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                placeholder="Write your message to all EcoSwap users here..."
                rows={3}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.7rem 2rem', borderRadius: '50px', fontWeight: 700, cursor: 'pointer', opacity: (isSendingNotif || !notifTitle.trim() || !notifMessage.trim()) ? 0.5 : 1, transition: 'all 0.2s', fontSize: '0.95rem' }}
              >
                {isSendingNotif ? '📤 Sending...' : '📣 Send to All Users'}
              </button>
            </div>
          </form>

          {notifications.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
                Previously Sent
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.9rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.2rem', fontSize: '0.95rem' }}>{n.title}</div>
                      <div style={{ color: 'var(--secondary-foreground)', fontSize: '0.85rem' }}>{n.message}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', marginTop: '0.4rem' }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Items Table */}
      <motion.div className={styles.tableCard}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>📋 All Listings</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th><th>Item</th><th>User</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ color: "var(--secondary-foreground)", fontFamily: "monospace", fontSize: "0.8rem" }}>{item.id.substring(0, 8)}...</td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>{item.profiles?.full_name || 'Eco Member'}</td>
                  <td><StatusBadge status={item.type} /></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td style={{ color: "var(--secondary-foreground)", fontSize: "0.9rem" }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.approveBtn} onClick={() => alert(`Simulated: approved`)}>✓ Approve</button>
                      <button className={styles.rejectBtn} onClick={() => alert(`Simulated: removed`)}>✕ Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No listings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Support Tickets */}
      <motion.div className={styles.tableCard} style={{ marginTop: '2rem' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>📥 Support Inbox</div>
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
          {supportTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary-foreground)' }}>No support tickets.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {supportTickets.map(ticket => (
                <div key={ticket.id} style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{ticket.profiles?.full_name || 'User'} <span style={{ color: 'var(--secondary-foreground)', fontSize: '0.8rem', fontWeight: 400 }}>said:</span></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>{new Date(ticket.created_at).toLocaleString()}</div>
                  </div>
                  <p style={{ background: 'var(--surface)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1rem' }}>{ticket.message}</p>
                  {ticket.admin_reply ? (
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '0.8rem', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem', opacity: 0.8 }}>Admin Reply:</div>
                      <div>{ticket.admin_reply}</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={replyText[ticket.id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Type your reply here..."
                        style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '50px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
                      />
                      <button
                        onClick={() => handleSendReply(ticket.id)}
                        disabled={isReplying || !replyText[ticket.id]?.trim()}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50px', padding: '0 1.5rem', fontWeight: 600, cursor: 'pointer', opacity: (isReplying || !replyText[ticket.id]?.trim()) ? 0.5 : 1 }}
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Two col — Users & Overview */}
      <div className={styles.twoCol}>
        <motion.div className={styles.miniCard} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div className={styles.miniCardTitle}>👥 User Management</div>
          {users.map((u, i) => (
            <div key={u.id} className={styles.userRow}>
              <div className={styles.avatar} style={{ background: COLORS[i % COLORS.length] }}>
                {u.full_name ? u.full_name[0].toUpperCase() : '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.userName}>{u.full_name || 'Eco Member'}</div>
                <div className={styles.userEmail}>{u.city || 'No location set'}</div>
              </div>
              <StatusBadge status="Active" />
              <button className={styles.userAction} onClick={() => alert('Manage user coming soon!')}>Manage</button>
            </div>
          ))}
          {users.length === 0 && <p style={{ padding: '1rem', color: 'var(--secondary-foreground)' }}>No users found.</p>}
        </motion.div>

        <motion.div className={styles.miniCard} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div className={styles.miniCardTitle}>🌍 Platform Eco Overview</div>
          {[
            ["Total CO₂ Saved", `${totalCo2.toFixed(1)} kg`],
            ["Items Reused", `${items.length}`],
            ["Trees Equivalent", `${Math.floor(totalCo2 / 21)} trees`],
            ["Water Saved", `${Math.floor(totalCo2 * 6.6)} L`],
            ["Total Registered Users", `${totalUsers}`],
            ["Avg Eco Score", `${Math.floor(users.reduce((acc, u) => acc + (u.eco_score || 0), 0) / Math.max(totalUsers, 1))} / 100`],
          ].map(([label, val], i) => (
            <div key={i} className={styles.userRow} style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--secondary-foreground)" }}>{label}</span>
              <span style={{ fontWeight: 700, color: "var(--primary)" }}>{val}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
