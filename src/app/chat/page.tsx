"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Smile, Package, Loader2, Star } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase, type Conversation, type Message, type Profile } from "@/lib/supabase";

const COLORS = ["#047857", "#0d9488", "#0284c7", "#7c3aed", "#db2777"];

const renderPreview = (text: string | null | undefined) => {
  if (!text) return "Start a conversation…";
  if (text.startsWith("data:image/")) return "📷 Photo";
  return text;
};

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchUnreadCounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .eq("read", false)
      .neq("sender_id", user.id);
    
    const counts: Record<string, number> = {};
    if (data) {
      data.forEach((m: any) => {
        counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
      });
    }
    setUnreadCounts(counts);
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadCounts();

    // Subscribe to all changes in the messages table to keep unread counts updated in real-time
    const globalMsgChannel = supabase.channel("global-unread-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnreadCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalMsgChannel);
    };
  }, [user, messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv || !user || sending) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert("Please upload images smaller than 1.5MB.");
      return;
    }

    setSending(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        content: base64Data,
      });

      if (!error) {
        await supabase.from("conversations")
          .update({ last_message: base64Data, last_message_at: new Date().toISOString() })
          .eq("id", activeConv.id);
      } else {
        alert("Failed to send image: " + error.message);
      }
      setSending(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Get logged in user ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // ── Fetch conversations ──
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, items(title, type), user1:user1_id(id, full_name, username), user2:user2_id(id, full_name, username)")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (data) {
        setConversations(data as any);
        if (data.length > 0 && !activeConv) setActiveConv(data[0] as any);
      }
      setLoading(false);
    };
    fetchConversations();

    // Real-time: new conversations
    const channel = supabase.channel("conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, fetchConversations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Fetch and subscribe to messages for active conversation ──
  useEffect(() => {
    if (!activeConv) return;
    setMessages([]);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();

    // ── Real-time messages via Supabase channel ──
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === "UPDATE") {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? (payload.new as Message) : m));
        } else if (payload.eventType === "DELETE") {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  // ── Auto-scroll to latest message ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Mark incoming messages as read when active conversation changes or new messages arrive ──
  useEffect(() => {
    if (!activeConv || !user || messages.length === 0) return;
    
    const markAsRead = async () => {
      const unreadIds = messages
        .filter(m => !m.read && m.sender_id !== user.id)
        .map(m => m.id);
        
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    };
    
    markAsRead();
  }, [activeConv, user, messages]);

  // ── Send message ──
  const handleSend = async () => {
    if (!input.trim() || !activeConv || !user || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
    });

    // Update conversation last_message
    if (!error) {
      await supabase.from("conversations")
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq("id", activeConv.id);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getOtherUser = (conv: Conversation): Profile | undefined => {
    if (!user) return undefined;
    return (conv.user1?.id === user.id ? conv.user2 : conv.user1) as any;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px" }}>
        <Loader2 size={36} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "1.2rem", color: "var(--foreground)" }}>Please sign in to view your messages.</p>
        <a href="/auth" style={{ color: "var(--primary)", fontWeight: 600 }}>Sign In →</a>
      </div>
    );
  }

  return (
    <div className={styles.chatPage}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>Messages</h1>
          <input className={styles.searchInput} placeholder="Search conversations…" />
        </div>
        <div className={styles.conversationList}>
          {conversations.length === 0 && (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--secondary-foreground)", fontSize: "0.9rem" }}>
              No conversations yet.<br />Start one from an item listing!
            </div>
          )}
          {conversations.map((conv, i) => {
            const other = getOtherUser(conv);
            const color = COLORS[i % COLORS.length];
            const unreadCount = unreadCounts[conv.id] || 0;
            const hasUnread = unreadCount > 0;
            return (
              <div
                key={conv.id}
                className={`${styles.conversationItem} ${activeConv?.id === conv.id ? styles.active : ""}`}
                onClick={() => setActiveConv(conv)}
              >
                <div className={styles.avatar} style={{ background: color }}>
                  {(other?.full_name || other?.username || "U")[0].toUpperCase()}
                </div>
                <div className={styles.convInfo}>
                  <div 
                    className={styles.convName} 
                    style={{ fontWeight: hasUnread ? 700 : 600, color: hasUnread ? "var(--foreground)" : "inherit" }}
                  >
                    {other?.full_name || other?.username || "User"}
                  </div>
                  <div 
                    className={styles.convPreview} 
                    style={{ fontWeight: hasUnread ? 600 : 400, color: hasUnread ? "var(--foreground)" : "var(--secondary-foreground)" }}
                  >
                    {renderPreview(conv.last_message)}
                  </div>
                </div>
                <div className={styles.convMeta}>
                  <span className={styles.convTime} style={{ color: hasUnread ? "var(--primary)" : "inherit", fontWeight: hasUnread ? 600 : 400 }}>
                    {new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {hasUnread && (
                    <span className={styles.unreadBadge}>{unreadCount}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Chat Window ── */}
      <div className={styles.chatWindow}>
        {!activeConv ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-foreground)" }}>
            Select a conversation to start chatting
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.avatar} style={{ background: COLORS[0] }}>
                {(getOtherUser(activeConv)?.full_name || "U")[0].toUpperCase()}
              </div>
              <div className={styles.chatHeaderInfo}>
                <div className={styles.chatHeaderName}>{getOtherUser(activeConv)?.full_name || "User"}</div>
                {activeConv.items && (
                  <div className={styles.chatHeaderItem}>
                    <span className={styles.onlineDot} /> About: <Package size={12} style={{ marginLeft: 4 }} /> {(activeConv.items as any).title}
                  </div>
                )}
              </div>
              
              <Link href={`/user/${getOtherUser(activeConv)?.id}`} style={{ marginLeft: "auto" }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Star size={14} /> Profile & Reviews
                </button>
              </Link>
            </div>

            {activeConv.items && (
              <div style={{ padding: "1rem 1.5rem 0" }}>
                <div className={styles.itemCard}>
                  <Package size={22} color="var(--primary)" />
                  <div>
                    <div className={styles.itemCardTitle}>{(activeConv.items as any).title}</div>
                    <div className={styles.itemCardType}>{(activeConv.items as any).type} Request · Active</div>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.messages}>
              <div className={styles.dateDivider}>Today</div>
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      className={`${styles.messageRow} ${isOwn ? styles.own : ""}`}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {!isOwn && (
                        <div className={styles.msgAvatar} style={{ background: COLORS[0] }}>
                          {(getOtherUser(activeConv)?.full_name || "U")[0]}
                        </div>
                      )}
                      <div className={styles.bubble}>
                        {msg.content.startsWith("data:image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={msg.content} 
                            alt="Attachment" 
                            style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "12px", display: "block", marginTop: "0.2rem" }} 
                          />
                        ) : (
                          msg.content
                        )}
                        <span className={styles.bubbleTime}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            <div className={styles.inputArea} style={{ position: "relative" }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: "none" }} 
              />
              <button className={styles.iconBtn} onClick={() => fileInputRef.current?.click()} title="Send Image">
                <Paperclip size={18} />
              </button>
              <button 
                className={styles.iconBtn} 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                title="Add Emoji"
                style={{ color: showEmojiPicker ? "var(--primary)" : "inherit", borderColor: showEmojiPicker ? "var(--primary)" : "inherit" }}
              >
                <Smile size={18} />
              </button>

              {showEmojiPicker && (
                <div className={styles.emojiPicker}>
                  {["😀", "😊", "😂", "👍", "🌿", "♻️", "📦", "🤝", "💰", "🎁", "❤️", "🙌"].map(emoji => (
                    <button 
                      key={emoji} 
                      className={styles.emojiBtn}
                      onClick={() => {
                        setInput(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                className={styles.messageInput}
                placeholder="Type a message…"
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className={styles.sendBtn} onClick={handleSend} disabled={sending}>
                {sending ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
