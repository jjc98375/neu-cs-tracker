"use client";

import { useState, useEffect, useCallback } from "react";
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
    campus: "",
    session: "all",
    openOnly: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  const { data: terms } = useSWR<Term[]>("/api/terms", fetcher);

  // Auto-select the most recent term
  useEffect(() => {
    if (terms?.length && !filters.term) {
      setFilters((f) => ({ ...f, term: terms[0].code }));
    }
  }, [terms]);

  const { data: campuses } = useSWR(
    filters.term ? `/api/campuses?term=${filters.term}` : null,
    fetcher
  );

  // Build query string from filters
  function buildQuery() {
    const p = new URLSearchParams({ term: filters.term });
    if (filters.subject) p.set("subject", filters.subject);
    return `/api/courses?${p.toString()}`;
  }

  const {
    data: searchResult,
    isLoading,
    mutate,
  } = useSWR(hasFetched && filters.term ? buildQuery() : null, fetcher, {
    revalidateOnFocus: false,
  });

  const courses: CourseSection[] = searchResult?.data ?? [];

  // Client-side filter
  const filtered = courses.filter((c) => {
    const num = parseInt(c.courseNumber, 10);
    if (filters.courseNumberMin && num < parseInt(filters.courseNumberMin, 10)) return false;
    if (filters.courseNumberMax && num > parseInt(filters.courseNumberMax, 10)) return false;
    if (filters.campus && c.campusDescription !== campuses?.find((x: {code:string;description:string}) => x.code === filters.campus)?.description) return false;
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
    setHasFetched(true);
    mutate();
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          terms={terms ?? []}
          campuses={campuses ?? []}
          loading={isLoading}
        />
        <button
          className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          disabled={!filters.term || isLoading}
          onClick={handleSearch}
        >
          <Search className="w-4 h-4" />
          {isLoading ? "Searching…" : "Search Courses"}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-3">
        {hasFetched && (
          <div className="flex items-center gap-3">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Filter by title, number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {filtered.length} / {courses.length} sections
            </span>
          </div>
        )}

        {!hasFetched ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-3">
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
