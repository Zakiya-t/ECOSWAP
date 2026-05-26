"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Check, Leaf, AlertTriangle, LogOut, ArrowRight, ShieldCheck } from "lucide-react";
import styles from "./page.module.css";

export default function TermsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreedChecked, setAgreedChecked] = useState(false);

  useEffect(() => {
    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
        } else {
          setUser(session.user);
          
          // Check if already agreed
          const { data: profile } = await supabase
            .from("profiles")
            .select("agreed_terms")
            .eq("id", session.user.id)
            .single();

          if (profile?.agreed_terms) {
            router.push("/dashboard");
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error in terms page load:", err);
        setLoading(false);
      }
    }
    getSession();
  }, [router]);

  const handleAgree = async () => {
    if (!user || !agreedChecked) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ agreed_terms: true })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Successful update - force full reload to bootstrap root layout state
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert("Error accepting Terms: " + err.message);
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
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
        <div style={{ color: "var(--secondary-foreground)", fontWeight: 500 }}>
          Loading Terms &amp; Conditions...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass`}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Leaf size={32} />
          </div>
          <h1 className={styles.title}>Welcome to EcoSwap</h1>
          <p className={styles.subtitle}>Please review and accept our Terms of Service to join the community.</p>
        </div>

        <div className={styles.termsBox}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              🌿 1. Honest Listings &amp; Accurate Descriptions
            </h3>
            <p className={styles.sectionText}>
              You agree to describe all listed items honestly, including their current condition, usage status, and any defects or wear and tear. You will not list any hazardous, broken, counterfeit, or illegal items. All exchanged items must be thoroughly cleaned and sanitised before handing over.
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              🤝 2. Peer-to-Peer Safety &amp; Handovers
            </h3>
            <p className={styles.sectionText}>
              EcoSwap is a community-driven platform connecting local neighbors. You acknowledge that EcoSwap does not inspect, verify, or guarantee items. You agree to meet in safe, well-lit, public locations (or designated neighborhood drop-offs) for handovers.
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              💬 3. Community Respect &amp; Fair Play
            </h3>
            <p className={styles.sectionText}>
              You agree to communicate politely and respectfully inside the chat interface. Harassment, verbal abuse, stalking, or spamming will not be tolerated and will lead to immediate, permanent account suspension.
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              🔒 4. Data Privacy &amp; Trust Security
            </h3>
            <p className={styles.sectionText}>
              Personal details (such as phone number, UPI ID, or bank details) are stored securely and encrypted. They are strictly used to establish neighborhood trust, facilitate item exchanges, or allow transaction agreements between swappers.
            </p>
          </div>

          {/* CRITICAL LIABILITY CLAUSE */}
          <div className={styles.criticalSection}>
            <div className={styles.criticalTitle}>
              ⚠️ 5. Limitation of Liability &amp; User Conduct (CRITICAL)
            </div>
            <p className={styles.criticalText}>
              EcoSwap is strictly a peer-to-peer facilitation platform. EcoSwap is not responsible or liable for any actions, agreements, transactions, behaviors, or disputes of its users. Each user is solely responsible for their own actions and must conduct themselves with absolute fairness, honesty, and respect.
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              ⭐ 6. Sustainability &amp; Eco Points
            </h3>
            <p className={styles.sectionText}>
              You agree to participate on EcoSwap with the shared goal of reducing community carbon footprints and waste. Any abuse of the system, including posting fake listings to farm Eco Points, is strictly prohibited and will result in point resets.
            </p>
          </div>
        </div>

        <div 
          className={styles.checkboxContainer} 
          onClick={() => setAgreedChecked(!agreedChecked)}
        >
          <div className={`${styles.checkbox} ${agreedChecked ? styles.checkboxChecked : ""}`}>
            {agreedChecked && <Check size={14} strokeWidth={3} />}
          </div>
          <div>
            <span className={styles.checkboxLabel}>
              I have read and accept the EcoSwap Terms &amp; Conditions
            </span>
            <span className={styles.checkboxSublabel}>
              By checking this, you agree to act fairly and responsibly within the community.
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.btnSubmit} 
            disabled={!agreedChecked || submitting}
            onClick={handleAgree}
          >
            {submitting ? (
              <>
                <div className={styles.loadingSpinner} />
                Securing Agreement...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Agree &amp; Enter EcoSwap
                <ArrowRight size={16} />
              </>
            )}
          </button>
          
          <button 
            onClick={handleLogout} 
            className={styles.logoutBtn}
          >
            <LogOut size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Log Out &amp; Exit
          </button>
        </div>
      </div>
    </div>
  );
}
