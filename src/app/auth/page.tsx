"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={`${styles.authCard} glass`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <Leaf color="var(--primary)" size={40} />
        </div>
        <h1 className={styles.title}>{isLogin ? "Welcome Back" : "Join EcoSwap"}</h1>
        <p className={styles.subtitle}>
          {isLogin
            ? "Sign in to continue swapping and sharing."
            : "Create an account to start reducing waste in your community."}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleAuth} className={styles.form}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label htmlFor="fullName" className={styles.label}>Full Name</label>
              <input
                id="fullName"
                type="text"
                required={!isLogin}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={styles.input}
                placeholder="Jane Doe"
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className={styles.switchMode}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className={styles.switchBtn}
            type="button"
          >
            {isLogin ? "Sign up here" : "Sign in here"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
