import type { SummerSession } from "@/lib/types";
import { clsx } from "clsx";

const SESSION_STYLES: Record<SummerSession, string> = {
  Full: "bg-blue-100 text-blue-800 border-blue-200",
  Summer1: "bg-amber-100 text-amber-800 border-amber-200",
  Summer2: "bg-green-100 text-green-800 border-green-200",
  "N/A": "bg-gray-100 text-gray-500 border-gray-200",
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
