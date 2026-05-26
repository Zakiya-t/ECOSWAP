"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Leaf } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", session.user.id);
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to all changes in the messages table to update unread badge dynamically
    const channel = supabase.channel("global-unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const isTermsPage = pathname === "/terms";

  return (
    <header className={`${styles.header} glass`}>
      <Link href={isTermsPage ? "#" : "/"} className={styles.logo} onClick={(e) => {
        if (isTermsPage) e.preventDefault();
      }}>
        <Leaf color="var(--primary)" />
        EcoSwap
      </Link>

      <nav className={styles.nav}>
        {session && !isTermsPage && (
          <>
            <Link href="/marketplace" className={styles.link}>Marketplace</Link>
            <Link href="/chat" className={styles.link} style={{ position: 'relative' }}>
              Messages
              {unreadCount > 0 && (
                <span className={styles.notificationDot} />
              )}
            </Link>
            <Link href="/dashboard" className={styles.link}>Dashboard</Link>
            <Link href="/list-item" className={styles.link}>List Item</Link>
          </>
        )}
        {!isTermsPage && (
          <Link href="/admin" className={styles.link} style={{ color: 'var(--primary)', fontWeight: 700 }}>Admin</Link>
        )}
        
        {mounted && (
          <button 
            className={styles.themeToggle} 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        {session ? (
          <button onClick={handleLogout} className={styles.ctaButton} style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            Log Out
          </button>
        ) : (
          <Link href="/auth" className={styles.ctaButton} style={{ display: 'inline-flex', alignItems: 'center' }}>
            Join Now
          </Link>
        )}
      </nav>
    </header>
  );
}
