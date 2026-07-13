/**
 * Program requirement schema v2 — recursive requirement trees.
 *
 * A requirement is a specific course, an open course range, or a group
 * (allOf / chooseN / chooseCredits) that nests other requirements.
 * Program data lives in src/data/programs/*.json and is validated by
 * validateProgram() in CI (see __tests__/lib/programs-data.test.ts).
 */

export interface CourseNode {
  type: "course";
  subject: string;
  number: string;
  title: string;
  credits: number;
}

export interface RangeNode {
  type: "range";
  subject: string;
  minNumber: number;
  maxNumber: number;
  /** Typical credits of one course in this range (display/estimation only). */
  creditsPer: number;
  label?: string;
}

export interface AllOfNode {
  type: "allOf";
  label: string;
  children: RequirementNode[];
}

export interface ChooseNNode {
  type: "chooseN";
  label: string;
  n: number;
  children: RequirementNode[];
}

export interface ChooseCreditsNode {
  type: "chooseCredits";
  label: string;
  credits: number;
  children: RequirementNode[];
}

export type RequirementNode =
  | CourseNode
  | RangeNode
  | AllOfNode
  | ChooseNNode
  | ChooseCreditsNode;

export interface Milestone {
  id: string;
  label: string;
  description?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export type ProgramLevel = "UG" | "MS" | "PhD";

export interface ProgramV2 {
  id: string;
  name: string;
  level: ProgramLevel;
  totalCredits: number;
  minGpa: number;
  catalogUrl: string;
  catalogYear: string;
  /** ISO date of the last human verification against the catalog. */
  verifiedAt: string;
  requirements: RequirementNode;
  /** PhD only: manual-check milestones (qualifier, proposal, ...). */
  milestones?: Milestone[];
  /** UG only: manual-check info items (NUpath areas). */
  infoChecklist?: ChecklistItem[];
}

// ── Validator ────────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function reqString(o: Record<string, unknown>, key: string, path: string, errors: string[]) {
  if (typeof o[key] !== "string" || (o[key] as string).length === 0)
    errors.push(`${path}.${key}: expected non-empty string`);
}

function reqNumber(o: Record<string, unknown>, key: string, path: string, errors: string[]) {
  if (!Number.isFinite(o[key] as number))
    errors.push(`${path}.${key}: expected finite number`);
}

function optString(o: Record<string, unknown>, key: string, path: string, errors: string[]) {
  if (o[key] !== undefined && typeof o[key] !== "string")
    errors.push(`${path}.${key}: expected string`);
}

function validateNode(v: unknown, path: string, errors: string[]): void {
  if (!isObj(v)) {
    errors.push(`${path}: expected object`);
    return;
  }
  const type = v.type;
  switch (type) {
    case "course":
      reqString(v, "subject", path, errors);
      reqString(v, "number", path, errors);
      reqString(v, "title", path, errors);
      reqNumber(v, "credits", path, errors);
      return;
    case "range":
      reqString(v, "subject", path, errors);
      reqNumber(v, "minNumber", path, errors);
      reqNumber(v, "maxNumber", path, errors);
      reqNumber(v, "creditsPer", path, errors);
      if (
        typeof v.minNumber === "number" &&
        typeof v.maxNumber === "number" &&
        v.minNumber > v.maxNumber
      )
        errors.push(`${path}.minNumber: must be <= maxNumber`);
      return;
    case "allOf":
    case "chooseN":
    case "chooseCredits": {
      reqString(v, "label", path, errors);
      if (type === "chooseN") {
        reqNumber(v, "n", path, errors);
        if (typeof v.n === "number" && v.n <= 0)
          errors.push(`${path}.n: must be > 0`);
      }
      if (type === "chooseCredits") {
        reqNumber(v, "credits", path, errors);
        if (typeof v.credits === "number" && v.credits <= 0)
          errors.push(`${path}.credits: must be > 0`);
      }
      if (!Array.isArray(v.children) || v.children.length === 0) {
        errors.push(`${path}.children: expected non-empty array`);
        return;
      }
      if (
        type === "chooseN" &&
        typeof v.n === "number" &&
        v.n > v.children.length
      )
        errors.push(`${path}.n: exceeds children count (${v.children.length})`);
      v.children.forEach((c, i) => validateNode(c, `${path}.children[${i}]`, errors));
      return;
    }
    default:
      errors.push(`${path}: unknown node type '${String(type)}'`);
  }
}

/** Validate an unknown value as a ProgramV2. Returns error strings; [] = valid. */
export function validateProgram(input: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(input)) return ["program: expected object"];

  reqString(input, "id", "program", errors);
  reqString(input, "name", "program", errors);
  if (input.level !== "UG" && input.level !== "MS" && input.level !== "PhD")
    errors.push("program.level: expected 'UG' | 'MS' | 'PhD'");
  reqNumber(input, "totalCredits", "program", errors);
  if (typeof input.totalCredits === "number" && input.totalCredits <= 0)
    errors.push("program.totalCredits: must be > 0");
  reqNumber(input, "minGpa", "program", errors);
  if (typeof input.minGpa === "number" && (input.minGpa < 0 || input.minGpa > 4))
    errors.push("program.minGpa: must be in range [0, 4]");
  reqString(input, "catalogUrl", "program", errors);
  if (typeof input.catalogUrl === "string" && !input.catalogUrl.startsWith("https://"))
    errors.push("program.catalogUrl: must start with https://");
  reqString(input, "catalogYear", "program", errors);
  if (typeof input.catalogYear === "string" && !/^\d{4}-\d{4}$/.test(input.catalogYear))
    errors.push("program.catalogYear: must match YYYY-YYYY format");
  reqString(input, "verifiedAt", "program", errors);
  if (typeof input.verifiedAt === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(input.verifiedAt))
    errors.push("program.verifiedAt: must match YYYY-MM-DD format");

  validateNode(input.requirements, "program.requirements", errors);

  if (input.milestones !== undefined) {
    if (!Array.isArray(input.milestones)) errors.push("program.milestones: expected array");
    else {
      if (input.milestones.length === 0) errors.push("program.milestones: must be non-empty");
      else
        input.milestones.forEach((m, i) => {
          if (!isObj(m)) { errors.push(`program.milestones[${i}]: expected object`); return; }
          reqString(m, "id", `program.milestones[${i}]`, errors);
          reqString(m, "label", `program.milestones[${i}]`, errors);
          optString(m, "description", `program.milestones[${i}]`, errors);
        });
    }
  }
  if (input.infoChecklist !== undefined) {
    if (!Array.isArray(input.infoChecklist)) errors.push("program.infoChecklist: expected array");
    else {
      if (input.infoChecklist.length === 0) errors.push("program.infoChecklist: must be non-empty");
      else
        input.infoChecklist.forEach((m, i) => {
          if (!isObj(m)) { errors.push(`program.infoChecklist[${i}]: expected object`); return; }
          reqString(m, "id", `program.infoChecklist[${i}]`, errors);
          reqString(m, "label", `program.infoChecklist[${i}]`, errors);
        });
    }
  }
  return errors;
}
