"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import type { CourseSection, Term } from "@/lib/types";
import type { Filters } from "@/components/FilterPanel";
import { FilterPanel } from "@/components/FilterPanel";
import { CourseTable } from "@/components/CourseTable";
import { Search } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CoursesPage() {
  const [filters, setFilters] = useState<Filters>({
    term: "",
    subject: "CS",
    courseNumberMin: "",
    courseNumberMax: "",
    campusCode: "",
    campusDescription: "",
    session: "all",
    openOnly: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [queryKey, setQueryKey] = useState<string | null>(null);

  const { data: terms } = useSWR<Term[]>("/api/terms", fetcher);

  // Auto-select the most recent term once loaded
  useEffect(() => {
    if (terms?.length && !filters.term) {
      setFilters((f) => ({ ...f, term: terms[0].code }));
    }
  }, [terms]);

  const { data: campuses } = useSWR(
    filters.term ? `/api/campuses?term=${filters.term}` : null,
    fetcher
  );

  const { data: subjects } = useSWR(
    filters.term ? `/api/subjects?term=${filters.term}` : null,
    fetcher
  );

  // Build API query — fired only when user clicks Search
  const { data: searchResult, isLoading } = useSWR(queryKey, fetcher, {
    revalidateOnFocus: false,
  });

  const courses: CourseSection[] = searchResult?.data ?? [];

  // Client-side filtering
  const filtered = courses.filter((c) => {
    const num = parseInt(c.courseNumber, 10);
    if (filters.courseNumberMin && num < parseInt(filters.courseNumberMin, 10)) return false;
    if (filters.courseNumberMax && num > parseInt(filters.courseNumberMax, 10)) return false;
    // Campus filtering is now handled server-side via the Banner API
    if (filters.session !== "all" && c.summerSession !== filters.session) return false;
    if (filters.openOnly && c.seatsAvailable <= 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !c.courseTitle.toLowerCase().includes(q) &&
        !c.courseNumber.includes(q) &&
        !c.subjectCourse.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function handleSearch() {
    if (!filters.term) return;
    const p = new URLSearchParams({ term: filters.term, pageMaxSize: "500" });
    if (filters.subject) p.set("subject", filters.subject);
    if (filters.campusCode) p.set("campus", filters.campusCode);
    setQueryKey(`/api/courses?${p.toString()}`);
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          terms={terms ?? []}
          subjects={subjects ?? []}
          campuses={campuses ?? []}
          loading={isLoading}
        />
        <button
          className="mt-3 w-full bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          disabled={!filters.term || isLoading}
          onClick={handleSearch}
        >
          <Search className="w-4 h-4" />
          {isLoading ? "Searching…" : "Search Courses"}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-3">
        {queryKey && (
          <div className="flex items-center gap-3">
            <input
              className="flex-1 border border-slate-300 dark:border-[#243049] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#161c2d] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400"
              placeholder="Filter by title, number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {filtered.length} / {courses.length} sections
            </span>
          </div>
        )}

        {!queryKey ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-3">
            <Search className="w-10 h-10 opacity-40" />
            <p className="text-sm">Select a term and click Search to load courses.</p>
          </div>
        ) : (
          <CourseTable courses={filtered} loading={isLoading} />
        )}
      </main>
    </div>
  );
}
