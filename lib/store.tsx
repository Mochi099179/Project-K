"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  Check,
  Classroom,
  FileKind,
  HomeworkUnit,
  QuestionResult,
  Student,
} from "./types";
import { computeOverallScore } from "./types";
import { getSupabaseBrowserClient } from "./supabase/client";
import * as classroomsApi from "./data/classrooms";
import * as homeworkUnitsApi from "./data/homework-units";
import * as submissionsApi from "./data/submissions";
import type { ReadImageResult } from "./files";

type NewStudentInput = { name?: string; studentId: string; seatNo?: number; gender?: "M" | "F" };
type CreateClassroomInput = { name: string; grade: string; problems: string[]; students?: NewStudentInput[] };
type AddStudentInput = { name: string; studentId: string; seatNo: number; gender: "M" | "F" };

type StartCheckInput = {
  studentLabel: string;
  topic?: string;
  teachingMaterialsText?: string;
  answerKeyText?: string;
  answerKeyImage?: ReadImageResult | null;
  exerciseImages: ReadImageResult[];
  classroomId?: string | null;
  studentId?: string | null;
  homeworkUnitId?: string | null;
  exerciseId?: string | null;
};

type CreateHomeworkUnitInput = { name: string; subject: string; grade: string };

type CreateExerciseInput = {
  title: string;
  description?: string;
  scoringCriteria?: string;
  maxScore?: number;
  exerciseFile?: { file: File; kind: FileKind } | null;
  answerKeyFile?: { file: File; kind: FileKind } | null;
  answerKeyText?: string;
};

// tasks/notifications are cosmetic widgets that were never part of the
// approved DB schema (see README) — kept as static local data so the
// existing Topbar notification badge keeps working unchanged.
const STATIC_NOTIFICATIONS = [
  { title: "มีงานรอตรวจสอบ", detail: "AI ตรวจแบบฝึกหัดเสร็จแล้ว รอครูยืนยันผล", time: "เมื่อสักครู่" },
];

