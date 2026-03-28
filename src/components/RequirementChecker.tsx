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
  Core: "bg-blue-50 border-blue-200 text-blue-700",
  Systems: "bg-orange-50 border-orange-200 text-orange-700",
  Theory: "bg-purple-50 border-purple-200 text-purple-700",
  Applications: "bg-green-50 border-green-200 text-green-700",
  Elective: "bg-gray-50 border-gray-200 text-gray-700",
  Capstone: "bg-red-50 border-red-200 text-red-700",
  Math: "bg-yellow-50 border-yellow-200 text-yellow-700",
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
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
            )}
          >
            {PROGRAMS[pid].name}
          </button>
        ))}
      </div>

      {/* Progress summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-red-600" />
              {prog.name}
            </h2>
            <p className="text-sm text-gray-500">{prog.totalCredits} credit program</p>
          </div>
          {analysis.onTrack ? (
            <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs font-semibold px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4" /> On Track
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
              <AlertCircle className="w-4 h-4" /> Incomplete
            </span>
          )}
        </div>

        {/* Credit bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{analysis.totalCreditsCompleted} completed</span>
            <span>{analysis.totalCreditsPlanned} planned</span>
            <span>{analysis.totalCreditsRemaining} remaining</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
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
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Planned</span>
          </div>
        </div>

        {/* Expected grad */}
        {analysis.expectedGraduationTerm && (
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span>Expected graduation: <strong>{analysis.expectedGraduationTerm}</strong></span>
          </div>
        )}
      </div>

      {/* Requirements list */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Program Requirements</h3>
        <div className="space-y-2">
          {analysis.requirementStatuses.map((s) => {
            const req = s.requirement;
            return (
              <div
                key={`${req.subject}-${req.courseNumber}`}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg border text-sm",
                  s.status === "completed" && "bg-green-50 border-green-100",
                  s.status === "planned" && "bg-blue-50 border-blue-100",
                  s.status === "missing" && "bg-gray-50 border-gray-100"
                )}
              >
                {s.status === "completed" ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : s.status === "planned" ? (
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-red-700">
                      {req.subject} {req.courseNumber}
                    </span>
                    <span className="truncate text-gray-700">{req.title}</span>
                    <span
                      className={clsx(
                        "text-xs px-1.5 py-0.5 rounded border",
                        CATEGORY_COLORS[req.category] ?? "bg-gray-50 border-gray-200 text-gray-600"
                      )}
                    >
                      {req.category}
                    </span>
                    {req.groupId && (
                      <span className="text-xs text-gray-400">
                        (group: {req.groupId})
                      </span>
                    )}
                    {!req.required && (
                      <span className="text-xs text-gray-400 italic">optional</span>
                    )}
                  </div>
                  {s.status === "completed" && s.completedBy && (
                    <div className="text-xs text-green-600 mt-0.5">
                      Completed ·{" "}
                      {TERM_OPTIONS.find((t) => t.code === s.completedBy?.term)?.label ??
                        s.completedBy.term}
                      {s.completedBy.grade && ` · Grade: ${s.completedBy.grade}`}
                    </div>
                  )}
                  {s.status === "planned" && s.plannedBy && (
                    <div className="text-xs text-blue-600 mt-0.5">
                      Planned ·{" "}
                      {TERM_OPTIONS.find((t) => t.code === s.plannedBy?.term)?.label ??
                        s.plannedBy?.term}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{req.credits} cr</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add completed courses */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Completed Courses</h3>
          <button
            onClick={() => setAddingCompleted(!addingCompleted)}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {addingCompleted && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 grid grid-cols-2 md:grid-cols-3 gap-3">
            {(["subject", "courseNumber", "title"] as const).map((field) => (
              <input
                key={field}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder={{ subject: "Subject (e.g. CS)", courseNumber: "Number (e.g. 6140)", title: "Title" }[field]}
                value={newCompleted[field]}
                onChange={(e) => setNewCompleted({ ...newCompleted, [field]: e.target.value })}
              />
            ))}
            <input
              type="number"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="Credits"
              value={newCompleted.credits}
              onChange={(e) => setNewCompleted({ ...newCompleted, credits: parseInt(e.target.value) || 0 })}
            />
            <select
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={newCompleted.term}
              onChange={(e) => setNewCompleted({ ...newCompleted, term: e.target.value })}
            >
              <option value="">Select term</option>
              {TERM_OPTIONS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <input
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
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
                className="text-gray-500 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
                onClick={() => setAddingCompleted(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {completed.length === 0 ? (
          <p className="text-sm text-gray-400">No completed courses added yet.</p>
        ) : (
          <div className="space-y-1">
            {completed.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-green-50 border border-green-100 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="font-mono font-semibold text-red-700">{c.subject} {c.courseNumber}</span>
                <span className="flex-1 text-gray-700 truncate">{c.title}</span>
                <span className="text-gray-400 text-xs">{c.credits} cr</span>
                {c.grade && <span className="text-gray-500 text-xs">{c.grade}</span>}
                <button
                  onClick={() => setCompleted(completed.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add planned courses */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Planned Courses</h3>
          <button
            onClick={() => setAddingPlanned(!addingPlanned)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {addingPlanned && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 grid grid-cols-2 md:grid-cols-3 gap-3">
            {(["subject", "courseNumber", "title"] as const).map((field) => (
              <input
                key={field}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder={{ subject: "Subject (e.g. CS)", courseNumber: "Number (e.g. 7150)", title: "Title" }[field]}
                value={newPlanned[field]}
                onChange={(e) => setNewPlanned({ ...newPlanned, [field]: e.target.value })}
              />
            ))}
            <input
              type="number"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="Credits"
              value={newPlanned.credits}
              onChange={(e) => setNewPlanned({ ...newPlanned, credits: parseInt(e.target.value) || 0 })}
            />
            <select
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
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
                className="text-gray-500 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
                onClick={() => setAddingPlanned(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {planned.length === 0 ? (
          <p className="text-sm text-gray-400">No planned courses added yet.</p>
        ) : (
          <div className="space-y-1">
            {planned.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-mono font-semibold text-red-700">{c.subject} {c.courseNumber}</span>
                <span className="flex-1 text-gray-700 truncate">{c.title}</span>
                <span className="text-gray-400 text-xs">{c.credits} cr</span>
                <button
                  onClick={() => setPlanned(planned.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400"
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Missing Requirements
          </h3>
          <ul className="space-y-1 text-sm text-amber-700">
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
