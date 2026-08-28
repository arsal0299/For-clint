import { type ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
      >
        {icon ?? <Inbox className="w-6 h-6 text-brand-400" />}
      </div>
      <h4 className="font-display font-semibold text-base" style={{ color: "var(--fg)" }}>
        {title}
      </h4>
      {description && (
        <p className="text-sm mt-1 max-w-sm" style={{ color: "var(--fg-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
