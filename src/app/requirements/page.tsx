import { RequirementChecker } from "@/components/RequirementChecker";

export default function RequirementsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Graduation Requirements</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track your progress toward an MS degree at Northeastern. Add completed and planned
          courses to see your status and estimated graduation term.
        </p>
      </div>
      <RequirementChecker />
    </div>
  );
}
