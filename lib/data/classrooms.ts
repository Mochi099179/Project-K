import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Classroom, Student } from "@/lib/types";
import { asStringArray, toJsonStringArray } from "./mappers";

type Client = SupabaseClient<Database>;
type ClassroomRow = Database["public"]["Tables"]["classrooms"]["Row"];
type StudentRow = Database["public"]["Tables"]["students"]["Row"];

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.display_name?.trim() || `นักเรียน ${row.student_code}`,
    studentId: row.student_code,
    seatNo: row.seat_no ?? 0,
    gender: row.gender ?? "M",
    problems: asStringArray(row.problems),
    // `homework` is a legacy per-student status blob from before the Check
    // pipeline existed. Nothing reads it for real logic anymore (see
    // CheckHomeworkPanel / LearningProfileCard, which use `checks` instead)
    // — kept only so StudentsTab's badge rendering doesn't need to branch.
    homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false },
  };
}

/**
 * Maps a DB classroom (+ students) into the app's `Classroom` shape.
 *
 * Dashboard/analytics-only fields (trend, distribution, groups, subjectScores,
 * topStudents) are NOT part of the approved schema — they
 * were mock numbers even before this migration and remain a known follow-up
 * (see README). `avgScore`/`riskCount` ARE computed from real submissions
 * where the caller supplies `stats` (see listClassrooms/getClassroom below).
 */
function mapClassroom(
  row: ClassroomRow,
  students: StudentRow[],
  stats?: { avgScore: number; riskCount: number }
): Classroom {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    grade: row.grade ?? "-",
    term: row.term ?? "",
    teacher: "",
    exercises: { total: 0, completed: 0, inProgress: 0 },
    avgScore: stats?.avgScore ?? 0,
    avgDelta: 0,
    riskCount: stats?.riskCount ?? 0,
    trend: [],
    distribution: [],
    groups: { excellent: 0, good: 0, developing: 0, support: 0 },
    subjectScores: [],
    topStudents: [],
    problems: asStringArray(row.learning_problems),
    students: students.map(mapStudent),
  };
}

/** Computes { classroomId -> { avgScore, riskCount } } from reviewed submissions in one query. */
async function computeClassroomStats(
  supabase: Client,
  classroomIds: string[]
): Promise<Map<string, { avgScore: number; riskCount: number }>> {
  const stats = new Map<string, { avgScore: number; riskCount: number }>();
  if (classroomIds.length === 0) return stats;

  const { data } = await supabase
    .from("submissions")
    .select("classroom_id, student_id, overall_score")
    .in("classroom_id", classroomIds)
    .not("overall_score", "is", null);

  const byClassroom = new Map<string, { total: number; count: number; byStudent: Map<string, number[]> }>();
  for (const row of data ?? []) {
    if (!row.classroom_id || row.overall_score === null) continue;
    const bucket = byClassroom.get(row.classroom_id) ?? { total: 0, count: 0, byStudent: new Map() };
    bucket.total += row.overall_score;
    bucket.count += 1;
    if (row.student_id) {
      const scores = bucket.byStudent.get(row.student_id) ?? [];
      scores.push(row.overall_score);
      bucket.byStudent.set(row.student_id, scores);
    }
    byClassroom.set(row.classroom_id, bucket);
  }

  for (const [classroomId, bucket] of byClassroom) {
    const avgScore = bucket.count ? Math.round(bucket.total / bucket.count) : 0;
    let riskCount = 0;
    for (const scores of bucket.byStudent.values()) {
      const studentAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (studentAvg < 60) riskCount += 1;
    }
    stats.set(classroomId, { avgScore, riskCount });
  }

  return stats;
}

export async function listClassrooms(supabase: Client): Promise<Classroom[]> {
  const { data: classrooms, error } = await supabase
    .from("classrooms")
    .select("*, students(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!classrooms) return [];

  const stats = await computeClassroomStats(
    supabase,
    classrooms.map((c) => c.id)
  );

  return classrooms.map((row) => {
    const { students, ...classroomRow } = row as ClassroomRow & { students: StudentRow[] };
    return mapClassroom(classroomRow, students ?? [], stats.get(row.id));
  });
}

export async function getClassroom(supabase: Client, id: string): Promise<Classroom | null> {
  const { data, error } = await supabase.from("classrooms").select("*, students(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { students, ...classroomRow } = data as ClassroomRow & { students: StudentRow[] };
  const stats = await computeClassroomStats(supabase, [id]);
  return mapClassroom(classroomRow, students ?? [], stats.get(id));
}

export async function createClassroom(
  supabase: Client,
  ownerId: string,
  input: { name: string; grade: string; problems: string[]; students?: { studentId: string; name?: string; gender?: "M" | "F" }[] }
): Promise<string> {
  const { data: classroom, error } = await supabase
    .from("classrooms")
    .insert({
      owner_id: ownerId,
      name: input.name || "ห้องเรียนใหม่",
      grade: input.grade || null,
      term: "ภาคเรียนที่ 1/2567",
      learning_problems: toJsonStringArray(input.problems),
    })
    .select("id")
    .single();

  if (error) throw error;

  if (input.students?.length) {
    const { error: studentsError } = await supabase.from("students").insert(
      input.students.map((s, i) => ({
        classroom_id: classroom.id,
        student_code: s.studentId,
        display_name: s.name?.trim() || null,
        seat_no: i + 1,
        gender: s.gender ?? "M",
      }))
    );
    if (studentsError) throw studentsError;
  }

  return classroom.id;
}

export async function addStudent(
  supabase: Client,
  classroomId: string,
  input: { name: string; studentId: string; seatNo: number; gender: "M" | "F" }
): Promise<string> {
  const { data, error } = await supabase
    .from("students")
    .insert({
      classroom_id: classroomId,
      student_code: input.studentId,
      display_name: input.name?.trim() || null,
      seat_no: input.seatNo,
      gender: input.gender,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
