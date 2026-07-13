"use client";

import { useState, useEffect, useRef } from "react";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";
import { PROGRAMS, PROGRAM_IDS, LEGACY_PROGRAM_IDS, isProgramId, type ProgramId } from "@/data/programs";
import { analyzeGraduation } from "@/lib/requirements-engine";
import { RequirementTree } from "@/components/RequirementTree";
import { CheckCircle, Clock, AlertCircle, Plus, Trash2, Pencil, GraduationCap, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { TranscriptImport } from "@/components/TranscriptImport";
import type { ParsedTranscript } from "@/lib/transcript-parser";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";

const STORAGE_KEY = "neu-cs-tracker:planner";

interface PersistedPlanner {
  program: string; // ProgramId, but legacy uppercase ids may exist in storage
  completed: CompletedCourse[];
  planned: PlannedCourse[];
  milestoneChecks?: Record<string, Record<string, boolean>>; // programId -> milestoneId -> done
  nupathChecks?: Record<string, Record<string, boolean>>;    // programId -> itemId -> done
}

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

// ─── EditableCourseRow subcomponent ──────────────────────────────────────────

interface EditableCourseRowProps {
  course: CompletedCourse | PlannedCourse;
  type: "completed" | "planned";
  termOptions: { code: string; label: string }[];
  onSave: (updated: CompletedCourse | PlannedCourse) => void;
  onDelete: () => void;
}

export function EditableCourseRow({ course, type, termOptions, onSave, onDelete }: EditableCourseRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CompletedCourse>({ ...(course as CompletedCourse) });

  function handleEdit() {
    setDraft({ ...(course as CompletedCourse) });
    setEditing(true);
  }

  function handleSave() {
    if (!draft.subject || !draft.courseNumber || !draft.term) return;
    if (type === "planned") {
      const { grade: _grade, ...planned } = draft;
      onSave(planned as PlannedCourse);
    } else {
      onSave({ ...draft });
    }
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  const inputCls = "border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100";

  if (editing) {
    return (
      <div className="border border-slate-200 dark:border-[#243049] rounded-lg p-3 mb-1 bg-slate-50 dark:bg-[#1e2537] grid grid-cols-2 md:grid-cols-3 gap-2">
        <input
          className={inputCls}
          placeholder="Subject"
          value={draft.subject}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Course #"
          value={draft.courseNumber}
          onChange={(e) => setDraft({ ...draft, courseNumber: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <input
          type="number"
          className={inputCls}
          placeholder="Credits"
          value={draft.credits}
          onChange={(e) => setDraft({ ...draft, credits: parseInt(e.target.value) || 0 })}
        />
        <select
          className={inputCls}
          value={draft.term}
          onChange={(e) => setDraft({ ...draft, term: e.target.value })}
        >
          <option value="">Select term</option>
          {termOptions.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
        {type === "completed" && (
          <input
            className={inputCls}
            placeholder="Grade (optional)"
            value={draft.grade ?? ""}
            onChange={(e) => setDraft({ ...draft, grade: e.target.value })}
          />
        )}
        <div className="col-span-2 md:col-span-3 flex gap-2">
          <button
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="text-slate-500 px-3 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-[#243049]"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = type === "completed";
  const c = course as CompletedCourse;

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg text-sm border ${
      isCompleted
        ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
        : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
    }`}>
      {isCompleted
        ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        : <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
      }
      <span className="font-mono font-semibold text-red-600 dark:text-red-400">{c.subject} {c.courseNumber}</span>
      <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
      <span className="text-slate-400 text-xs">{c.credits} cr</span>
      {isCompleted && c.grade && <span className="text-slate-500 dark:text-slate-400 text-xs">{c.grade}</span>}
      <button
        aria-label={`Edit ${c.subject} ${c.courseNumber}`}
        onClick={handleEdit}
        className="text-slate-300 dark:text-slate-600 hover:text-blue-400"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        aria-label={`Delete ${c.subject} ${c.courseNumber}`}
        onClick={onDelete}
        className="text-slate-300 dark:text-slate-600 hover:text-red-400"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function RequirementChecker() {
  const [program, setProgram] = useState<ProgramId>("mscs");
  const [milestoneChecks, setMilestoneChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [nupathChecks, setNupathChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [completed, setCompleted] = useState<CompletedCourse[]>([]);
  const [planned, setPlanned] = useState<PlannedCourse[]>([]);
  const [addingCompleted, setAddingCompleted] = useState(false);
  const [addingPlanned, setAddingPlanned] = useState(false);
  const [newCompleted, setNewCompleted] = useState<CompletedCourse>({ ...EMPTY_COMPLETED });
  const [newPlanned, setNewPlanned] = useState<PlannedCourse>({ ...EMPTY_PLANNED });

  // Hydrate once on mount (client-only; guards SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedPlanner;
      if (saved.program) {
        const migrated = LEGACY_PROGRAM_IDS[saved.program] ?? saved.program;
        if (isProgramId(migrated)) setProgram(migrated);
      }
      if (saved.milestoneChecks) setMilestoneChecks(saved.milestoneChecks);
      if (saved.nupathChecks) setNupathChecks(saved.nupathChecks);
      if (Array.isArray(saved.completed)) setCompleted(saved.completed);
      if (Array.isArray(saved.planned)) setPlanned(saved.planned);
    } catch {
      /* ignore corrupt/unavailable storage */
    }
  }, []);

  // Persist on change. Skip the first run: it fires on mount with the initial
  // empty state (before hydration commits) and would clobber saved data.
  const skipFirstPersist = useRef(true);
  useEffect(() => {
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    try {
      const payload: PersistedPlanner = { program, completed, planned, milestoneChecks, nupathChecks };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full/unavailable — degrade to session-only */
    }
  }, [program, completed, planned, milestoneChecks, nupathChecks]);

  function handleImport(result: ParsedTranscript) {
    if (result.program) setProgram(result.program);
    setCompleted(result.completed);
    setPlanned(result.inProgress);
  }

  const analysis = analyzeGraduation(PROGRAMS[program], completed, planned);
  const prog = PROGRAMS[program];

  const progressPct = Math.min(
    100,
    ((analysis.totalCreditsCompleted + analysis.totalCreditsPlanned) /
      analysis.totalCreditsRequired) *
      100
  );

  return (
    <div className="space-y-6">
      <TranscriptImport onImport={handleImport} />
      {/* Program selector */}
      <div className="flex flex-wrap gap-3">
        {PROGRAM_IDS.map((pid) => (
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
        <RequirementTree status={analysis.root} />
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
            <div className="col-span-2 md:col-span-3">
              <CourseAutocomplete
                onSelect={(c) =>
                  setNewCompleted({ ...newCompleted, subject: c.subject, courseNumber: c.courseNumber, title: c.title, credits: c.credits })
                }
              />
              {newCompleted.subject && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selected: <span className="font-mono">{newCompleted.subject} {newCompleted.courseNumber}</span> {newCompleted.title}
                </p>
              )}
            </div>
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
              <EditableCourseRow
                key={i}
                course={c}
                type="completed"
                termOptions={TERM_OPTIONS}
                onSave={(updated) => setCompleted(completed.map((x, j) => j === i ? updated as CompletedCourse : x))}
                onDelete={() => setCompleted(completed.filter((_, j) => j !== i))}
              />
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
            <div className="col-span-2 md:col-span-3">
              <CourseAutocomplete
                onSelect={(c) =>
                  setNewPlanned({ ...newPlanned, subject: c.subject, courseNumber: c.courseNumber, title: c.title, credits: c.credits })
                }
              />
              {newPlanned.subject && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selected: <span className="font-mono">{newPlanned.subject} {newPlanned.courseNumber}</span> {newPlanned.title}
                </p>
              )}
            </div>
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
              <EditableCourseRow
                key={i}
                course={c}
                type="planned"
                termOptions={TERM_OPTIONS}
                onSave={(updated) => setPlanned(planned.map((x, j) => j === i ? updated as PlannedCourse : x))}
                onDelete={() => setPlanned(planned.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Missing requirements */}
      {analysis.missing.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Missing Requirements
          </h3>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {analysis.missing.map((m) => (
              <li key={m.label} className="flex items-center gap-2">
                <span className="font-semibold">{m.label}</span>
                <span className="text-amber-500 text-xs">{m.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
