import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { asFileRef, asFileRefList, type StoredFileRef } from "@/lib/data/mappers";
import { getExerciseWithAnswerKey, listMaterialsForUnit } from "@/lib/data/homework-units";
import {
  resolveFileBlock,
  fetchStudentWorkPages,
  compressStudentWorkPages,
  type ContentBlock,
  type UploadedFile,
  type RawStudentPage,
} from "@/lib/ai/content-blocks";

type Client = SupabaseClient<Database>;
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

export type CheckingContext = {
  /** Provider-neutral — handed to the OCR stage, which must not depend on any one AI vendor's format. */
  studentWorkFiles: UploadedFile[];
  /** Claude-vision blocks — used only by Answer Analysis (still Claude-based), never by OCR. */
  referenceExerciseBlock: ContentBlock | null;
  answerKeyBlock: ContentBlock | null;
  answerKeyText: string | null;
  scoringCriteria: string | null;
  /** Non-grading context shared by both AI stages: student id, topic, teaching-materials note. */
  contextLines: string[];
};

export type CheckingContextResult = { ok: true; context: CheckingContext } | { ok: false; error: string };

// Conservative combined budget for the student's work images in one AI
// request (base64 adds ~33% on top of this, plus room for a reference
// exercise/answer-key image). Divided across however many pages were
// uploaded — a PDF counts by its actual rendered page count, not as one
// file — so a 20-page submission compresses harder per page than a 2-page
// one. This budget is also what runOcrStage (check-pipeline.ts) chunks
// studentWorkFiles against when splitting into multiple AI requests, so an
// arbitrarily large submission never needs to fit in a single request.
// MIN_PER_IMAGE_BYTES is a soft floor, not a hard one: compressImage() can
// shrink a single image down to ~320px/quality 28 if it has to, so pushing
// the floor lower is safe — it no longer risks the API rejecting a whole
// request the way a much larger floor could once the file count grew.
const STUDENT_IMAGES_TOTAL_BUDGET = 6 * 1024 * 1024;
const MIN_PER_IMAGE_BYTES = 40 * 1024;
const MAX_PER_IMAGE_BYTES = 1.5 * 1024 * 1024;

/**
 * Resolves everything the two-stage pipeline needs from a submission: the
 * student's uploaded work, and — from either a linked Homework Unit Exercise
 * or the submission's own Quick Check fields — the reference exercise file,
 * answer key, and scoring criteria. Shared by the initial run and both retry
 * routes so this resolution logic exists in exactly one place.
 */
