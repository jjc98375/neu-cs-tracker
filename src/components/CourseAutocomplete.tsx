"use client";

import { useState, useRef, useEffect } from "react";
import { searchCatalog, parseCourseCode, type CatalogCourse } from "@/lib/course-catalog";
import { lookupBannerCourse } from "@/lib/course-lookup";

interface Props {
  onSelect: (course: CatalogCourse) => void;
  placeholder?: string;
  lookupFn?: (subject: string, courseNumber: string) => Promise<CatalogCourse | null>;
}

export function CourseAutocomplete({ onSelect, placeholder = "Search course (e.g. CS 6140 or machine learning)", lookupFn = lookupBannerCourse }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCourse[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = searchCatalog(query);
    setResults(local);
    setOpen(query.trim().length > 0);
    if (debounce.current) clearTimeout(debounce.current);
    if (local.length === 0) {
      const code = parseCourseCode(query);
      if (code) {
        setSearching(true);
        debounce.current = setTimeout(async () => {
          const hit = await lookupFn(code.subject, code.courseNumber);
          setSearching(false);
          if (hit) setResults([hit]);
        }, 300);
      } else {
        setSearching(false);
      }
    } else {
      setSearching(false);
    }
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, lookupFn]);

  function choose(c: CatalogCourse) {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="w-full border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { e.preventDefault(); choose(results[0]); } if (e.key === "Escape") setOpen(false); }}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1e2537] border border-slate-200 dark:border-[#243049] rounded-lg shadow-lg max-h-64 overflow-auto">
          {results.map((c) => (
            <button
              key={`${c.subject} ${c.courseNumber}`}
              type="button"
              onClick={() => choose(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-[#243049] flex items-center gap-2"
            >
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">{c.subject} {c.courseNumber}</span>
              <span className="text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
            </button>
          ))}
          {results.length === 0 && searching && <div className="px-3 py-2 text-sm text-slate-400">Searching catalog…</div>}
          {results.length === 0 && !searching && <div className="px-3 py-2 text-sm text-slate-400">No match — type the title manually in the fields below.</div>}
        </div>
      )}
    </div>
  );
}
