"use client";

import { ListChecks } from "lucide-react";

interface Item {
  id: string;
  label: string;
  description?: string;
}

interface MilestoneChecklistProps {
  title: string;
  items: Item[];
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}

/**
 * Manual checklist for things the engine cannot verify: PhD milestones
 * (qualifier, proposal, ...) and UG NUpath areas. Controlled — the parent
 * owns the checked state and persistence.
 */
export function MilestoneChecklist({ title, items, checks, onToggle }: MilestoneChecklistProps) {
  const doneCount = items.filter((i) => checks[i.id]).length;
  return (
    <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-red-600" /> {title}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {doneCount} of {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={`msc-${item.id}`}
              checked={!!checks[item.id]}
              onChange={() => onToggle(item.id)}
              className="mt-1 h-4 w-4 accent-red-600"
            />
            <label htmlFor={`msc-${item.id}`} className="text-sm cursor-pointer">
              <span className="text-slate-800 dark:text-slate-100">{item.label}</span>
              {item.description && (
                <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
