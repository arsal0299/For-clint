import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Wrench } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { Logo } from "../components/Logo";

function useCountdown(target: string | undefined) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    if (!target) {
      setLeft("");
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLeft("any moment now");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}

export function Maintenance() {
  const { settings } = useSettings();
  const countdown = useCountdown(settings.maintenance_end);

  return (
    <div className="min-h-screen grid place-items-center px-5 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="mb-5 w-14 h-14 rounded-2xl grid place-items-center mx-auto" style={{ background: "rgba(52,211,153,0.12)" }}>
          <Wrench className="w-7 h-7 text-brand-400" />
        </div>
        <h1 className="font-display font-bold text-2xl mb-2" style={{ color: "var(--fg)" }}>
          {settings.maintenance_title || "We'll be back soon"}
        </h1>
        <p style={{ color: "var(--fg-muted)" }}>
          {settings.maintenance_message || "The site is undergoing scheduled maintenance. Please check back shortly."}
        </p>
        {countdown && (
          <p className="mt-5 font-mono font-bold text-lg text-brand-400">{countdown}</p>
        )}
      </motion.div>
      <div className="fixed bottom-5 right-5">
        <ThemeToggle />
      </div>
    </div>
  );
}
