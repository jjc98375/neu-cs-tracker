"use client";

import { useState } from "react";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";
import type { ProgramId } from "@/lib/requirements";
import { PROGRAMS, analyzeGraduation } from "@/lib/requirements";
import { CheckCircle, Circle, Clock, AlertCircle, Plus, Trash2, GraduationCap, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

const EMPTY_COMPLETED: CompletedCourse = {
  subject: "", courseNumber: "", title: "", credits: 4, term: "", grade: "",
};
const EMPTY_PLANNED: PlannedCourse = {
  subject: "", courseNumber: "", title: "", credits: 4, term: "",
};

// Term options for selects
const TERM_OPTIONS = [
  { code: "202630", label: "Fall 2026" },
  { code: "202610", label: "Spring 2026" },
  { code: "202650", label: "Summer 2026" },
  { code: "202530", label: "Fall 2025" },
  { code: "202510", label: "Spring 2025" },
  { code: "202550", label: "Summer 2025" },
  { code: "202430", label: "Fall 2024" },
  { code: "202410", label: "Spring 2024" },
  { code: "202330", label: "Fall 2023" },
  { code: "202310", label: "Spring 2023" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Core:         "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300",
  Systems:      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300",
  Theory:       "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300",
  Applications: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300",
  Elective:     "bg-slate-100 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600/40 text-slate-600 dark:text-slate-300",
  Capstone:     "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300",
  Math:         "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-300",
};

export function RequirementChecker() {
  const [program, setProgram] = useState<ProgramId>("MSCS");
  const [completed, setCompleted] = useState<CompletedCourse[]>([]);
  const [planned, setPlanned] = useState<PlannedCourse[]>([]);
  const [addingCompleted, setAddingCompleted] = useState(false);
  const [addingPlanned, setAddingPlanned] = useState(false);
  const [newCompleted, setNewCompleted] = useState<CompletedCourse>({ ...EMPTY_COMPLETED });
  const [newPlanned, setNewPlanned] = useState<PlannedCourse>({ ...EMPTY_PLANNED });

  const analysis = analyzeGraduation(program, completed, planned);
  const prog = PROGRAMS[program];

  const progressPct = Math.min(
    100,
    ((analysis.totalCreditsCompleted + analysis.totalCreditsPlanned) /
      analysis.totalCreditsRequired) *
      100
  );

  return (
    <div className="space-y-6">
      {/* Program selector */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(PROGRAMS) as ProgramId[]).map((pid) => (
          <button
            key={pid}
            onClick={() => setProgram(pid)}
            className={clsx(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              program === pid
                ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500"
                : "bg-white dark:bg-[#1e2537] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#243049] hover:border-red-400 dark:hover:border-red-500"
            )}
          >
            {PROGRAMS[pid].name}
          </button>
        ))}
      </div>

      {/* Progress summary */}
      <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-red-600" />
              {prog.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{prog.totalCredits} credit program</p>
          </div>
          {analysis.onTrack ? (
            <span className="flex items-center gap-1 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs font-semibold px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4" /> On Track
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
              <AlertCircle className="w-4 h-4" /> Incomplete
            </span>
          )}
        </div>

        {/* Credit bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{analysis.totalCreditsCompleted} completed</span>
            <span>{analysis.totalCreditsPlanned} planned</span>
            <span>{analysis.totalCreditsRemaining} remaining</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-[#243049] overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${(analysis.totalCreditsCompleted / prog.totalCredits) * 100}%`,
              }}
            />
            <div
              className="h-full bg-blue-400 transition-all"
              style={{
                width: `${(analysis.totalCreditsPlanned / prog.totalCredits) * 100}%`,
              }}
            />
          </div>
          <div className="flex gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Planned</span>
          </div>
        </div>

        {/* Expected grad */}
        {analysis.expectedGraduationTerm && (
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#1e2537] rounded-lg px-3 py-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span>Expected graduation: <strong>{analysis.expectedGraduationTerm}</strong></span>
          </div>
        )}
      </div>

      {/* Requirements list */}
      <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Program Requirements</h3>
        <div className="space-y-2">
          {analysis.requirementStatuses.map((s) => {
            const req = s.requirement;
            return (
              <div
                key={`${req.subject}-${req.courseNumber}`}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg border text-sm",
                  s.status === "completed" && "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30",
                  s.status === "planned" && "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30",
                  s.status === "missing" && "bg-slate-50 dark:bg-[#1e2537] border-slate-100 dark:border-[#243049]"
                )}
              >
                {s.status === "completed" ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : s.status === "planned" ? (
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                      {req.subject} {req.courseNumber}
                    </span>
                    <span className="truncate text-slate-700 dark:text-slate-200">{req.title}</span>
                    <span
                      className={clsx(
                        "text-xs px-1.5 py-0.5 rounded border",
                        CATEGORY_COLORS[req.category] ?? "bg-slate-100 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600/40 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      {req.category}
                    </span>
                    {req.groupId && (
                      <span className="text-xs text-slate-400">
                        (group: {req.groupId})
                      </span>
                    )}
                    {!req.required && (
                      <span className="text-xs text-slate-400 italic">optional</span>
                    )}
                  </div>
                  {s.status === "completed" && s.completedBy && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      Completed ·{" "}
                      {TERM_OPTIONS.find((t) => t.code === s.completedBy?.term)?.label ??
                        s.completedBy.term}
                      {s.completedBy.grade && ` · Grade: ${s.completedBy.grade}`}
                    </div>
                  )}
                  {s.status === "planned" && s.plannedBy && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      Planned ·{" "}
                      {TERM_OPTIONS.find((t) => t.code === s.plannedBy?.term)?.label ??
                        s.plannedBy?.term}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{req.credits} cr</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add completed courses */}
      <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Completed Courses</h3>
          <button
            onClick={() => setAddingCompleted(!addingCompleted)}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {addingCompleted && (
          <div className="border border-slate-200 dark:border-[#243049] rounded-lg p-4 mb-4 bg-slate-50 dark:bg-[#1e2537] grid grid-cols-2 md:grid-cols-3 gap-3">
            {(["subject", "courseNumber", "title"] as const).map((field) => (
              <input
                key={field}
                className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
                placeholder={{ subject: "Subject (e.g. CS)", courseNumber: "Number (e.g. 6140)", title: "Title" }[field]}
                value={newCompleted[field]}
                onChange={(e) => setNewCompleted({ ...newCompleted, [field]: e.target.value })}
              />
            ))}
            <input
              type="number"
              className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
              placeholder="Credits"
              value={newCompleted.credits}
              onChange={(e) => setNewCompleted({ ...newCompleted, credits: parseInt(e.target.value) || 0 })}
            />
            <select
              className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
              value={newCompleted.term}
              onChange={(e) => setNewCompleted({ ...newCompleted, term: e.target.value })}
            >
              <option value="">Select term</option>
              {TERM_OPTIONS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <input
              className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
              placeholder="Grade (optional)"
              value={newCompleted.grade ?? ""}
              onChange={(e) => setNewCompleted({ ...newCompleted, grade: e.target.value })}
            />
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <button
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700"
                onClick={() => {
                  if (newCompleted.subject && newCompleted.courseNumber && newCompleted.term) {
                    setCompleted([...completed, { ...newCompleted }]);
                    setNewCompleted({ ...EMPTY_COMPLETED });
                    setAddingCompleted(false);
                  }
                }}
              >
                Add Course
              </button>
              <button
                className="text-slate-500 px-3 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-[#243049]"
                onClick={() => setAddingCompleted(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {completed.length === 0 ? (
          <p className="text-sm text-slate-400">No completed courses added yet.</p>
        ) : (
          <div className="space-y-1">
            {completed.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">{c.subject} {c.courseNumber}</span>
                <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
                <span className="text-slate-400 text-xs">{c.credits} cr</span>
                {c.grade && <span className="text-slate-500 dark:text-slate-400 text-xs">{c.grade}</span>}
                <button
                  onClick={() => setCompleted(completed.filter((_, j) => j !== i))}
                  className="text-slate-300 dark:text-slate-600 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add planned courses */}
      <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Planned Courses</h3>
          <button
            onClick={() => setAddingPlanned(!addingPlanned)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {addingPlanned && (
          <div className="border border-slate-200 dark:border-[#243049] rounded-lg p-4 mb-4 bg-slate-50 dark:bg-[#1e2537] grid grid-cols-2 md:grid-cols-3 gap-3">
            {(["subject", "courseNumber", "title"] as const).map((field) => (
              <input
                key={field}
                className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
                placeholder={{ subject: "Subject (e.g. CS)", courseNumber: "Number (e.g. 7150)", title: "Title" }[field]}
                value={newPlanned[field]}
                onChange={(e) => setNewPlanned({ ...newPlanned, [field]: e.target.value })}
              />
            ))}
            <input
              type="number"
              className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
              placeholder="Credits"
              value={newPlanned.credits}
              onChange={(e) => setNewPlanned({ ...newPlanned, credits: parseInt(e.target.value) || 0 })}
            />
            <select
              className="border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
              value={newPlanned.term}
              onChange={(e) => setNewPlanned({ ...newPlanned, term: e.target.value })}
            >
              <option value="">Select term</option>
              {TERM_OPTIONS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <button
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
                onClick={() => {
                  if (newPlanned.subject && newPlanned.courseNumber && newPlanned.term) {
                    setPlanned([...planned, { ...newPlanned }]);
                    setNewPlanned({ ...EMPTY_PLANNED });
                    setAddingPlanned(false);
                  }
                }}
              >
                Add Course
              </button>
              <button
                className="text-slate-500 px-3 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-[#243049]"
                onClick={() => setAddingPlanned(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {planned.length === 0 ? (
          <p className="text-sm text-slate-400">No planned courses added yet.</p>
        ) : (
          <div className="space-y-1">
            {planned.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-sm">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">{c.subject} {c.courseNumber}</span>
                <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
                <span className="text-slate-400 text-xs">{c.credits} cr</span>
                <button
                  onClick={() => setPlanned(planned.filter((_, j) => j !== i))}
                  className="text-slate-300 dark:text-slate-600 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing requirements */}
      {analysis.missingRequirements.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Missing Requirements
          </h3>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {analysis.missingRequirements.map((r) => (
              <li key={`${r.subject}-${r.courseNumber}`} className="flex items-center gap-2">
                <span className="font-mono font-semibold">{r.subject} {r.courseNumber}</span>
                <span>{r.title}</span>
                {r.groupId && <span className="text-amber-500 text-xs">(choose 1 from group)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
