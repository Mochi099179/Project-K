import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FileKind } from "@/lib/types";
import { fetchStudentWorkPages, compressStudentWorkPages } from "@/lib/ai/content-blocks";
import { batchUploadedFiles, joinOcrPages } from "@/lib/ai/batching";
import { extractDocumentText } from "@/lib/ai/ocr";
import { updateExerciseOcrResult, updateAnswerKeyOcrResult, updateMaterialOcrResult } from "@/lib/data/homework-units";
import type { OcrPage } from "@/lib/validation/ai-result";

type Client = SupabaseClient<Database>;

// Reference documents (exercise sheets, answer keys, teaching materials) are
// typically a handful of pages at most — unlike student submissions, which
// can run long enough to need a per-request budget computed from total page
// count (see STUDENT_IMAGES_TOTAL_BUDGET in check-context.ts). A flat budget
// matching content-blocks.ts's own per-image default is enough here; the
// batching in lib/ai/batching.ts still protects against an unusually long
// reference PDF regardless.
const REFERENCE_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;

type FileTarget = {
  bucket: "exercises" | "answer-keys" | "teaching-materials";
  path: string;
  name: string;
  kind: FileKind | null;
};

type OcrOutcome = { ok: true; text: string; provider: string; model: string } | { ok: false; error: string };

/** Downloads, compresses, and transcribes one reference file — the create-time counterpart of runOcrStage's per-submission OCR call. */
async function ocrOneFile(supabase: Client, target: FileTarget): Promise<OcrOutcome> {
  const fetched = await fetchStudentWorkPages(supabase, target.bucket, target.path, target.name, target.kind ?? undefined);
  if (!fetched) return { ok: false, error: `ดาวน์โหลดไฟล์ "${target.name}" ไม่สำเร็จ` };
  if (fetched.unreadable || fetched.pages.length === 0) {
    return {
      ok: false,
      error: `ไฟล์ "${target.name}" เป็นไฟล์ประเภทที่ยังไม่รองรับ — รองรับเฉพาะรูปภาพ, PDF และไฟล์ข้อความ (.txt, .md)`,
    };
  }

  try {
    const uploaded = await compressStudentWorkPages(fetched.pages, REFERENCE_IMAGE_MAX_BYTES);
    const batches = batchUploadedFiles(uploaded);

    let pageOffset = 0;
    const mergedPages: OcrPage[] = [];
    let provider = "";
    let model = "";
    for (const batch of batches) {
      const result = await extractDocumentText({ files: batch, contextLines: [] });
      provider = result.provider;
      model = result.model;
      for (const page of result.normalized.pages) {
        mergedPages.push({ ...page, page_number: pageOffset + page.page_number });
      }
      pageOffset += batch.length;
    }

    const text = joinOcrPages(mergedPages);
    if (!text.trim()) return { ok: false, error: `ไม่พบข้อความที่อ่านได้จากไฟล์ "${target.name}"` };
    return { ok: true, text, provider, model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : `ถอดข้อความจากไฟล์ "${target.name}" ไม่สำเร็จ` };
  }
}

type ExerciseReferenceRow = {
  id: string;
  exercise_file_path: string | null;
  exercise_file_name: string | null;
  exercise_file_kind: FileKind;
  answer_keys: { id: string; file_path: string | null; file_name: string | null; file_kind: FileKind } | null;
};

/**
 * Processes an Exercise's own reference file and its paired answer-key file
 * (if present), independently — one failing doesn't block or roll back the
 * other. Triggered once, fire-and-forget, right after createExercise()
 * uploads either file (see app/api/exercise-ocr/route.ts), and again by the
 * UI's retry action.
 */
export async function runExerciseReferenceOcr(supabase: Client, ownerId: string, exerciseId: string): Promise<void> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, exercise_file_path, exercise_file_name, exercise_file_kind, answer_keys(id, file_path, file_name, file_kind)")
    .eq("id", exerciseId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  const exercise = data as unknown as ExerciseReferenceRow | null;
  if (!exercise) return;

  const tasks: Promise<void>[] = [];

  if (exercise.exercise_file_path) {
    const path = exercise.exercise_file_path;
    tasks.push(
      (async () => {
        await updateExerciseOcrResult(supabase, exerciseId, { status: "processing" });
        const outcome = await ocrOneFile(supabase, {
          bucket: "exercises",
          path,
          name: exercise.exercise_file_name ?? path,
          kind: exercise.exercise_file_kind,
        });
        await updateExerciseOcrResult(
          supabase,
          exerciseId,
          outcome.ok ? { status: "completed", text: outcome.text, provider: outcome.provider, model: outcome.model } : { status: "failed", error: outcome.error }
        );
      })()
    );
  }

  const answerKey = exercise.answer_keys;
  if (answerKey?.file_path) {
    const path = answerKey.file_path;
    tasks.push(
      (async () => {
        await updateAnswerKeyOcrResult(supabase, answerKey.id, { status: "processing" });
        const outcome = await ocrOneFile(supabase, {
          bucket: "answer-keys",
          path,
          name: answerKey.file_name ?? path,
          kind: answerKey.file_kind,
        });
        await updateAnswerKeyOcrResult(
          supabase,
          answerKey.id,
          outcome.ok ? { status: "completed", text: outcome.text, provider: outcome.provider, model: outcome.model } : { status: "failed", error: outcome.error }
        );
      })()
    );
  }

  const settled = await Promise.allSettled(tasks);
  for (const result of settled) {
    if (result.status === "rejected") console.error(`[reference-ocr] exercise ${exerciseId} sub-task failed:`, result.reason);
  }
}

/** Processes one Teaching Material file. Triggered once, fire-and-forget, right after addFileToHomeworkUnit() uploads it, and again by the UI's retry action. */
export async function runMaterialOcr(supabase: Client, ownerId: string, materialId: string): Promise<void> {
  const { data: material, error } = await supabase
    .from("homework_unit_files")
    .select("id, storage_path, file_name, file_kind, group_type")
    .eq("id", materialId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!material || material.group_type !== "material" || !material.storage_path) return;

  await updateMaterialOcrResult(supabase, materialId, { status: "processing" });
  const outcome = await ocrOneFile(supabase, {
    bucket: "teaching-materials",
    path: material.storage_path,
    name: material.file_name,
    kind: material.file_kind,
  });
  await updateMaterialOcrResult(
    supabase,
    materialId,
    outcome.ok ? { status: "completed", text: outcome.text, provider: outcome.provider, model: outcome.model } : { status: "failed", error: outcome.error }
  );
}
