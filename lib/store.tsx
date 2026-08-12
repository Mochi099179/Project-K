"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type {
  Check,
  CheckQuestion,
  Classroom,
  HomeworkUnit,
  PlanRow,
  QuestionResult,
  Student,
  TechniqueResult,
  FileKind,
} from "./types";
import { computeOverallScore } from "./types";
import { initialClassrooms, initialNotifications, initialTasks } from "./mock-data";
import { buildSeedChecks } from "./mock-checks";
import { buildSeedHomeworkUnits } from "./mock-homework-units";

type NewStudentInput = {
  name?: string;
  studentId: string;
  seatNo?: number;
  gender?: "M" | "F";
};

type CreateClassroomInput = {
  name: string;
  grade: string;
  problems: string[];
  students?: NewStudentInput[];
};

type AddStudentInput = {
  name: string;
  studentId: string;
  seatNo: number;
  gender: "M" | "F";
};

type ImageInput = { base64: string; mediaType: string; dataUrl: string };

type StartCheckInput = {
  studentLabel: string;
  topic?: string;
  teachingMaterialsText?: string;
  answerKeyText?: string;
  answerKeyImage?: ImageInput | null;
  exerciseImages: ImageInput[];
  classroomId?: string | null;
  studentId?: string | null;
  homeworkUnitId?: string | null;
};

type CreateHomeworkUnitInput = { name: string; subject: string; grade: string };
type HomeworkUnitFileGroup = "exercises" | "answerKeys" | "teachingMaterials";

