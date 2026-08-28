import { Loader2 } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`w-5 h-5 animate-spin ${className}`} />;
}

export function FullPageSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner className="w-8 h-8 text-brand-400" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-shimmer bg-white/5 ${className}`}
      style={{ background: "var(--panel)" }}
    />
  );
}