export async function buildCheckingContext(supabase: Client, submission: SubmissionRow): Promise<CheckingContextResult> {
  const studentFileRefs = asFileRefList(submission.exercise_files);
  // Two phases, because the right per-image budget depends on the ACTUAL
  // page count — a 3-page PDF must count as 3 pages, not 1 file — which
  // isn't known until each file has been fetched and any PDF rasterized.
  const fetchedStudentFiles = await Promise.all(
    studentFileRefs.map((f) => fetchStudentWorkPages(supabase, "submissions", f.storage_path, f.file_name, f.file_kind))
  );

  const unreadableStudentFiles: string[] = [];
  const rawStudentPages: RawStudentPage[] = [];
  fetchedStudentFiles.forEach((result, i) => {
    if (!result) return; // download failed — silently drop, same as before
    if (result.unreadable) {
      unreadableStudentFiles.push(studentFileRefs[i].file_name);
      return;
    }
    rawStudentPages.push(...result.pages);
  });

  const imagePageCount = rawStudentPages.filter((p) => p.kind === "image").length;
  const perImageBudget = imagePageCount
    ? Math.min(MAX_PER_IMAGE_BYTES, Math.max(MIN_PER_IMAGE_BYTES, Math.floor(STUDENT_IMAGES_TOTAL_BUDGET / imagePageCount)))
    : MAX_PER_IMAGE_BYTES;
  const studentWorkFiles: UploadedFile[] = await compressStudentWorkPages(rawStudentPages, perImageBudget);

  if (studentWorkFiles.length === 0) {
    const error = unreadableStudentFiles.length
      ? `ไฟล์แบบฝึกหัดที่แนบมา (${unreadableStudentFiles.join(", ")}) เป็นไฟล์ประเภทที่ยังไม่รองรับ — รองรับเฉพาะรูปภาพ, PDF และไฟล์ข้อความ (.txt, .md)`
      : "ไม่พบไฟล์แบบฝึกหัดของนักเรียน";
    return { ok: false, error };
  }

  // Two sources of reference material: a reusable Homework Unit Exercise
  // (submission.exercise_id set — teacher never re-uploaded anything), or
  // the standalone Quick Check fields uploaded directly onto this submission.
  let referenceExerciseBlock: ContentBlock | null = null;
  let answerKeyBlock: ContentBlock | null = null;
  let answerKeyFileUnreadableName: string | null = null;
  let answerKeyText = submission.answer_key_text?.trim() || null;
  let scoringCriteria: string | null = null;
  let teachingMaterialsLine: string | null = null;

  if (submission.exercise_id) {
    const exercise = await getExerciseWithAnswerKey(supabase, submission.exercise_id);
    if (exercise) {
      scoringCriteria = exercise.scoringCriteria;

      const [exerciseFile, answerKeyFile] = await Promise.all([
        resolveFileBlock(supabase, "exercises", exercise.exerciseFilePath, exercise.exerciseFileName, exercise.exerciseFileKind, "แบบฝึกหัดต้นฉบับ"),
        resolveFileBlock(
          supabase,
          "answer-keys",
          exercise.answerKey?.filePath ?? null,
          exercise.answerKey?.fileName ?? null,
          exercise.answerKey?.fileKind,
          "ไฟล์เฉลย"
        ),
      ]);
      referenceExerciseBlock = exerciseFile.block;
      answerKeyBlock = answerKeyFile.block;
      answerKeyText = exercise.answerKey?.answerText?.trim() || null;

      const unreadableRefs = [exerciseFile.unreadableLabel, answerKeyFile.unreadableLabel].filter((v): v is string => !!v);
      if (unreadableRefs.length) {
        teachingMaterialsLine = `หมายเหตุ: มีไฟล์อ้างอิงที่ยังอ่านเนื้อหาไม่ได้ (รองรับเฉพาะรูปภาพ/PDF/ข้อความ): ${unreadableRefs.join(", ")}`;
      }
    }
    if (submission.homework_unit_id) {
      const materials = await listMaterialsForUnit(supabase, submission.homework_unit_id);
      if (materials.length) {
        teachingMaterialsLine = [
          teachingMaterialsLine,
          `มีสื่อการสอนที่เกี่ยวข้องกับชุดแบบฝึกหัดนี้ ${materials.length} ไฟล์: ${materials.map((m) => m.name).join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }
  } else {
    const answerKeyFileRef: StoredFileRef | null = asFileRef(submission.answer_key_file);
    if (answerKeyFileRef) {
      const resolved = await resolveFileBlock(
        supabase,
        "submissions",
        answerKeyFileRef.storage_path,
        answerKeyFileRef.file_name,
        answerKeyFileRef.file_kind,
        "ไฟล์เฉลย"
      );
      answerKeyBlock = resolved.block;
      answerKeyFileUnreadableName = resolved.unreadableLabel;
    }
  }

  if (!answerKeyText && !answerKeyBlock) {
    const error = answerKeyFileUnreadableName
      ? `ไฟล์เฉลยที่แนบมา (${answerKeyFileUnreadableName}) เป็นไฟล์ประเภทที่ยังไม่รองรับ — รองรับเฉพาะรูปภาพ, PDF และไฟล์ข้อความ (.txt, .md)`
      : "กรุณาแนบเฉลย";
    return { ok: false, error };
  }

  if (unreadableStudentFiles.length) {
    teachingMaterialsLine = [
      teachingMaterialsLine,
      `หมายเหตุ: มีไฟล์งานของนักเรียนที่ยังอ่านเนื้อหาไม่ได้ (รองรับเฉพาะรูปภาพ/PDF/ข้อความ): ${unreadableStudentFiles.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const contextLines = [
    `Student ID: ${submission.student_code}`,
    submission.topic ? `หัวข้อ/บทเรียน: ${submission.topic}` : null,
    submission.teaching_materials_text?.trim() ? `สื่อ/บันทึกการสอนที่เกี่ยวข้อง:\n${submission.teaching_materials_text.trim()}` : null,
    teachingMaterialsLine,
  ].filter((v): v is string => !!v);

  return {
    ok: true,
    context: { studentWorkFiles, referenceExerciseBlock, answerKeyBlock, answerKeyText, scoringCriteria, contextLines },
  };
}
