import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReferenceOcrStatus } from "@/lib/supabase/database.types";
import type { Exercise, FileKind, FileRef, HomeworkUnit } from "@/lib/types";

export type ReferenceOcrPatch =
  | { status: "processing" }
  | { status: "completed"; text: string; provider: string; model: string }
  | { status: "failed"; error: string };

type Client = SupabaseClient<Database>;
type UnitRow = Database["public"]["Tables"]["homework_units"]["Row"];
type FileRow = Database["public"]["Tables"]["homework_unit_files"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type AnswerKeyRow = Database["public"]["Tables"]["answer_keys"]["Row"];

/** Homework Unit-level files: only Teaching Materials live here now (see migration 0006). */
export type HomeworkFileGroup = "material";

const HOMEWORK_UNIT_SELECT = "*, homework_unit_files(*), exercises(*, answer_keys(*))";

function mapFileRef(row: FileRow): FileRef {
  return {
    id: row.id,
    name: row.file_name,
    kind: row.file_kind as FileKind,
    addedAt: row.created_at,
    ocrStatus: row.ocr_status,
    ocrError: row.ocr_error,
  };
}

function mapExercise(row: ExerciseRow, answerKey: AnswerKeyRow | undefined): Exercise {
  return {
    id: row.id,
    homeworkUnitId: row.homework_unit_id,
    title: row.title,
    description: row.description,
    exerciseFilePath: row.exercise_file_path,
    exerciseFileName: row.exercise_file_name,
    exerciseFileKind: row.exercise_file_kind as FileKind,
    exerciseFileOcrStatus: row.ocr_status,
    exerciseFileOcrError: row.ocr_error,
    scoringCriteria: row.scoring_criteria,
    maxScore: row.max_score,
    answerKey: answerKey
      ? {
          id: answerKey.id,
          filePath: answerKey.file_path,
          fileName: answerKey.file_name,
          fileKind: answerKey.file_kind as FileKind,
          answerText: answerKey.answer_text,
          ocrStatus: answerKey.ocr_status,
          ocrError: answerKey.ocr_error,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// answer_keys.exercise_id is unique, so PostgREST embeds it as a single
// object (or null) — not an array — when queried from the exercises side.
type UnitWithRelations = UnitRow & {
  homework_unit_files: FileRow[];
  exercises: (ExerciseRow & { answer_keys: AnswerKeyRow | null })[];
};

function mapHomeworkUnit(row: UnitWithRelations): HomeworkUnit {
  const { homework_unit_files, exercises, ...unitRow } = row;
  return {
    id: unitRow.id,
    name: unitRow.name,
    subject: unitRow.subject,
    grade: unitRow.grade ?? "-",
    createdAt: unitRow.created_at,
    exercises: (exercises ?? [])
      .map((e) => mapExercise(e, e.answer_keys ?? undefined))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    teachingMaterials: (homework_unit_files ?? [])
      .filter((f) => f.group_type === "material")
      .map(mapFileRef),
  };
}

export async function listHomeworkUnits(supabase: Client): Promise<HomeworkUnit[]> {
  const { data, error } = await supabase
    .from("homework_units")
    .select(HOMEWORK_UNIT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapHomeworkUnit(row as unknown as UnitWithRelations));
}

export async function getHomeworkUnit(supabase: Client, id: string): Promise<HomeworkUnit | null> {
  const { data, error } = await supabase.from("homework_units").select(HOMEWORK_UNIT_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapHomeworkUnit(data as unknown as UnitWithRelations);
}

export async function createHomeworkUnit(
  supabase: Client,
  ownerId: string,
  input: { name: string; subject: string; grade: string }
): Promise<string> {
  const { data, error } = await supabase
    .from("homework_units")
    .insert({ owner_id: ownerId, name: input.name, subject: input.subject, grade: input.grade || null })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Uploads a Teaching Material file to Storage (owner-scoped path), records it against the unit, and returns the new row's id — the caller fires off OCR for it (see app/api/material-ocr/route.ts). */
export async function addFileToHomeworkUnit(
  supabase: Client,
  ownerId: string,
  unitId: string,
  group: HomeworkFileGroup,
  file: File,
  kind: FileKind
): Promise<string> {
  const path = `${ownerId}/${unitId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("teaching-materials").upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("homework_unit_files")
    .insert({
      homework_unit_id: unitId,
      owner_id: ownerId,
      group_type: group,
      file_name: file.name,
      storage_path: path,
      file_kind: kind,
      ocr_status: "pending",
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id;
}

// ----------------------------------------------------------------------------
// Exercises — each one carries its own reference file, scoring criteria, and
// paired answer key, so the Check workflow can pull a full checking context
// from a single (homeworkUnitId, exerciseId) pair with no re-upload.
// ----------------------------------------------------------------------------

export async function createExercise(
  supabase: Client,
  ownerId: string,
  homeworkUnitId: string,
  input: {
    title: string;
    description?: string;
    scoringCriteria?: string;
    maxScore?: number;
    exerciseFile?: { file: File; kind: FileKind } | null;
    answerKeyFile?: { file: File; kind: FileKind } | null;
    answerKeyText?: string;
  }
): Promise<string> {
  const exerciseId = crypto.randomUUID();

  let exerciseFilePath: string | null = null;
  if (input.exerciseFile) {
    exerciseFilePath = `${ownerId}/${exerciseId}/${Date.now()}-${input.exerciseFile.file.name}`;
    const { error } = await supabase.storage.from("exercises").upload(exerciseFilePath, input.exerciseFile.file);
    if (error) throw error;
  }

  const { error: insertError } = await supabase.from("exercises").insert({
    id: exerciseId,
    homework_unit_id: homeworkUnitId,
    owner_id: ownerId,
    title: input.title,
    description: input.description || null,
    exercise_file_path: exerciseFilePath,
    exercise_file_name: input.exerciseFile?.file.name ?? null,
    exercise_file_kind: input.exerciseFile?.kind ?? "other",
    ocr_status: input.exerciseFile ? "pending" : null,
    scoring_criteria: input.scoringCriteria || null,
    max_score: input.maxScore ?? null,
  });
  if (insertError) throw insertError;

  const hasAnswerKey = !!input.answerKeyFile || !!input.answerKeyText?.trim();
  if (hasAnswerKey) {
    let answerKeyFilePath: string | null = null;
    if (input.answerKeyFile) {
      answerKeyFilePath = `${ownerId}/${exerciseId}/${Date.now()}-${input.answerKeyFile.file.name}`;
      const { error } = await supabase.storage.from("answer-keys").upload(answerKeyFilePath, input.answerKeyFile.file);
      if (error) throw error;
    }

    const { error: answerKeyError } = await supabase.from("answer_keys").insert({
      exercise_id: exerciseId,
      owner_id: ownerId,
      file_path: answerKeyFilePath,
      file_name: input.answerKeyFile?.file.name ?? null,
      file_kind: input.answerKeyFile?.kind ?? "other",
      ocr_status: input.answerKeyFile ? "pending" : null,
      answer_text: input.answerKeyText?.trim() || null,
    });
    if (answerKeyError) throw answerKeyError;
  }

  return exerciseId;
}

/**
 * Server-side only: an Exercise plus its and its answer-key's cached OCR
 * text/status — kept as a superset of the client-facing `Exercise` type
 * rather than added to it, since cached OCR text must never reach the
 * client (see lib/pipeline/check-context.ts, the only caller of this
 * function).
 */
export type ExerciseWithOcrCache = Exercise & {
  exerciseOcrText: string | null;
  exerciseOcrStatus: ReferenceOcrStatus | null;
  answerKeyOcrText: string | null;
  answerKeyOcrStatus: ReferenceOcrStatus | null;
};

/** Server-side: the full checking context for one Exercise (reference file + scoring criteria + answer key + cached OCR text). */
export async function getExerciseWithAnswerKey(supabase: Client, exerciseId: string): Promise<ExerciseWithOcrCache | null> {
  const { data, error } = await supabase.from("exercises").select("*, answer_keys(*)").eq("id", exerciseId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { answer_keys, ...row } = data as ExerciseRow & { answer_keys: AnswerKeyRow | null };
  return {
    ...mapExercise(row, answer_keys ?? undefined),
    exerciseOcrText: row.ocr_text,
    exerciseOcrStatus: row.ocr_status,
    answerKeyOcrText: answer_keys?.ocr_text ?? null,
    answerKeyOcrStatus: answer_keys?.ocr_status ?? null,
  };
}

/** Server-side only: a Teaching Material plus its cached OCR text — see ExerciseWithOcrCache for why this isn't folded into the client-facing `FileRef` type. */
export type MaterialWithOcrCache = FileRef & { ocrText: string | null; ocrStatus: ReferenceOcrStatus | null };

/** Server-side: a Homework Unit's Teaching Materials (with cached OCR text), for AI context when checking against one of its Exercises. */
export async function listMaterialsForUnit(supabase: Client, homeworkUnitId: string): Promise<MaterialWithOcrCache[]> {
  const { data, error } = await supabase
    .from("homework_unit_files")
    .select("*")
    .eq("homework_unit_id", homeworkUnitId)
    .eq("group_type", "material");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...mapFileRef(row), ocrText: row.ocr_text, ocrStatus: row.ocr_status }));
}

// ----------------------------------------------------------------------------
// Reference-material OCR writes — see lib/pipeline/reference-ocr.ts. A retry
// simply overwrites the same row's ocr_* columns in place (unlike
// submissions' ocr_results, these aren't kept as history — see migration
// 0009's own comment for why). A failed attempt never clears a previously
// cached ocr_text, so a flaky retry can't regress a working cache back to
// "nothing cached".
// ----------------------------------------------------------------------------

function referenceOcrUpdatePayload(patch: ReferenceOcrPatch) {
  if (patch.status === "processing") {
    return { ocr_status: "processing" as const };
  }
  if (patch.status === "completed") {
    return {
      ocr_status: "completed" as const,
      ocr_text: patch.text,
      ocr_provider: patch.provider,
      ocr_model: patch.model,
      ocr_error: null,
      ocr_processed_at: new Date().toISOString(),
    };
  }
  return { ocr_status: "failed" as const, ocr_error: patch.error, ocr_processed_at: new Date().toISOString() };
}

export async function updateExerciseOcrResult(supabase: Client, exerciseId: string, patch: ReferenceOcrPatch): Promise<void> {
  const { error } = await supabase.from("exercises").update(referenceOcrUpdatePayload(patch)).eq("id", exerciseId);
  if (error) throw error;
}

export async function updateAnswerKeyOcrResult(supabase: Client, answerKeyId: string, patch: ReferenceOcrPatch): Promise<void> {
  const { error } = await supabase.from("answer_keys").update(referenceOcrUpdatePayload(patch)).eq("id", answerKeyId);
  if (error) throw error;
}

export async function updateMaterialOcrResult(supabase: Client, materialId: string, patch: ReferenceOcrPatch): Promise<void> {
  const { error } = await supabase.from("homework_unit_files").update(referenceOcrUpdatePayload(patch)).eq("id", materialId);
  if (error) throw error;
}

export async function deleteExercise(supabase: Client, exerciseId: string): Promise<void> {
  const { data: exercise, error: fetchError } = await supabase
    .from("exercises")
    .select("exercise_file_path, answer_keys(file_path)")
    .eq("id", exerciseId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (exercise?.exercise_file_path) {
    await supabase.storage.from("exercises").remove([exercise.exercise_file_path]);
  }
  const answerKeyPath = (exercise?.answer_keys as { file_path: string | null } | null)?.file_path;
  if (answerKeyPath) {
    await supabase.storage.from("answer-keys").remove([answerKeyPath]);
  }

  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) throw error;
}

export async function deleteHomeworkUnit(supabase: Client, unitId: string): Promise<void> {
  const { data: unit, error: fetchError } = await supabase
    .from("homework_units")
    .select("homework_unit_files(storage_path), exercises(exercise_file_path, answer_keys(file_path))")
    .eq("id", unitId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const materialPaths = ((unit?.homework_unit_files as { storage_path: string | null }[] | null) ?? [])
    .map((f) => f.storage_path)
    .filter((p): p is string => !!p);
  if (materialPaths.length) {
    await supabase.storage.from("teaching-materials").remove(materialPaths);
  }

  const exerciseRows =
    (unit?.exercises as { exercise_file_path: string | null; answer_keys: { file_path: string | null } | null }[] | null) ?? [];
  const exerciseFilePaths = exerciseRows.map((e) => e.exercise_file_path).filter((p): p is string => !!p);
  if (exerciseFilePaths.length) {
    await supabase.storage.from("exercises").remove(exerciseFilePaths);
  }
  const answerKeyPaths = exerciseRows.map((e) => e.answer_keys?.file_path).filter((p): p is string => !!p);
  if (answerKeyPaths.length) {
    await supabase.storage.from("answer-keys").remove(answerKeyPaths);
  }

  // Submissions that reference this unit/exercise are NOT deleted — their
  // homework_unit_id/exercise_id FKs are ON DELETE SET NULL (migrations
  // 0003, 0006), so student check history survives unit removal.
  const { error } = await supabase.from("homework_units").delete().eq("id", unitId);
  if (error) throw error;
}
