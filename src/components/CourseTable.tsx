"use client";

import type { CourseSection, SummerSession } from "@/lib/types";
import { SessionBadge } from "./SessionBadge";
import { ChevronDown, ChevronUp, Users, Clock, MapPin } from "lucide-react";
import { useState } from "react";

interface Props {
  courses: CourseSection[];
  loading?: boolean;
}

type SortKey = "courseNumber" | "courseTitle" | "campusDescription" | "summerSession" | "seatsAvailable";

export function CourseTable({ courses, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("courseNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);

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
      <div className="flex items-center justify-center h-48 text-gray-400">
        <div className="animate-pulse text-lg">Loading courses…</div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No courses found. Try adjusting your filters.
      </div>
    );
  }

  const Th = ({
    col,
    children,
  }: {
    col: SortKey;
    children: React.ReactNode;
  }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {children}
      <SortIcon col={col} />
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-8 px-3 py-2" />
            <Th col="courseNumber">Course</Th>
            <Th col="courseTitle">Title</Th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">CRN</th>
            <Th col="campusDescription">Campus</Th>
            <Th col="summerSession">Session</Th>
            <Th col="seatsAvailable">Seats</Th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Instructor</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <>
              <tr
                key={c.courseReferenceNumber}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  setExpanded(
                    expanded === c.courseReferenceNumber
                      ? null
                      : c.courseReferenceNumber
                  )
                }
              >
                <td className="px-3 py-2 text-gray-400">
                  {expanded === c.courseReferenceNumber ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </td>
                <td className="px-3 py-2 font-mono font-semibold text-red-700 whitespace-nowrap">
                  {c.subject} {c.courseNumber}
                  <span className="text-gray-400 font-normal ml-1 text-xs">
                    §{c.sequenceNumber}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-900 max-w-xs truncate">
                  {c.courseTitle}
                </td>
                <td className="px-3 py-2 font-mono text-gray-500 text-xs">
                  {c.courseReferenceNumber}
                </td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
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
                  <span className="text-gray-400 text-xs ml-1">
                    / {c.maximumEnrollment}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600 truncate max-w-[12rem]">
                  {c.faculty
                    .filter((f) => f.primaryIndicator)
                    .map((f) => f.displayName)
                    .join(", ") || "TBA"}
                </td>
              </tr>

              {expanded === c.courseReferenceNumber && (
                <tr key={`${c.courseReferenceNumber}-detail`} className="bg-gray-50 border-b border-gray-200">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {/* Meeting times */}
                      <div>
                        <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Schedule
                        </div>
                        {c.meetingsFaculty.length === 0 ? (
                          <span className="text-gray-400">TBA</span>
                        ) : (
                          c.meetingsFaculty.map((mf, i) => {
                            const mt = mf.meetingTime;
                            const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
                              .filter((d) => mt[d as keyof typeof mt])
                              .map((d) => d.slice(0, 3).toUpperCase())
                              .join(" ");
                            return (
                              <div key={i} className="text-gray-600 mb-1">
                                <span className="font-mono">{days || "—"}</span>
                                {mt.beginTime && mt.endTime && (
                                  <span className="ml-2">
                                    {mt.beginTime}–{mt.endTime}
                                  </span>
                                )}
                                {mt.startDate && mt.endDate && (
                                  <span className="text-gray-400 ml-2 text-xs">
                                    ({mt.startDate} – {mt.endDate})
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Location */}
                      <div>
                        <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> Location
                        </div>
                        {c.meetingsFaculty.map((mf, i) => {
                          const mt = mf.meetingTime;
                          return (
                            <div key={i} className="text-gray-600">
                              {mt.campusDescription || "—"}
                              {mt.buildingDescription && (
                                <span className="text-gray-400 ml-1">
                                  · {mt.buildingDescription} {mt.room}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Enrollment */}
                      <div>
                        <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" /> Enrollment
                        </div>
                        <div className="text-gray-600">
                          {c.enrollment} / {c.maximumEnrollment} enrolled
                        </div>
                        {c.waitCapacity > 0 && (
                          <div className="text-gray-500 text-xs mt-1">
                            Waitlist: {c.waitCount} / {c.waitCapacity}
                          </div>
                        )}
                        <div className="mt-2">
                          <div className="h-2 rounded-full bg-gray-200 w-full max-w-[10rem]">
                            <div
                              className={`h-2 rounded-full ${
                                c.seatsAvailable > 0
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (c.enrollment / (c.maximumEnrollment || 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        {/* Credits */}
                        <div className="mt-2 text-gray-500 text-xs">
                          {c.creditHours ?? c.creditHourHigh ?? "?"} credit(s) ·{" "}
                          {c.scheduleTypeDescription}
                        </div>
                        {/* Part of term */}
                        <div className="mt-1 text-gray-500 text-xs">
                          Part of term:{" "}
                          <span className="font-mono">{c.partOfTerm || "1"}</span>
                        </div>
                        {/* Attributes */}
                        {c.sectionAttributes?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.sectionAttributes.map((a) => (
                              <span
                                key={a.code}
                                className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-1.5 py-0.5 rounded"
                              >
                                {a.description}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
