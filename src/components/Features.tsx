"use client";

import { motion } from "framer-motion";
import { Leaf, MapPin, ShieldCheck, BarChart3, Users, MessageCircle } from "lucide-react";
import styles from "./Features.module.css";

const features = [
  {
    icon: <MapPin />,
    title: "Local Discoveries",
    desc: "Find amazing used items right in your neighborhood with our advanced location-based search."
  },
  {
    icon: <ShieldCheck />,
    title: "Secure Exchanges",
    desc: "Verified users and a safe deposit system ensure your borrows and swaps are fully protected."
  },
  {
    icon: <BarChart3 />,
    title: "Carbon Footprint Tracker",
    desc: "Every item reused is carbon saved. Track your personal eco-score and see your real-world impact."
  },
  {
    icon: <Leaf />,
    title: "SDG-12 Aligned",
    desc: "Directly contribute to the UN's goal for responsible consumption and production."
  },
  {
    icon: <Users />,
    title: "Community Reviews",
    desc: "Build trust through a transparent rating and review system for all community members."
  },
  {
    icon: <MessageCircle />,
    title: "Real-time Chat",
    desc: "Instantly connect with owners and borrowers to arrange smooth pickups and returns."
  }
];

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Everything you need to share</h2>
        <p className={styles.subtitle}>
          EcoSwap provides all the tools to make borrowing, swapping, and buying used items safer and easier than ever.
        </p>
      </div>

      <div className={styles.grid}>
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
          >
            <div className={styles.iconWrapper}>
              {feature.icon}
            </div>
            <h3 className={styles.cardTitle}>{feature.title}</h3>
            <p className={styles.cardDesc}>{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
