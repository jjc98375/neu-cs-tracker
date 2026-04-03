"use client";

import React from "react";
import type { CourseSection, SummerSession } from "@/lib/types";
import { SessionBadge } from "./SessionBadge";
import { ChevronDown, ChevronUp, Users, Clock, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

/** Decode HTML entities like &amp; &lt; etc. */
function decodeHtml(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

interface Props {
  courses: CourseSection[];
  loading?: boolean;
}

type SortKey = "courseNumber" | "courseTitle" | "campusDescription" | "summerSession" | "seatsAvailable";

export function CourseTable({ courses, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("courseNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string | null>>({});
  const [loadingDesc, setLoadingDesc] = useState<Record<string, boolean>>({});
  const [facultyMap, setFacultyMap] = useState<Record<string, string>>({});
  const [loadingFaculty, setLoadingFaculty] = useState<Record<string, boolean>>({});

  // Fetch description + faculty when a row is expanded
  useEffect(() => {
    if (!expanded) return;
    const course = courses.find((c) => c.courseReferenceNumber === expanded);
    if (!course) return;

    // Fetch description
    if (!(expanded in descriptions)) {
      setLoadingDesc((prev) => ({ ...prev, [expanded]: true }));
      fetch(`/api/course-description?crn=${expanded}&term=${course.term}`)
        .then((r) => r.json())
        .then((data) => {
          setDescriptions((prev) => ({ ...prev, [expanded]: data.description ?? null }));
        })
        .catch(() => {
          setDescriptions((prev) => ({ ...prev, [expanded]: null }));
        })
        .finally(() => {
          setLoadingDesc((prev) => ({ ...prev, [expanded]: false }));
        });
    }

    // Fetch faculty
    if (!(expanded in facultyMap)) {
      setLoadingFaculty((prev) => ({ ...prev, [expanded]: true }));
      fetch(`/api/faculty?crn=${expanded}&term=${course.term}`)
        .then((r) => r.json())
        .then((data) => {
          const names = (data.faculty ?? [])
            .map((f: { displayName: string }) => f.displayName)
            .join(", ");
          setFacultyMap((prev) => ({ ...prev, [expanded]: names || "" }));
        })
        .catch(() => {
          setFacultyMap((prev) => ({ ...prev, [expanded]: "" }));
        })
        .finally(() => {
          setLoadingFaculty((prev) => ({ ...prev, [expanded]: false }));
        });
    }
  }, [expanded, courses, descriptions, facultyMap]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...courses].sort((a, b) => {
    let av = a[sortKey as keyof CourseSection];
    let bv = b[sortKey as keyof CourseSection];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return 0;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="w-4 h-4 opacity-0">↕</span>;
    return sortDir === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <div className="animate-pulse text-lg">Loading courses…</div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        No courses found. Try adjusting your filters.
      </div>
    );
  }

  const Th = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-[#1e2537] whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {children}
      <SortIcon col={col} />
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#243049] shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-[#161c2d] border-b border-slate-200 dark:border-[#243049]">
          <tr>
            <th className="w-8 px-3 py-2" />
            <Th col="courseNumber">Course</Th>
            <Th col="courseTitle">Title</Th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">CRN</th>
            <Th col="campusDescription">Campus</Th>
            <Th col="summerSession">Session</Th>
            <Th col="seatsAvailable">Seats</Th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Instructor</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#0d1117]">
          {sorted.map((c) => (
            <React.Fragment key={c.courseReferenceNumber}>
              <tr
                className="border-b border-slate-100 dark:border-[#1e2537] hover:bg-slate-50 dark:hover:bg-[#161c2d] cursor-pointer transition-colors"
                onClick={() =>
                  setExpanded(expanded === c.courseReferenceNumber ? null : c.courseReferenceNumber)
                }
              >
                <td className="px-3 py-2 text-slate-400">
                  {expanded === c.courseReferenceNumber ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </td>
                <td className="px-3 py-2 font-mono font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                  {c.subject} {c.courseNumber}
                  <span className="text-slate-400 font-normal ml-1 text-xs">§{c.sequenceNumber}</span>
                </td>
                <td className="px-3 py-2 text-slate-900 dark:text-slate-100 max-w-xs truncate">
                  {c.courseTitle}
                </td>
                <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400 text-xs">
                  {c.courseReferenceNumber}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {c.campusDescription || "—"}
                </td>
                <td className="px-3 py-2">
                  <SessionBadge session={c.summerSession} />
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      c.seatsAvailable > 0
                        ? "text-green-700 font-semibold"
                        : "text-red-600"
                    }
                  >
                    {c.seatsAvailable > 0
                      ? `${c.seatsAvailable} open`
                      : "Full"}
                  </span>
                  <span className="text-slate-400 text-xs ml-1">/ {c.maximumEnrollment}</span>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[12rem]">
                  {(() => {
                    // Use fetched faculty if available
                    if (c.courseReferenceNumber in facultyMap) {
                      return facultyMap[c.courseReferenceNumber] || "TBA";
                    }
                    // Check top-level faculty, then meetingsFaculty
                    const topLevel = c.faculty
                      .filter((f) => f.primaryIndicator && f.displayName)
                      .map((f) => f.displayName);
                    if (topLevel.length > 0) return topLevel.join(", ");
                    const fromMeetings = c.meetingsFaculty
                      .flatMap((mf) => mf.faculty)
                      .filter((f) => f.primaryIndicator && f.displayName)
                      .map((f) => f.displayName);
                    const unique = [...new Set(fromMeetings)];
                    return unique.length > 0 ? unique.join(", ") : "TBA";
                  })()}
                </td>
              </tr>

              {expanded === c.courseReferenceNumber && (
                <tr key={`${c.courseReferenceNumber}-detail`} className="bg-slate-50 dark:bg-[#161c2d] border-b border-slate-200 dark:border-[#243049]">
                  <td colSpan={8} className="px-6 py-4">
                    {/* Course Description */}
                    {loadingDesc[c.courseReferenceNumber] ? (
                      <div className="text-slate-400 text-sm mb-4 animate-pulse">Loading description…</div>
                    ) : descriptions[c.courseReferenceNumber] ? (
                      <div className="mb-4 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#1e2537] rounded-lg px-4 py-3 border border-slate-200 dark:border-[#243049]">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">Course Description</span>
                        <div dangerouslySetInnerHTML={{ __html: descriptions[c.courseReferenceNumber]! }} />
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm mb-4">No description available.</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {/* Meeting times */}
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Schedule
                        </div>
                        {c.meetingsFaculty.length === 0 ? (
                          <span className="text-slate-400">TBA</span>
                        ) : (
                          c.meetingsFaculty.map((mf, i) => {
                            const mt = mf.meetingTime;
                            const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
                              .filter((d) => mt[d as keyof typeof mt])
                              .map((d) => d.slice(0, 3).toUpperCase())
                              .join(" ");
                            return (
                              <div key={i} className="text-slate-600 dark:text-slate-300 mb-1">
                                <span className="font-mono">{days || "—"}</span>
                                {mt.beginTime && mt.endTime && (
                                  <span className="ml-2">{mt.beginTime}–{mt.endTime}</span>
                                )}
                                {mt.startDate && mt.endDate && (
                                  <span className="text-slate-400 ml-2 text-xs">({mt.startDate} – {mt.endDate})</span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Location */}
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> Location
                        </div>
                        {c.meetingsFaculty.map((mf, i) => {
                          const mt = mf.meetingTime;
                          return (
                            <div key={i} className="text-slate-600 dark:text-slate-300">
                              {mt.campusDescription || "—"}
                              {mt.buildingDescription && (
                                <span className="text-slate-400 ml-1">· {mt.buildingDescription} {mt.room}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Enrollment */}
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" /> Enrollment
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          {c.enrollment} / {c.maximumEnrollment} enrolled
                        </div>
                        {c.waitCapacity > 0 && (
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                            Waitlist: {c.waitCount} / {c.waitCapacity}
                          </div>
                        )}
                        <div className="mt-2">
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-[#243049] w-full max-w-[10rem]">
                            <div
                              className={`h-2 rounded-full ${c.seatsAvailable > 0 ? "bg-green-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(100, (c.enrollment / (c.maximumEnrollment || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-slate-500 dark:text-slate-400 text-xs">
                          {c.creditHours ?? c.creditHourHigh ?? "?"} credit(s) · {c.scheduleTypeDescription}
                        </div>
                        <div className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                          Part of term: <span className="font-mono">{c.partOfTerm || "1"}</span>
                        </div>
                        {/* Attributes */}
                        {c.sectionAttributes?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.sectionAttributes.map((a) => (
                              <span
                                key={a.code}
                                className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-xs px-1.5 py-0.5 rounded"
                              >
                                {decodeHtml(a.description)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
