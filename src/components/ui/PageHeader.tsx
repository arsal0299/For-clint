import { type ReactNode } from "react";
import { motion } from "motion/react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-start justify-between gap-4 mb-7"
    >
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl" style={{ color: "var(--fg)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1.5" style={{ color: "var(--fg-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </motion.div>
  );
}
