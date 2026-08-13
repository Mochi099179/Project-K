import type { Check } from "./types";
import { finalQuestionResult } from "./types";

export type ConceptStat = { label: string; count: number };
export type DifficultyStat = { label: string; count: number; studentCount: number };

function toSorted(rec: Record<string, number>): ConceptStat[] {
  return Object.entries(rec)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export type StudentInsights = {
  strongConcepts: ConceptStat[];
  weakConcepts: ConceptStat[];
  errorPatterns: ConceptStat[];
  accuracy: number | null;
  totalChecks: number;
  totalQuestions: number;
};

/** "นักเรียนคนนี้เข้าใจอะไรแล้ว? กำลังมีปัญหากับอะไร? ทำไมเขาถึงผิด?" */
export function computeStudentInsights(checks: Check[]): StudentInsights {
  const strong: Record<string, number> = {};
  const weak: Record<string, number> = {};
  const errors: Record<string, number> = {};
  let totalQ = 0;
  let correctQ = 0;

  for (const c of checks) {
    for (const q of c.questions) {
      const r = finalQuestionResult(q);
      totalQ++;
      if (r.isCorrect) {
        correctQ++;
        q.keywords.forEach((k) => (strong[k] = (strong[k] || 0) + 1));
      } else {
        q.keywords.forEach((k) => (weak[k] = (weak[k] || 0) + 1));
        if (r.errorType) errors[r.errorType] = (errors[r.errorType] || 0) + 1;
      }
    }
  }

  return {
    strongConcepts: toSorted(strong).slice(0, 6),
    weakConcepts: toSorted(weak).slice(0, 6),
    errorPatterns: toSorted(errors).slice(0, 6),
    accuracy: totalQ ? Math.round((correctQ / totalQ) * 100) : null,
    totalChecks: checks.length,
    totalQuestions: totalQ,
  };
}

/** "ทั้งห้องกำลังมีปัญหาเรื่องอะไร?" — common difficulties across a classroom's checks. */
export function computeClassDifficulties(checks: Check[]): DifficultyStat[] {
  const weak: Record<string, number> = {};
  const students: Record<string, Set<string>> = {};

  for (const c of checks) {
    if (!c.studentId) continue;
    for (const q of c.questions) {
      const r = finalQuestionResult(q);
      if (r.isCorrect) continue;
      q.keywords.forEach((k) => {
        weak[k] = (weak[k] || 0) + 1;
        students[k] = students[k] || new Set();
        students[k].add(c.studentId as string);
      });
    }
  }

  return Object.entries(weak)
    .map(([label, count]) => ({ label, count, studentCount: students[label]?.size ?? 0 }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 8);
}
