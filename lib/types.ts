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

export type ExerciseStatus = "graded" | "in_progress";

export type ExerciseRow = {
  name: string;
  unit: string;
  due: string;
  submitted: number;
  total: number;
  avgScore: string;
  status: ExerciseStatus;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
};

export type PlanRow = {
  no: number;
  focus: string;
  duration: string;
};

export type SavedPlan = {
  topic: string;
  rows: PlanRow[];
};

export type TechniqueResult = {
  techniques: string[];
  keywords: string[];
  activity: string;
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
  latestExercises: ExerciseRow[];
  problems: string[];
  students: Student[];
  savedPlans?: SavedPlan[];
  savedTechniques?: TechniqueResult[];
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

export type GenerateType = "materials" | "exercises" | "plan" | "technique";

export type MaterialsResult = {
  fileName: string;
  slides: string[];
};

export type ExerciseResultItem = {
  q: string;
  difficulty: string;
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
  exercises: "Exercise Set",
  plan: "Lesson Plan",
  technique: "Teaching Techniques",
};
