import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Exercise, FileKind, FileRef, HomeworkUnit } from "@/lib/types";

type Client = SupabaseClient<Database>;
type UnitRow = Database["public"]["Tables"]["homework_units"]["Row"];
type FileRow = Database["public"]["Tables"]["homework_unit_files"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type AnswerKeyRow = Database["public"]["Tables"]["answer_keys"]["Row"];

/** Homework Unit-level files: only Teaching Materials live here now (see migration 0006). */
export type HomeworkFileGroup = "material";

const HOMEWORK_UNIT_SELECT = "*, homework_unit_files(*), exercises(*, answer_keys(*))";

function mapFileRef(row: FileRow): FileRef {
  return { id: row.id, name: row.file_name, kind: row.file_kind as FileKind, addedAt: row.created_at };
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
    scoringCriteria: row.scoring_criteria,
    maxScore: row.max_score,
    answerKey: answerKey
      ? {
          id: answerKey.id,
          filePath: answerKey.file_path,
          fileName: answerKey.file_name,
          fileKind: answerKey.file_kind as FileKind,
          answerText: answerKey.answer_text,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type UnitWithRelations = UnitRow & { homework_unit_files: FileRow[]; exercises: (ExerciseRow & { answer_keys: AnswerKeyRow[] })[] };

function mapHomeworkUnit(row: UnitWithRelations): HomeworkUnit {
  const { homework_unit_files, exercises, ...unitRow } = row;
  return {
    id: unitRow.id,
    name: unitRow.name,
    subject: unitRow.subject,
    grade: unitRow.grade ?? "-",
    createdAt: unitRow.created_at,
    exercises: (exercises ?? [])
      .map((e) => mapExercise(e, e.answer_keys?.[0]))
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

/** Uploads a Teaching Material file to Storage (owner-scoped path) and records it against the unit. */
export async function addFileToHomeworkUnit(
  supabase: Client,
  ownerId: string,
  unitId: string,
  group: HomeworkFileGroup,
  file: File,
  kind: FileKind
): Promise<void> {
  const path = `${ownerId}/${unitId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("teaching-materials").upload(path, file);
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("homework_unit_files").insert({
    homework_unit_id: unitId,
    owner_id: ownerId,
    group_type: group,
    file_name: file.name,
    storage_path: path,
    file_kind: kind,
  });
  if (insertError) throw insertError;
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
      answer_text: input.answerKeyText?.trim() || null,
    });
    if (answerKeyError) throw answerKeyError;
  }

  return exerciseId;
}

/** Server-side: the full checking context for one Exercise (reference file + scoring criteria + answer key). */
export async function getExerciseWithAnswerKey(supabase: Client, exerciseId: string): Promise<Exercise | null> {
  const { data, error } = await supabase.from("exercises").select("*, answer_keys(*)").eq("id", exerciseId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { answer_keys, ...row } = data as ExerciseRow & { answer_keys: AnswerKeyRow[] };
  return mapExercise(row, answer_keys?.[0]);
}

/** Server-side: a Homework Unit's Teaching Materials, for AI context when checking against one of its Exercises. */
export async function listMaterialsForUnit(supabase: Client, homeworkUnitId: string): Promise<FileRef[]> {
  const { data, error } = await supabase
    .from("homework_unit_files")
    .select("*")
    .eq("homework_unit_id", homeworkUnitId)
    .eq("group_type", "material");
  if (error) throw error;
  return (data ?? []).map(mapFileRef);
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
  const answerKeyPath = (exercise?.answer_keys as { file_path: string | null }[] | null)?.[0]?.file_path;
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

  const exerciseRows = (unit?.exercises as { exercise_file_path: string | null; answer_keys: { file_path: string | null }[] }[] | null) ?? [];
  const exerciseFilePaths = exerciseRows.map((e) => e.exercise_file_path).filter((p): p is string => !!p);
  if (exerciseFilePaths.length) {
    await supabase.storage.from("exercises").remove(exerciseFilePaths);
  }
  const answerKeyPaths = exerciseRows.flatMap((e) => e.answer_keys.map((a) => a.file_path)).filter((p): p is string => !!p);
  if (answerKeyPaths.length) {
    await supabase.storage.from("answer-keys").remove(answerKeyPaths);
  }

  // Submissions that reference this unit/exercise are NOT deleted — their
  // homework_unit_id/exercise_id FKs are ON DELETE SET NULL (migrations
  // 0003, 0006), so student check history survives unit removal.
  const { error } = await supabase.from("homework_units").delete().eq("id", unitId);
  if (error) throw error;
}
