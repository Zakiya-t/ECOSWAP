"use client";

import Link from "next/link";
import { Leaf, Share2, Code2, Camera, Globe } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        {/* Brand */}
        <div>
          <div className={styles.brand}>
            <Leaf size={22} />
            EcoSwap
          </div>
          <p className={styles.brandDesc}>
            A community-driven platform to exchange, borrow, and share items locally — reducing waste and carbon emissions together.
          </p>
          <div className={styles.sdgBadge}>
            🌍 Aligned with UN SDG-12
          </div>
        </div>

        {/* Platform */}
        <div>
          <div className={styles.colTitle}>Platform</div>
          <ul className={styles.links}>
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/chat">Messages</Link></li>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/auth">Sign Up</Link></li>
          </ul>
        </div>

        {/* Exchange Types */}
        <div>
          <div className={styles.colTitle}>Exchange</div>
          <ul className={styles.links}>
            <li><Link href="/marketplace">Swap Items</Link></li>
            <li><Link href="/marketplace">Borrow & Lend</Link></li>
            <li><Link href="/marketplace">Buy & Sell</Link></li>
            <li><Link href="/marketplace">Free & Donate</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className={styles.colTitle}>Company</div>
          <ul className={styles.links}>
            <li><Link href="/#features">About EcoSwap</Link></li>
            <li><Link href="/#impact">Our Impact</Link></li>
            <li><Link href="#">Privacy Policy</Link></li>
            <li><Link href="#">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© 2026 EcoSwap. Building a sustainable community, one swap at a time. 🌿</span>
        <div className={styles.socialLinks}>
          <button className={styles.socialBtn} aria-label="Twitter/X"><Share2 size={16} /></button>
          <button className={styles.socialBtn} aria-label="Instagram"><Camera size={16} /></button>
          <button className={styles.socialBtn} aria-label="Github"><Code2 size={16} /></button>
          <button className={styles.socialBtn} aria-label="Website"><Globe size={16} /></button>
        </div>
      </div>
    </footer>
  );
}
