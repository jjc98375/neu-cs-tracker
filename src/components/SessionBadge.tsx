import type { SummerSession } from "@/lib/types";
import { clsx } from "clsx";

const SESSION_STYLES: Record<SummerSession, string> = {
  Full:    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700/50",
  Summer1: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/50",
  Summer2: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700/50",
  "N/A":   "bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600/50",
};

const SESSION_LABELS: Record<SummerSession, string> = {
  Full: "Full Summer",
  Summer1: "Summer 1",
  Summer2: "Summer 2",
  "N/A": "—",
};

export function SessionBadge({ session }: { session: SummerSession }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        SESSION_STYLES[session]
      )}
    >
      {SESSION_LABELS[session]}
    </span>
  );
}
