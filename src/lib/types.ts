export interface Term {
  code: string;
  description: string;
}

export type SummerSession = "Full" | "Summer1" | "Summer2" | "N/A";

export interface MeetingTime {
  beginTime: string | null;
  endTime: string | null;
  building: string | null;
  buildingDescription: string | null;
  campus: string | null;
  campusDescription: string | null;
  room: string | null;
  startDate: string | null;
  endDate: string | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  meetingScheduleType: string | null;
  meetingType: string | null;
  meetingTypeDescription: string | null;
}

export interface Faculty {
  bannerId: string;
  displayName: string | null;
  emailAddress: string | null;
  primaryIndicator: boolean;
}

export interface SectionAttribute {
  code: string;
  description: string;
  isZTCAttribute: boolean;
}

export interface CourseSection {
  courseReferenceNumber: string;
  term: string;
  termDesc: string;
  partOfTerm: string;
  subject: string;
  subjectDescription: string;
  courseNumber: string;
  sequenceNumber: string;
  courseTitle: string;
  subjectCourse: string;
  campusDescription: string;
  scheduleTypeDescription: string;
  creditHours: number | null;
  creditHourHigh: number | null;
  creditHourLow: number | null;
  maximumEnrollment: number;
  enrollment: number;
  seatsAvailable: number;
  waitCapacity: number;
  waitCount: number;
  waitAvailable: number;
  openSection: boolean;
  faculty: Faculty[];
  meetingsFaculty: { meetingTime: MeetingTime; faculty: Faculty[] }[];
  sectionAttributes: SectionAttribute[];
  // derived
  summerSession: SummerSession;
}

export interface SearchResult {
  totalCount: number;
  data: CourseSection[];
  pageOffset: number;
  pageMaxSize: number;
  sectionsFetchedCount: number;
  pathMode: string;
  searchResultsConfigs: unknown[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Graduation / Requirements
// ──────────────────────────────────────────────────────────────────────────────

export type RequirementCategory =
  | "Core"
  | "Systems"
  | "Theory"
  | "Applications"
  | "Elective"
  | "Capstone"
  | "Math";

export interface RequirementCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
  category: RequirementCategory;
  required: boolean; // true = must take, false = choose from group
  groupId?: string;  // courses with the same groupId are "choose N from this group"
  groupMinCount?: number;
}

export interface CompletedCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
  term: string; // e.g. "202410"
  grade?: string;
}

export interface PlannedCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
  term: string;
}

export interface RequirementStatus {
  requirement: RequirementCourse;
  status: "completed" | "planned" | "missing";
  completedBy?: CompletedCourse;
  plannedBy?: PlannedCourse;
}

export interface GraduationAnalysis {
  totalCreditsRequired: number;
  totalCreditsCompleted: number;
  totalCreditsPlanned: number;
  totalCreditsRemaining: number;
  requirementStatuses: RequirementStatus[];
  missingRequirements: RequirementCourse[];
  expectedGraduationTerm: string | null;
  onTrack: boolean;
}
