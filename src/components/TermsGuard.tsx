"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TermsGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [session, setSession] = useState<any>(null);

  // 1. Subscribe to auth changes once on mount
  useEffect(() => {
    let active = true;

    async function checkUser(currentSession: any) {
      if (!currentSession?.user) {
        if (active) {
          setAgreed(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("agreed_terms")
          .eq("id", currentSession.user.id)
          .single();

        if (active) {
          if (error) {
            console.error("Supabase profile error in TermsGuard:", error);
            // Default to false if profile query fails to force agreement check
            setAgreed(false);
          } else {
            setAgreed(!!profile?.agreed_terms);
          }
        }
      } catch (err) {
        console.error("Failed to check terms in TermsGuard:", err);
        if (active) {
          setAgreed(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      checkUser(session);
    });

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!active) return;
      setSession(currentSession);
      
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setLoading(true);
        checkUser(currentSession);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []); // Run ONCE on mount

  // 2. Perform redirection in a separate effect when state or pathname changes
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = ["/", "/auth", "/terms"].includes(pathname);
    const hasAgreed = agreed === true;

    if (session?.user) {
      if (!hasAgreed && !isPublicRoute) {
        router.push("/terms");
      } else if (hasAgreed && pathname === "/terms") {
        router.push("/dashboard");
      }
    }
  }, [loading, agreed, session, pathname, router]);

  // Render loading state
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "inherit"
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "4px solid var(--border)",
          borderTopColor: "var(--primary)",
          animation: "spin 1s linear infinite",
          marginBottom: "1.5rem"
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
        <div style={{ color: "var(--secondary-foreground)", fontWeight: 500, letterSpacing: "0.5px" }}>
          Authenticating with EcoSwap...
        </div>
      </div>
    );
  }

  // Prevent flash of protected content
  const isPublicRoute = ["/", "/auth", "/terms"].includes(pathname);
  if (session?.user && agreed === false && !isPublicRoute) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        color: "var(--foreground)"
      }}>
        <div style={{ color: "var(--secondary-foreground)", fontWeight: 500 }}>
          Redirecting to Terms &amp; Conditions...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
