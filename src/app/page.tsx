import Link from "next/link";
import { BookOpen, GraduationCap, MapPin, Calendar } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto py-16 space-y-10">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          <span className="text-red-700">NEU</span> CS Tracker
        </h1>
        <p className="text-lg text-gray-500">
          Browse Northeastern CS courses, check campus availability and summer
          sessions, and plan your path to graduation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/courses"
          className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-red-300 hover:shadow-md transition-all"
        >
          <BookOpen className="w-8 h-8 text-red-600 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-red-700">
            Course Browser
          </h2>
          <p className="text-sm text-gray-500">
            Search CS courses by term, campus, and summer session (Full /
            Summer 1 / Summer 2).
          </p>
          <div className="mt-4 flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Multi-campus
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> All terms
            </span>
          </div>
        </Link>

        <Link
          href="/requirements"
          className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-red-300 hover:shadow-md transition-all"
        >
          <GraduationCap className="w-8 h-8 text-red-600 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-red-700">
            Graduation Planner
          </h2>
          <p className="text-sm text-gray-500">
            Track MS CS, MS AI, or MS Data Science requirements. Add completed
            and planned courses to estimate your graduation date.
          </p>
          <div className="mt-4 flex gap-2 text-xs">
            {["MS CS", "MS AI", "MS DS"].map((p) => (
              <span
                key={p}
                className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded"
              >
                {p}
              </span>
            ))}
          </div>
        </Link>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Note:</strong> Course data is pulled live from{" "}
        <span className="font-mono">nubanner.neu.edu</span>. You must be on a
        network that can reach Northeastern&apos;s Banner system.
      </div>
    </div>
  );
}
