import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastState>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 w-[min(92vw,380px)]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="glass-solid rounded-xl p-3.5 pr-10 shadow-2xl flex items-start gap-3 relative"
            >
              {t.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              )}
              {t.type === "error" && (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              {t.type === "info" && (
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <p className="text-sm leading-snug" style={{ color: "var(--fg)" }}>
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                className="absolute top-2.5 right-2.5 opacity-50 hover:opacity-100 transition"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
