import type { ProgramId } from "@/lib/requirements";

const SEASON_SUFFIX: Record<string, string> = {
  Spring: "10",
  Summer: "50",
  Fall: "30",
};

/** "Fall 2024 Semester" | "Summer Full 2025 Semester" -> "202430" | "202550" */
export function termToCode(term: string): string {
  const seasonMatch = term.match(/\b(Spring|Summer|Fall)\b/);
  const yearMatch = term.match(/\b(20\d{2})\b/);
  if (!seasonMatch || !yearMatch) return "";
  const suffix = SEASON_SUFFIX[seasonMatch[1]];
  if (!suffix) return "";
  return `${yearMatch[1]}${suffix}`;
}

const PROGRAM_MAP: Record<string, ProgramId> = {
  "m.s. in computer science": "MSCS",
  "m.s. in artificial intelligence": "MSAI",
  "m.s. in data science": "MSDS",
};

export function programToId(program: string): ProgramId | undefined {
  return PROGRAM_MAP[program.trim().toLowerCase()];
}
