import { useEffect, useState } from "react";
import { motion } from "motion/react";

/** Thin gradient progress bar fixed at the very top of the viewport. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[80] origin-left"
      style={{
        background: "linear-gradient(90deg, #34d399, #22d3ee, #8b5cf6)",
        scaleX: progress / 100,
      }}
    />
  );
}
