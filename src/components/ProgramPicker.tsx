"use client";

import clsx from "clsx";
import { PROGRAMS, PROGRAM_IDS, type ProgramId } from "@/data/programs";
import type { ProgramLevel } from "@/lib/program-schema";

const LEVEL_LABELS: Record<ProgramLevel, string> = {
  UG: "Undergraduate",
  MS: "Master's",
  PhD: "PhD",
};

const LEVEL_ORDER: ProgramLevel[] = ["UG", "MS", "PhD"];

interface ProgramPickerProps {
  value: ProgramId;
  onChange: (id: ProgramId) => void;
}

export default function ProgramPicker({ value, onChange }: ProgramPickerProps) {
  return (
    <div className="space-y-3">
      {LEVEL_ORDER.map((level) => {
        const ids = PROGRAM_IDS.filter((pid) => PROGRAMS[pid].level === level);
        if (ids.length === 0) return null;
        return (
          <div key={level}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
              {LEVEL_LABELS[level]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {ids.map((pid) => (
                <button
                  key={pid}
                  onClick={() => onChange(pid)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                    value === pid
                      ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500"
                      : "bg-white dark:bg-[#1e2537] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#243049] hover:border-red-400 dark:hover:border-red-500"
                  )}
                >
                  {PROGRAMS[pid].name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