type AppDataContextValue = {
  classrooms: Classroom[];
  tasks: typeof initialTasks;
  notifications: typeof initialNotifications;
  pendingReviewCount: number;
  getClassroom: (id: string) => Classroom | undefined;
  getStudent: (classroomId: string, studentId: string) => Student | undefined;
  createClassroom: (input: CreateClassroomInput) => string;
  addStudent: (classroomId: string, input: AddStudentInput) => string;
  addSavedPlan: (classroomId: string, topic: string, rows: PlanRow[]) => void;
  addSavedTechnique: (classroomId: string, result: TechniqueResult) => void;
  showCreateModal: boolean;
  openCreateModal: (onDone?: (classroomId: string) => void) => void;
  closeCreateModal: () => void;

  // Checks (Quick Check + classroom-bound checks share this pipeline)
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  getChecksForStudent: (classroomId: string, studentId: string) => Check[];
  getChecksForClassroom: (classroomId: string) => Check[];
  getRecentChecks: (limit?: number) => Check[];
  startCheck: (input: StartCheckInput) => Promise<string>;
  correctQuestion: (checkId: string, questionId: string, correction: QuestionResult) => void;
  markReviewed: (checkId: string) => void;
  saveCheckToProfile: (checkId: string, classroomId: string, studentId: string) => void;

  // Homework Units — separate entity from Classroom
  homeworkUnits: HomeworkUnit[];
  getHomeworkUnit: (id: string) => HomeworkUnit | undefined;
  createHomeworkUnit: (input: CreateHomeworkUnitInput) => string;
  addFileToUnit: (unitId: string, group: HomeworkUnitFileGroup, name: string, kind: FileKind) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [tasks] = useState(initialTasks);
  const [notifications] = useState(initialNotifications);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalCallback, setCreateModalCallback] = useState<((id: string) => void) | null>(null);

  const [checks, setChecks] = useState<Check[]>(() => buildSeedChecks());
  const [homeworkUnits, setHomeworkUnits] = useState<HomeworkUnit[]>(() => buildSeedHomeworkUnits());

  const openCreateModal = useCallback((onDone?: (classroomId: string) => void) => {
    setCreateModalCallback(() => onDone ?? null);
    setShowCreateModal(true);
  }, []);
  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setCreateModalCallback(null);
  }, []);

  const getClassroom = useCallback((id: string) => classrooms.find((c) => c.id === id), [classrooms]);

  const getStudent = useCallback(
    (classroomId: string, studentId: string) => {
      const classroom = classrooms.find((c) => c.id === classroomId);
      return classroom?.students.find((s) => s.id === studentId);
    },
    [classrooms]
  );

  const createClassroom = useCallback(
    (input: CreateClassroomInput) => {
      const id = "c" + Date.now();
      const students: Student[] = (input.students ?? []).map((s, i) => ({
        id: "s" + Date.now() + "-" + i,
        name: s.name?.trim() || `นักเรียน ${s.studentId}`,
        studentId: s.studentId,
        seatNo: s.seatNo ?? i + 1,
        gender: s.gender ?? "M",
        problems: [],
        homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false },
      }));
      const newClassroom: Classroom = {
        id,
        name: input.name || "ห้องเรียนใหม่",
        subject: "คณิตศาสตร์",
        grade: input.grade || "-",
        term: "ภาคเรียนที่ 1/2567",
        teacher: "ครูจิราภรณ์",
        exercises: { total: 0, completed: 0, inProgress: 0 },
        avgScore: 0,
        avgDelta: 0,
        riskCount: 0,
        trend: [],
        distribution: [],
        groups: { excellent: 0, good: 0, developing: 0, support: 0 },
        subjectScores: [],
        topStudents: [],
        latestExercises: [],
        problems: input.problems,
        students,
      };
      setClassrooms((prev) => [...prev, newClassroom]);
      setShowCreateModal(false);
      if (createModalCallback) {
        createModalCallback(id);
        setCreateModalCallback(null);
      }
      return id;
    },
    [createModalCallback]
  );

  const addStudent = useCallback((classroomId: string, input: AddStudentInput) => {
    const id = "s" + Date.now();
    const newStudent: Student = {
      id,
      name: input.name,
      studentId: input.studentId,
      seatNo: input.seatNo,
      gender: input.gender,
      problems: [],
      homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false },
    };
    setClassrooms((prev) =>
      prev.map((c) => (c.id !== classroomId ? c : { ...c, students: [...c.students, newStudent] }))
    );
    return id;
  }, []);

  const addSavedPlan = useCallback((classroomId: string, topic: string, rows: PlanRow[]) => {
    setClassrooms((prev) =>
      prev.map((c) =>
        c.id !== classroomId
          ? c
          : { ...c, savedPlans: [...(c.savedPlans || []), { topic: topic || "บทเรียนนี้", rows }] }
      )
    );
  }, []);

  const addSavedTechnique = useCallback((classroomId: string, result: TechniqueResult) => {
    setClassrooms((prev) =>
      prev.map((c) =>
        c.id !== classroomId ? c : { ...c, savedTechniques: [...(c.savedTechniques || []), result] }
      )
    );
  }, []);

  // ---------------- Checks ----------------

  const getCheck = useCallback((id: string) => checks.find((c) => c.id === id), [checks]);

  const getChecksForStudent = useCallback(
    (classroomId: string, studentId: string) =>
      checks
        .filter((c) => c.classroomId === classroomId && c.studentId === studentId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [checks]
  );

  const getChecksForClassroom = useCallback(
    (classroomId: string) => checks.filter((c) => c.classroomId === classroomId),
    [checks]
  );

  const getRecentChecks = useCallback(
    (limit = 5) => [...checks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit),
    [checks]
  );

  const startCheck = useCallback((input: StartCheckInput): Promise<string> => {
    const id = "chk" + Date.now();
    const placeholder: Check = {
      id,
      createdAt: new Date().toISOString(),
      status: "processing",
      studentLabel: input.studentLabel,
      topic: input.topic,
      exerciseImages: input.exerciseImages.map((i) => i.dataUrl),
      questions: [],
      overallScore: 0,
      homeworkUnitId: input.homeworkUnitId ?? null,
      classroomId: input.classroomId ?? null,
      studentId: input.studentId ?? null,
      savedToProfile: null,
    };
    setChecks((prev) => [placeholder, ...prev]);

    // Run the AI pipeline in the background — callers get the id immediately so
    // they can navigate straight to the (live-updating) processing/result view.
    void (async () => {
      try {
        const res = await fetch("/api/process-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentLabel: input.studentLabel,
          topic: input.topic,
          teachingMaterialsText: input.teachingMaterialsText,
          answerKeyText: input.answerKeyText,
          answerKeyImage: input.answerKeyImage
            ? { base64: input.answerKeyImage.base64, mediaType: input.answerKeyImage.mediaType }
            : null,
          exerciseImages: input.exerciseImages.map(({ base64, mediaType }) => ({ base64, mediaType })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `คำขอล้มเหลว (${res.status})`);
      }

      type RawQuestion = {
        question: string;
        student_answer: string;
        expected_answer: string;
        keywords?: string[];
        features?: string[];
        context?: string[];
        extraction_confidence?: number;
        is_correct: boolean;
        score?: number;
        error_type?: string;
        concept_issue?: string;
        reasoning?: string;
        areas_to_improve?: string[];
        evaluation_confidence?: number;
      };

      const questions: CheckQuestion[] = ((body.questions ?? []) as RawQuestion[]).map((rq, idx) => ({
        id: `${id}-q${idx + 1}`,
        question: rq.question ?? "",
        studentAnswer: rq.student_answer ?? "",
        expectedAnswer: rq.expected_answer ?? "",
        keywords: rq.keywords ?? [],
        features: rq.features ?? [],
        context: rq.context ?? [],
        extractionConfidence: rq.extraction_confidence ?? 0.8,
        ai: {
          isCorrect: !!rq.is_correct,
          score: rq.score ?? (rq.is_correct ? 1 : 0),
          errorType: rq.error_type ?? "",
          conceptIssue: rq.concept_issue ?? "",
          reasoning: rq.reasoning ?? "",
          areasToImprove: rq.areas_to_improve ?? [],
          evaluationConfidence: rq.evaluation_confidence ?? 0.8,
        },
        teacherCorrected: null,
      }));

      setChecks((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "needs_review", questions, overallScore: computeOverallScore(questions) }
            : c
        )
      );
      } catch (err) {
        setChecks((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: "failed",
                  errorMessage: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจ",
                }
              : c
          )
        );
      }
    })();

    return Promise.resolve(id);
  }, []);

  const correctQuestion = useCallback((checkId: string, questionId: string, correction: QuestionResult) => {
    setChecks((prev) =>
      prev.map((c) => {
        if (c.id !== checkId) return c;
        const questions = c.questions.map((qq) =>
          qq.id === questionId ? { ...qq, teacherCorrected: correction } : qq
        );
        return { ...c, questions, overallScore: computeOverallScore(questions) };
      })
    );
  }, []);

  const markReviewed = useCallback((checkId: string) => {
    setChecks((prev) => prev.map((c) => (c.id === checkId ? { ...c, status: "reviewed" } : c)));
  }, []);

  const saveCheckToProfile = useCallback((checkId: string, classroomId: string, studentId: string) => {
    setChecks((prev) =>
      prev.map((c) =>
        c.id === checkId
          ? {
              ...c,
              classroomId,
              studentId,
              status: "reviewed",
              savedToProfile: { classroomId, studentId, savedAt: new Date().toISOString() },
            }
          : c
      )
    );
  }, []);

  // ---------------- Homework Units ----------------

  const getHomeworkUnit = useCallback((id: string) => homeworkUnits.find((u) => u.id === id), [homeworkUnits]);

  const createHomeworkUnit = useCallback((input: CreateHomeworkUnitInput) => {
    const id = "hu" + Date.now();
    setHomeworkUnits((prev) => [
      ...prev,
      { id, ...input, createdAt: new Date().toISOString(), exercises: [], answerKeys: [], teachingMaterials: [] },
    ]);
    return id;
  }, []);

  const addFileToUnit = useCallback(
    (unitId: string, group: HomeworkUnitFileGroup, name: string, kind: FileKind) => {
      setHomeworkUnits((prev) =>
        prev.map((u) =>
          u.id !== unitId
            ? u
            : {
                ...u,
                [group]: [
                  ...u[group],
                  {
                    id: "f" + Date.now() + Math.random().toString(36).slice(2, 6),
                    name,
                    kind,
                    addedAt: new Date().toISOString(),
                  },
                ],
              }
        )
      );
    },
    []
  );

  const pendingReviewCount = useMemo(() => checks.filter((c) => c.status === "needs_review").length, [checks]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      classrooms,
      tasks,
      notifications,
      pendingReviewCount,
      getClassroom,
      getStudent,
      createClassroom,
      addStudent,
      addSavedPlan,
      addSavedTechnique,
      showCreateModal,
      openCreateModal,
      closeCreateModal,
      checks,
      getCheck,
      getChecksForStudent,
      getChecksForClassroom,
      getRecentChecks,
      startCheck,
      correctQuestion,
      markReviewed,
      saveCheckToProfile,
      homeworkUnits,
      getHomeworkUnit,
      createHomeworkUnit,
      addFileToUnit,
    }),
    [
      classrooms,
      tasks,
      notifications,
      pendingReviewCount,
      getClassroom,
      getStudent,
      createClassroom,
      addStudent,
      addSavedPlan,
      addSavedTechnique,
      showCreateModal,
      openCreateModal,
      closeCreateModal,
      checks,
      getCheck,
      getChecksForStudent,
      getChecksForClassroom,
      getRecentChecks,
      startCheck,
      correctQuestion,
      markReviewed,
      saveCheckToProfile,
      homeworkUnits,
      getHomeworkUnit,
      createHomeworkUnit,
      addFileToUnit,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
