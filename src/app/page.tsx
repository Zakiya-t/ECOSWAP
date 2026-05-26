import Hero from "@/components/Hero";
import Features from "@/components/Features";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Hero />
      <Features />
    </main>
  );
}
