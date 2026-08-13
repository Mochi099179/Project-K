export type HomeworkStatus = "none" | "grading" | "graded";

export type Homework = {
  status: HomeworkStatus;
  hasFile: boolean;
  hasAnswer: boolean;
  confirmed: boolean;
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  transcription?: string;
  error?: string;
};

export type HistoryEntry = {
  name: string;
  date: string;
  score: number;
};

export type Student = {
  id: string;
  name: string;
  studentId: string;
  seatNo: number;
  gender: "M" | "F";
  problems: string[];
  homework: Homework;
  history?: HistoryEntry[];
};

export type TrendPoint = {
  label: string;
  date: string;
  value: number;
};

export type Distribution = {
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type Groups = {
  excellent: number;
  good: number;
  developing: number;
  support: number;
};

export type SubjectScore = {
  label: string;
  pct: number;
  barColor: string;
};

export type TopStudent = {
  name: string;
  pct: number;
  rank: number;
  badgeBg: string;
};

export type Classroom = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  term: string;
  teacher: string;
  exercises: { total: number; completed: number; inProgress: number };
  avgScore: number;
  avgDelta: number;
  riskCount: number;
  trend: TrendPoint[];
  distribution: Distribution[];
  groups: Groups;
  subjectScores: SubjectScore[];
  topStudents: TopStudent[];
  problems: string[];
  students: Student[];
};

export type TaskItem = {
  title: string;
  detail: string;
  count: number;
  iconBg: string;
  iconColor: string;
  kind: "review" | "missing" | "activity";
};

export type NotificationItem = {
  title: string;
  detail: string;
  time: string;
};

// ============================================================
// CHECK / SUBMISSION PIPELINE
// Student Work → OCR → Question/Answer Extraction → AI Evaluation
// → Teacher Review → Final Result → Student Learning Profile
// ============================================================

export type FileKind = "image" | "pdf" | "text" | "other";

export type FileRef = {
  id: string;
  name: string;
  kind: FileKind;
  addedAt: string;
};

/** A single question/answer evaluation. AI-produced (by Answer Analysis), and optionally teacher-corrected. */
export type QuestionResult = {
  isCorrect: boolean;
  score: number; // 0-1, normalized per-question score
  errorType: string;
  conceptIssue: string;
  reasoning: string;
  areasToImprove: string[];
  evaluationConfidence: number; // 0-1 — how confident AI is in this evaluation
  needsReview: boolean; // true when the underlying OCR was too uncertain to grade with confidence
  reviewReason: string;
};

/**
 * Question and answer stay in the same block, per spec — never split apart.
 * Written entirely by Answer Analysis (which segments OCR text into
 * questions AND grades them in one pass) — a generic OCR provider has no
 * concept of question boundaries, so there's no separate "OCR's version"
 * of a question to preserve here. Reviewing/correcting the OCR reading
 * itself happens one level up, on Check.ocrResult.
 */
export type CheckQuestion = {
  id: string;
  questionNumber: number | null;
  question: string;
  studentAnswer: string; // the portion of the OCR text Answer Analysis identified as this question's answer
  expectedAnswer: string;
  keywords: string[];
  extractionConfidence: number; // 0-1 — how confident Answer Analysis is that this OCR text maps to this question and was read correctly
  ocrUncertain: boolean;
  ocrAlternatives: string[]; // alternate readings considered, when uncertain
  ai: QuestionResult;
  teacherCorrected: QuestionResult | null;
};

export type CheckStatus = "processing" | "failed" | "ocr_failed" | "analysis_failed" | "needs_review" | "reviewed";

/** One attached page of student work — image, PDF, or text file — for the left-panel document viewer. */
export type ExerciseFileRef = { url: string; name: string; kind: FileKind };

export type CheckOcrPage = { pageNumber: number; content: string; confidence: number | null };

/** The Handwriting AI's raw reading of the student's work — page-level text, not yet segmented into questions. */
export type CheckOcrResult = {
  id: string;
  status: "completed" | "failed";
  provider: string;
  pages: CheckOcrPage[];
  teacherCorrectedText: string | null; // when set, this (not `pages`) is what Answer Analysis grades against
  createdAt: string;
};

/** A Check (Submission) links a student's work to AI evaluation and (optionally) a Classroom + Student. */
export type Check = {
  id: string;
  createdAt: string;
  status: CheckStatus;
  studentLabel: string; // Student ID as entered in Quick Check, or the bound student's studentId
  topic?: string;
  exerciseFiles: ExerciseFileRef[]; // pages of the student's submitted work, for the left-panel document viewer
  ocrResult: CheckOcrResult | null;
  questions: CheckQuestion[];
  overallScore: number; // 0-100, derived from final (teacher-corrected if present, else AI) results
  errorMessage?: string;
  homeworkUnitId?: string | null;
  exerciseId?: string | null;
  classroomId?: string | null; // set once bound to a classroom
  studentId?: string | null; // set once bound to a student
  savedToProfile?: { classroomId: string; studentId: string; savedAt: string } | null;
};

export function finalQuestionResult(q: CheckQuestion): QuestionResult {
  return q.teacherCorrected ?? q.ai;
}

export function computeOverallScore(questions: CheckQuestion[]): number {
  if (!questions.length) return 0;
  const correct = questions.filter((q) => finalQuestionResult(q).isCorrect).length;
  return Math.round((correct / questions.length) * 100);
}

// ============================================================
// HOMEWORK UNIT — entity separate from Classroom.
// A reusable library: created once, reused across many Classrooms/students.
// Each Exercise owns its own reference file, scoring criteria, and answer
// key, so the Check workflow can load a full checking context from just a
// homeworkUnitId + exerciseId, with no re-upload of reference material.
// ============================================================

export type ExerciseAnswerKey = {
  id: string;
  filePath: string | null;
  fileName: string | null;
  fileKind: FileKind;
  answerText: string | null;
};

export type Exercise = {
  id: string;
  homeworkUnitId: string;
  title: string;
  description: string | null;
  exerciseFilePath: string | null;
  exerciseFileName: string | null;
  exerciseFileKind: FileKind;
  scoringCriteria: string | null;
  maxScore: number | null;
  answerKey: ExerciseAnswerKey | null;
  createdAt: string;
  updatedAt: string;
};

export type HomeworkUnit = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  createdAt: string;
  exercises: Exercise[];
  teachingMaterials: FileRef[];
};

export type GenerateType = "materials";

export type MaterialsResult = {
  fileName: string;
  slides: string[];
};

export const CLASSROOM_PROBLEM_OPTIONS = [
  "เรียนไม่ทันเพื่อน",
  "เข้าสังคมไม่ได้",
  "มีข้อบกพร่องด้านการเรียนรู้ (LD)",
  "ขาดสมาธิ/วอกแวกง่าย",
  "ขาดความมั่นใจในการพูด",
  "ปัญหาด้านการอ่าน-เขียน",
  "ปัญหาครอบครัว/สภาพแวดล้อม",
  "ขาดแรงจูงใจในการเรียน",
] as const;

export const GENERATE_TYPE_LABEL: Record<GenerateType, string> = {
  materials: "Teaching Materials",
};
