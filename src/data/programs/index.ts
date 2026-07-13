/**
 * Program registry. Each program is a hand-authored JSON file conforming to
 * ProgramV2 (src/lib/program-schema.ts); __tests__/lib/programs-data.test.ts
 * validates every file in CI. Phase 2 adds the remaining Khoury programs.
 */

import type { ProgramV2 } from "@/lib/program-schema";
import mscs from "./mscs.json";
import msai from "./msai.json";
import msds from "./msds.json";

export const PROGRAM_IDS = ["mscs", "msai", "msds"] as const;
export type ProgramId = (typeof PROGRAM_IDS)[number];

export const PROGRAMS: Record<ProgramId, ProgramV2> = {
  mscs: mscs as unknown as ProgramV2,
  msai: msai as unknown as ProgramV2,
  msds: msds as unknown as ProgramV2,
};

/** Pre-rename planner state used uppercase ids; map them on hydration. */
export const LEGACY_PROGRAM_IDS: Record<string, ProgramId> = {
  MSCS: "mscs",
  MSAI: "msai",
  MSDS: "msds",
};

export function isProgramId(v: string): v is ProgramId {
  return (PROGRAM_IDS as readonly string[]).includes(v);
}
