import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full sm:max-w-sm p-6 rounded-b-none sm:rounded-2xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full grid place-items-center shrink-0"
                style={{ background: danger ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)" }}
              >
                <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-400" : "text-brand-400"}`} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base" style={{ color: "var(--fg)" }}>{title}</h3>
                {description && (
                  <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>{description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onCancel} className="btn btn-ghost flex-1">Cancel</button>
              <button
                onClick={onConfirm}
                className="btn flex-1"
                style={{ background: danger ? "#f87171" : "var(--color-brand-400)", color: danger ? "#fff" : "#04120c" }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
