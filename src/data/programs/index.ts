/**
 * Program registry. Each program is a hand-authored JSON file conforming to
 * ProgramV2 (src/lib/program-schema.ts); __tests__/lib/programs-data.test.ts
 * validates every file in CI.
 */

import type { ProgramV2 } from "@/lib/program-schema";
import bscs from "./bscs.json";
import bacs from "./bacs.json";
import bsCy from "./bs-cy.json";
import bsDs from "./bs-ds.json";
import mscs from "./mscs.json";
import mscsAlign from "./mscs-align.json";
import msai from "./msai.json";
import msds from "./msds.json";
import msCy from "./ms-cy.json";
import phdCs from "./phd-cs.json";
import phdCy from "./phd-cy.json";
import phdPhi from "./phd-phi.json";

export const PROGRAM_IDS = [
  "bscs",
  "bacs",
  "bs-cy",
  "bs-ds",
  "mscs",
  "mscs-align",
  "msai",
  "msds",
  "ms-cy",
  "phd-cs",
  "phd-cy",
  "phd-phi",
] as const;
export type ProgramId = (typeof PROGRAM_IDS)[number];

export const PROGRAMS: Record<ProgramId, ProgramV2> = {
  bscs: bscs as unknown as ProgramV2,
  bacs: bacs as unknown as ProgramV2,
  "bs-cy": bsCy as unknown as ProgramV2,
  "bs-ds": bsDs as unknown as ProgramV2,
  mscs: mscs as unknown as ProgramV2,
  "mscs-align": mscsAlign as unknown as ProgramV2,
  msai: msai as unknown as ProgramV2,
  msds: msds as unknown as ProgramV2,
  "ms-cy": msCy as unknown as ProgramV2,
  "phd-cs": phdCs as unknown as ProgramV2,
  "phd-cy": phdCy as unknown as ProgramV2,
  "phd-phi": phdPhi as unknown as ProgramV2,
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
