"use client";

import type { Term } from "@/lib/types";
import type { SummerSession } from "@/lib/types";
import { isSummerTerm } from "@/lib/banner-api";

export interface Filters {
  term: string;
  subject: string;          // Banner subject code e.g. "CS"
  courseNumberMin: string;
  courseNumberMax: string;
  campusCode: string;        // Banner campus code sent to API
  campusDescription: string; // campus description for client-side filtering
  session: SummerSession | "all";
  openOnly: boolean;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  terms: Term[];
  subjects: { code: string; description: string }[];
  campuses: { code: string; description: string }[];
  loading?: boolean;
}

const SESSIONS: { value: Filters["session"]; label: string }[] = [
  { value: "all", label: "All Sessions" },
  { value: "Full", label: "Full Summer" },
  { value: "Summer1", label: "Summer 1 (First Half)" },
  { value: "Summer2", label: "Summer 2 (Second Half)" },
  { value: "N/A", label: "N/A (Non-Summer)" },
];

export function FilterPanel({ filters, onChange, terms, subjects, campuses, loading }: Props) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const inputCls = "w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1e2537] border-slate-300 dark:border-[#243049] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const labelCls = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-4 space-y-4 shadow-sm">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wide">
        Filters
      </h2>

      {/* Term */}
      <div>
        <label className={labelCls}>Term</label>
        <select className={inputCls} value={filters.term} onChange={(e) => {
          const newTerm = e.target.value;
          const updates: Partial<Filters> = { term: newTerm };
          if (!isSummerTerm(newTerm)) updates.session = "all";
          onChange({ ...filters, ...updates });
        }}>
          <option value="">— select term —</option>
          {terms.map((t) => (
            <option key={t.code} value={t.code}>{t.description}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className={labelCls}>Subject</label>
        <select
          className={inputCls}
          value={filters.subject}
          onChange={(e) => set("subject", e.target.value)}
          disabled={!filters.term}
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.code} value={s.code}>{s.code} — {s.description}</option>
          ))}
        </select>
        {!filters.term && (
          <p className="text-xs text-slate-400 mt-1">Select a term first</p>
        )}
      </div>

      {/* Course number range */}
      <div>
        <label className={labelCls}>Course # range</label>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Min e.g. 5000" value={filters.courseNumberMin} onChange={(e) => set("courseNumberMin", e.target.value)} />
          <input className={inputCls} placeholder="Max e.g. 7999" value={filters.courseNumberMax} onChange={(e) => set("courseNumberMax", e.target.value)} />
        </div>
      </div>

      {/* Campus */}
      <div>
        <label className={labelCls}>Campus</label>
        <select className={inputCls} value={filters.campusCode} onChange={(e) => {
          const selected = campuses.find((c) => c.code === e.target.value);
          onChange({ ...filters, campusCode: e.target.value, campusDescription: selected?.description ?? "" });
        }}>
          <option value="">All Campuses</option>
          {campuses.map((c) => (
            <option key={c.code} value={c.code}>{c.description}</option>
          ))}
        </select>
      </div>

      {/* Summer session — only shown for summer terms */}
      {isSummerTerm(filters.term) && (
        <div>
          <label className={labelCls}>Summer Session</label>
          <select className={inputCls} value={filters.session} onChange={(e) => set("session", e.target.value as Filters["session"])}>
            {SESSIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Open seats only */}
      <div className="flex items-center gap-2">
        <input
          id="openOnly"
          type="checkbox"
          className="w-4 h-4 accent-red-600 dark:accent-red-500"
          checked={filters.openOnly}
          onChange={(e) => set("openOnly", e.target.checked)}
        />
        <label htmlFor="openOnly" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          Open seats only
        </label>
      </div>

      {loading && <div className="text-xs text-slate-400 animate-pulse">Fetching…</div>}
    </div>
  );
}
