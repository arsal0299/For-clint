import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyField: (row: T) => string | number;
  loading?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  keyField,
  loading,
  emptyIcon,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  footer,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      {loading ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--fg-dim)" }} className="text-left">
                {columns.map((col) => (
                  <th key={col.header} className="px-5 py-3 font-semibold uppercase text-xs tracking-wide">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <motion.tr
                  key={keyField(row)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={`px-5 py-3.5 ${col.className || ""}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </div>
  );
}
