"use client";

import { motion } from "framer-motion";
import { ArrowRight, Globe, Recycle } from "lucide-react";
import Link from "next/link";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.badge}>
            <Globe size={16} />
            Supporting SDG-12: Responsible Consumption
          </div>
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Swap, Share, and <span className={styles.highlight}>Sustain</span> Your Community
        </motion.h1>

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join the local movement to reduce waste. Exchange, borrow, or buy gently used items in your neighborhood while tracking your positive environmental impact.
        </motion.p>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link href="/auth">
            <button className={styles.primaryBtn}>
              Start Swapping <ArrowRight size={20} />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