type AppDataContextValue = {
  loading: boolean;
  teacherName: string;
  signOut: () => Promise<void>;

  classrooms: Classroom[];
  tasks: never[];
  notifications: typeof STATIC_NOTIFICATIONS;
  pendingReviewCount: number;
  getClassroom: (id: string) => Classroom | undefined;
  getStudent: (classroomId: string, studentId: string) => Student | undefined;
  createClassroom: (input: CreateClassroomInput) => Promise<string>;
  addStudent: (classroomId: string, input: AddStudentInput) => Promise<string>;
  showCreateModal: boolean;
  openCreateModal: (onDone?: (classroomId: string) => void) => void;
  closeCreateModal: () => void;

  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  getChecksForStudent: (classroomId: string, studentId: string) => Check[];
  getChecksForClassroom: (classroomId: string) => Check[];
  getRecentChecks: (limit?: number) => Check[];
  startCheck: (input: StartCheckInput) => Promise<string>;
  correctQuestion: (checkId: string, questionId: string, correction: QuestionResult) => Promise<void>;
  markReviewed: (checkId: string) => Promise<void>;
  saveCheckToProfile: (checkId: string, classroomId: string, studentId: string) => Promise<void>;

  homeworkUnits: HomeworkUnit[];
  getHomeworkUnit: (id: string) => HomeworkUnit | undefined;
  createHomeworkUnit: (input: CreateHomeworkUnitInput) => Promise<string>;
  addFileToUnit: (unitId: string, file: File, kind: FileKind) => Promise<void>;
  createExercise: (homeworkUnitId: string, input: CreateExerciseInput) => Promise<string>;
  deleteExercise: (homeworkUnitId: string, exerciseId: string) => Promise<void>;
  deleteHomeworkUnit: (unitId: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [homeworkUnits, setHomeworkUnits] = useState<HomeworkUnit[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalCallback, setCreateModalCallback] = useState<((id: string) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (cancelled) return;
      setUserId(user.id);

      // Promise.allSettled (not .all): one query failing — e.g. a migration
      // that hasn't been applied yet — must not leave the whole app stuck on
      // the loading screen forever. Every other section still loads normally.
      const [profileRes, classroomRes, unitRes, checkRes] = await Promise.allSettled([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        classroomsApi.listClassrooms(supabase),
        homeworkUnitsApi.listHomeworkUnits(supabase),
        submissionsApi.listRecentSubmissions(supabase, 500),
      ]);

      if (cancelled) return;

      if (profileRes.status === "fulfilled") setTeacherName(profileRes.value.data?.display_name || "ครูผู้สอน");
      else console.error("Failed to load profile:", profileRes.reason);

      if (classroomRes.status === "fulfilled") setClassrooms(classroomRes.value);
      else console.error("Failed to load classrooms:", classroomRes.reason);

      if (unitRes.status === "fulfilled") setHomeworkUnits(unitRes.value);
      else console.error("Failed to load homework units:", unitRes.reason);

      if (checkRes.status === "fulfilled") setChecks(checkRes.value);
      else console.error("Failed to load checks:", checkRes.reason);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    // Hard navigation (not router.push) is intentional here: it guarantees
    // every piece of in-memory app state (classrooms/checks/etc.) is dropped
    // on sign-out rather than briefly lingering from the previous session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }, []);

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
    async (input: CreateClassroomInput): Promise<string> => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบ");
      const supabase = getSupabaseBrowserClient();
      const id = await classroomsApi.createClassroom(supabase, userId, input);
      const fresh = await classroomsApi.getClassroom(supabase, id);
      if (fresh) setClassrooms((prev) => [fresh, ...prev]);
      setShowCreateModal(false);
      if (createModalCallback) {
        createModalCallback(id);
        setCreateModalCallback(null);
      }
      return id;
    },
    [userId, createModalCallback]
  );

  const addStudent = useCallback(async (classroomId: string, input: AddStudentInput): Promise<string> => {
    const supabase = getSupabaseBrowserClient();
    const id = await classroomsApi.addStudent(supabase, classroomId, input);
    const fresh = await classroomsApi.getClassroom(supabase, classroomId);
    if (fresh) setClassrooms((prev) => prev.map((c) => (c.id === classroomId ? fresh : c)));
    return id;
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

  const startCheck = useCallback(
    (input: StartCheckInput): Promise<string> => {
      const id = crypto.randomUUID();
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
        exerciseId: input.exerciseId ?? null,
        classroomId: input.classroomId ?? null,
        studentId: input.studentId ?? null,
        savedToProfile: null,
      };
      setChecks((prev) => [placeholder, ...prev]);

      void (async () => {
        try {
          if (!userId) throw new Error("กรุณาเข้าสู่ระบบ");
          const supabase = getSupabaseBrowserClient();

          const exerciseFileRefs = [];
          for (const img of input.exerciseImages) {
            exerciseFileRefs.push(await submissionsApi.uploadSubmissionFile(supabase, userId, id, img.file));
          }
          const answerKeyFileRef = input.answerKeyImage
            ? await submissionsApi.uploadSubmissionFile(supabase, userId, id, input.answerKeyImage.file)
            : null;

          await submissionsApi.createSubmissionShell(supabase, userId, {
            id,
            studentLabel: input.studentLabel,
            topic: input.topic,
            exerciseFiles: exerciseFileRefs,
            answerKeyFile: answerKeyFileRef,
            answerKeyText: input.answerKeyText,
            teachingMaterialsText: input.teachingMaterialsText,
            classroomId: input.classroomId,
            studentId: input.studentId,
            homeworkUnitId: input.homeworkUnitId,
            exerciseId: input.exerciseId,
          });

          const res = await fetch("/api/process-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: id }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || `คำขอล้มเหลว (${res.status})`);

          const refreshed = await submissionsApi.getSubmission(supabase, id);
          if (refreshed) {
            setChecks((prev) => [refreshed, ...prev.filter((c) => c.id !== id)]);
          }
        } catch (err) {
          setChecks((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, status: "failed", errorMessage: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจ" }
                : c
            )
          );
        }
      })();

      return Promise.resolve(id);
    },
    [userId]
  );

  const correctQuestion = useCallback(
    async (checkId: string, questionId: string, correction: QuestionResult) => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบ");
      const supabase = getSupabaseBrowserClient();
      const evaluationId = await submissionsApi.getEvaluationIdForQuestion(supabase, questionId);
      if (!evaluationId) throw new Error("ไม่พบข้อมูลการตรวจของข้อนี้");
      await submissionsApi.upsertTeacherCorrection(supabase, evaluationId, userId, correction);

      setChecks((prev) =>
        prev.map((c) => {
          if (c.id !== checkId) return c;
          const questions = c.questions.map((q) => (q.id === questionId ? { ...q, teacherCorrected: correction } : q));
          return { ...c, questions, overallScore: computeOverallScore(questions) };
        })
      );
    },
    [userId]
  );

  const markReviewed = useCallback(async (checkId: string) => {
    const supabase = getSupabaseBrowserClient();
    await submissionsApi.markSubmissionReviewed(supabase, checkId);
    setChecks((prev) => prev.map((c) => (c.id === checkId ? { ...c, status: "reviewed" } : c)));
  }, []);

  const saveCheckToProfile = useCallback(async (checkId: string, classroomId: string, studentId: string) => {
    const supabase = getSupabaseBrowserClient();
    await submissionsApi.linkSubmissionToProfile(supabase, checkId, classroomId, studentId);
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

  const createHomeworkUnit = useCallback(
    async (input: CreateHomeworkUnitInput): Promise<string> => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบ");
      const supabase = getSupabaseBrowserClient();
      const id = await homeworkUnitsApi.createHomeworkUnit(supabase, userId, input);
      const fresh = await homeworkUnitsApi.getHomeworkUnit(supabase, id);
      if (fresh) setHomeworkUnits((prev) => [fresh, ...prev]);
      return id;
    },
    [userId]
  );

  const addFileToUnit = useCallback(
    async (unitId: string, file: File, kind: FileKind) => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบ");
      const supabase = getSupabaseBrowserClient();
      await homeworkUnitsApi.addFileToHomeworkUnit(supabase, userId, unitId, "material", file, kind);
      const fresh = await homeworkUnitsApi.getHomeworkUnit(supabase, unitId);
      if (fresh) setHomeworkUnits((prev) => prev.map((u) => (u.id === unitId ? fresh : u)));
    },
    [userId]
  );

  const createExercise = useCallback(
    async (homeworkUnitId: string, input: CreateExerciseInput): Promise<string> => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบ");
      const supabase = getSupabaseBrowserClient();
      const id = await homeworkUnitsApi.createExercise(supabase, userId, homeworkUnitId, input);
      const fresh = await homeworkUnitsApi.getHomeworkUnit(supabase, homeworkUnitId);
      if (fresh) setHomeworkUnits((prev) => prev.map((u) => (u.id === homeworkUnitId ? fresh : u)));
      return id;
    },
    [userId]
  );

  const deleteExercise = useCallback(async (homeworkUnitId: string, exerciseId: string): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    await homeworkUnitsApi.deleteExercise(supabase, exerciseId);
    setHomeworkUnits((prev) =>
      prev.map((u) => (u.id === homeworkUnitId ? { ...u, exercises: u.exercises.filter((e) => e.id !== exerciseId) } : u))
    );
  }, []);

  const deleteHomeworkUnit = useCallback(async (unitId: string): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    await homeworkUnitsApi.deleteHomeworkUnit(supabase, unitId);
    setHomeworkUnits((prev) => prev.filter((u) => u.id !== unitId));
  }, []);

  const pendingReviewCount = useMemo(() => checks.filter((c) => c.status === "needs_review").length, [checks]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      teacherName,
      signOut,
      classrooms,
      tasks: [],
      notifications: STATIC_NOTIFICATIONS,
      pendingReviewCount,
      getClassroom,
      getStudent,
      createClassroom,
      addStudent,
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
      createExercise,
      deleteExercise,
      deleteHomeworkUnit,
    }),
    [
      loading,
      teacherName,
      signOut,
      classrooms,
      pendingReviewCount,
      getClassroom,
      getStudent,
      createClassroom,
      addStudent,
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
      createExercise,
      deleteExercise,
      deleteHomeworkUnit,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
