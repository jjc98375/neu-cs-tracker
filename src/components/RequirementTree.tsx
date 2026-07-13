"use client";

import { useState } from "react";
import { CheckCircle, Circle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { NodeStatus } from "@/lib/requirements-engine";

function StateIcon({ state }: { state: NodeStatus["state"] }) {
  if (state === "complete") return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (state === "planned") return <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  if (state === "partial") return <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />;
  return <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />;
}

function progressText(s: NodeStatus): string {
  return s.unit === "credits" ? `${s.earned} of ${s.required} credits` : `${s.earned} of ${s.required}`;
}

function LeafRow({ status }: { status: NodeStatus }) {
  const node = status.node;
  const heading =
    node.type === "course" ? (
      <>
        <span className="font-mono font-semibold text-red-600 dark:text-red-400">
          {node.subject} {node.number}
        </span>
        <span className="truncate text-slate-700 dark:text-slate-200">{node.title}</span>
        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{node.credits} cr</span>
      </>
    ) : node.type === "range" ? (
      <span className="text-slate-700 dark:text-slate-200">
        {node.label ?? `Any ${node.subject} ${node.minNumber}–${node.maxNumber}`}
      </span>
    ) : null;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 p-3 rounded-lg border text-sm",
        status.state === "complete" && "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30",
        status.state === "planned" && "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30",
        status.state === "missing" && "bg-slate-50 dark:bg-[#1e2537] border-slate-100 dark:border-[#243049]"
      )}
    >
      <StateIcon state={status.state} />
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">{heading}</div>
      {status.matches.length > 0 && (
        <span className="text-xs text-slate-400 flex-shrink-0">
          {status.matches.map((m) => `${m.subject} ${m.courseNumber}`).join(", ")}
        </span>
      )}
    </div>
  );
}

function GroupSection({ status, depth }: { status: NodeStatus; depth: number }) {
  const [open, setOpen] = useState(true);
  const node = status.node;
  if (node.type === "course" || node.type === "range") return <LeafRow status={status} />;

  return (
    <div className={clsx(depth > 0 && "ml-4 border-l-2 border-slate-100 dark:border-[#243049] pl-3")}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2 text-left"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <StateIcon state={status.state} />
        <span className="font-medium text-slate-800 dark:text-slate-100">{node.label}</span>
        <span
          className={clsx(
            "text-xs px-2 py-0.5 rounded-full border ml-auto flex-shrink-0",
            status.state === "complete"
              ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1e2537] border-slate-200 dark:border-[#243049]"
          )}
        >
          {progressText(status)}
        </span>
      </button>
      {open && (
        <div className="space-y-2">
          {status.children.map((child, i) => (
            <GroupSection key={i} status={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Recursive, collapsible rendering of an evaluated requirement tree. */
export function RequirementTree({ status }: { status: NodeStatus }) {
  return <GroupSection status={status} depth={0} />;
}
