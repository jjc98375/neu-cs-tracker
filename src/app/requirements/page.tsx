import { RequirementChecker } from "@/components/RequirementChecker";

export default function RequirementsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
          Graduation Planner
        </p>
        <h1
          className="text-2xl font-normal text-slate-900 dark:text-slate-100 md:text-3xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          Plan your path to graduation
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Track your progress toward an MS degree at Northeastern. Add completed and planned
          courses to see your status and estimated graduation term.
        </p>
      </div>
      <RequirementChecker />
    </div>
  );
}
