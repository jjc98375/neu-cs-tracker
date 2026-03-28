"use client";

import type { Term } from "@/lib/types";
import type { SummerSession } from "@/lib/types";

export interface Filters {
  term: string;
  subject: string;
  courseNumberMin: string;
  courseNumberMax: string;
  campus: string;
  session: SummerSession | "all";
  openOnly: boolean;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  terms: Term[];
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

export function FilterPanel({ filters, onChange, terms, campuses, loading }: Props) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
        Filters
      </h2>

      {/* Term */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Term</label>
        <select
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filters.term}
          onChange={(e) => set("term", e.target.value)}
        >
          <option value="">— select term —</option>
          {terms.map((t) => (
            <option key={t.code} value={t.code}>
              {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Subject</label>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="e.g. CS"
          value={filters.subject}
          onChange={(e) => set("subject", e.target.value.toUpperCase())}
        />
      </div>

      {/* Course number range */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Course # range</label>
        <div className="flex gap-2">
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Min (e.g. 5000)"
            value={filters.courseNumberMin}
            onChange={(e) => set("courseNumberMin", e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Max (e.g. 6999)"
            value={filters.courseNumberMax}
            onChange={(e) => set("courseNumberMax", e.target.value)}
          />
        </div>
      </div>

      {/* Campus */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Campus</label>
        <select
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filters.campus}
          onChange={(e) => set("campus", e.target.value)}
        >
          <option value="">All Campuses</option>
          {campuses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.description}
            </option>
          ))}
        </select>
      </div>

      {/* Summer session */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Summer Session</label>
        <select
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filters.session}
          onChange={(e) => set("session", e.target.value as Filters["session"])}
        >
          {SESSIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Open seats only */}
      <div className="flex items-center gap-2">
        <input
          id="openOnly"
          type="checkbox"
          className="w-4 h-4 accent-red-600"
          checked={filters.openOnly}
          onChange={(e) => set("openOnly", e.target.checked)}
        />
        <label htmlFor="openOnly" className="text-sm text-gray-700 cursor-pointer">
          Open seats only
        </label>
      </div>

      {loading && (
        <div className="text-xs text-gray-400 animate-pulse">Fetching…</div>
      )}
    </div>
  );
}
