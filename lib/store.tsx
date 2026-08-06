"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Classroom, PlanRow, Student, TechniqueResult } from "./types";
import { initialClassrooms, initialNotifications, initialTasks } from "./mock-data";

type CreateClassroomInput = {
  name: string;
  grade: string;
  problems: string[];
};

type AddStudentInput = {
  name: string;
  studentId: string;
  seatNo: number;
  gender: "M" | "F";
};

type AppDataContextValue = {
  classrooms: Classroom[];
  tasks: typeof initialTasks;
  notifications: typeof initialNotifications;
  pendingReviewCount: number;
  getClassroom: (id: string) => Classroom | undefined;
  getStudent: (classroomId: string, studentId: string) => Student | undefined;
  createClassroom: (input: CreateClassroomInput) => string;
  addStudent: (classroomId: string, input: AddStudentInput) => void;
  toggleHasFile: (classroomId: string, studentId: string) => void;
  toggleHasAnswer: (classroomId: string, studentId: string) => void;
  sendToAI: (classroomId: string, studentId: string) => void;
  confirmGrading: (classroomId: string, studentId: string) => void;
  addSavedPlan: (classroomId: string, topic: string, rows: PlanRow[]) => void;
  addSavedTechnique: (classroomId: string, result: TechniqueResult) => void;
  showCreateModal: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

const MOCK_GRADE_SETS = [
  { score: 82, strengths: ["เข้าใจแนวคิดหลักของบทเรียนได้ดี", "ลำดับขั้นตอนการตอบชัดเจน"], weaknesses: ["สรุปใจความสำคัญยังไม่ครบถ้วน"], suggestions: ["ฝึกสรุปบทเรียนด้วยแผนภาพก่อนทำโจทย์"] },
  { score: 74, strengths: ["ตั้งใจทำแบบฝึกหัดจนจบ"], weaknesses: ["ใช้เวลาทำโจทย์นานกว่าเพื่อน"], suggestions: ["แบ่งโจทย์เป็นชุดย่อยเพื่อลดความกดดันเรื่องเวลา"] },
  { score: 90, strengths: ["ตอบคำถามได้ถูกต้องครบถ้วน"], weaknesses: ["ไม่ค่อยอธิบายเหตุผลประกอบ"], suggestions: ['กระตุ้นให้อธิบาย "ทำไม" ทุกครั้งที่ตอบ'] },
];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [tasks] = useState(initialTasks);
  const [notifications] = useState(initialNotifications);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);

  const getClassroom = useCallback(
    (id: string) => classrooms.find((c) => c.id === id),
    [classrooms]
  );

  const getStudent = useCallback(
    (classroomId: string, studentId: string) => {
      const classroom = classrooms.find((c) => c.id === classroomId);
      return classroom?.students.find((s) => s.id === studentId);
    },
    [classrooms]
  );

  const updateStudentHomework = useCallback(
    (classroomId: string, studentId: string, updater: (hw: Student["homework"]) => Student["homework"]) => {
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id !== classroomId
            ? c
            : {
                ...c,
                students: c.students.map((st) =>
                  st.id === studentId ? { ...st, homework: updater(st.homework) } : st
                ),
              }
        )
      );
    },
    []
  );

  const createClassroom = useCallback((input: CreateClassroomInput) => {
    const id = "c" + Date.now();
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
      students: [],
    };
    setClassrooms((prev) => [...prev, newClassroom]);
    setShowCreateModal(false);
    return id;
  }, []);

  const addStudent = useCallback((classroomId: string, input: AddStudentInput) => {
    const newStudent: Student = {
      id: "s" + Date.now(),
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
  }, []);

  const toggleHasFile = useCallback(
    (classroomId: string, studentId: string) => {
      updateStudentHomework(classroomId, studentId, (hw) => ({ ...hw, hasFile: !hw.hasFile }));
    },
    [updateStudentHomework]
  );

  const toggleHasAnswer = useCallback(
    (classroomId: string, studentId: string) => {
      updateStudentHomework(classroomId, studentId, (hw) => ({ ...hw, hasAnswer: !hw.hasAnswer }));
    },
    [updateStudentHomework]
  );

  const sendToAI = useCallback(
    (classroomId: string, studentId: string) => {
      updateStudentHomework(classroomId, studentId, (hw) => ({ ...hw, status: "grading" }));
      setTimeout(() => {
        const mock = MOCK_GRADE_SETS[Math.floor(Math.random() * MOCK_GRADE_SETS.length)];
        updateStudentHomework(classroomId, studentId, (hw) => ({
          ...hw,
          status: "graded",
          confirmed: false,
          ...mock,
        }));
      }, 1600);
    },
    [updateStudentHomework]
  );

  const confirmGrading = useCallback(
    (classroomId: string, studentId: string) => {
      updateStudentHomework(classroomId, studentId, (hw) => ({ ...hw, confirmed: true }));
    },
    [updateStudentHomework]
  );

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

  const pendingReviewCount = useMemo(
    () =>
      classrooms.reduce(
        (sum, c) =>
          sum +
          c.students.filter((st) => st.homework.status === "graded" && !st.homework.confirmed).length +
          c.exercises.inProgress,
        0
      ),
    [classrooms]
  );

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
      toggleHasFile,
      toggleHasAnswer,
      sendToAI,
      confirmGrading,
      addSavedPlan,
      addSavedTechnique,
      showCreateModal,
      openCreateModal,
      closeCreateModal,
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
      toggleHasFile,
      toggleHasAnswer,
      sendToAI,
      confirmGrading,
      addSavedPlan,
      addSavedTechnique,
      showCreateModal,
      openCreateModal,
      closeCreateModal,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
