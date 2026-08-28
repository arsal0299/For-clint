import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative w-9 h-9 rounded-lg flex items-center justify-center transition btn-ghost border"
      style={{ borderColor: "var(--border)" }}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        {theme === "dark" ? (
          <Moon className="w-4.5 h-4.5 text-brand-400" />
        ) : (
          <Sun className="w-4.5 h-4.5 text-amber-500" />
        )}
      </motion.span>
    </button>
  );
}
