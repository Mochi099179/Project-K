import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FileKind, FileRef, HomeworkUnit } from "@/lib/types";

type Client = SupabaseClient<Database>;
type UnitRow = Database["public"]["Tables"]["homework_units"]["Row"];
type FileRow = Database["public"]["Tables"]["homework_unit_files"]["Row"];

export type HomeworkFileGroup = "exercise" | "answer_key" | "material";

const BUCKET_BY_GROUP: Record<HomeworkFileGroup, string> = {
  exercise: "exercises",
  answer_key: "answer-keys",
  material: "teaching-materials",
};

function mapFileRef(row: FileRow): FileRef {
  return { id: row.id, name: row.file_name, kind: row.file_kind as FileKind, addedAt: row.created_at };
}

function mapHomeworkUnit(row: UnitRow, files: FileRow[]): HomeworkUnit {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    grade: row.grade ?? "-",
    createdAt: row.created_at,
    exercises: files.filter((f) => f.group_type === "exercise").map(mapFileRef),
    answerKeys: files.filter((f) => f.group_type === "answer_key").map(mapFileRef),
    teachingMaterials: files.filter((f) => f.group_type === "material").map(mapFileRef),
  };
}

export async function listHomeworkUnits(supabase: Client): Promise<HomeworkUnit[]> {
  const { data, error } = await supabase
    .from("homework_units")
    .select("*, homework_unit_files(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const { homework_unit_files, ...unitRow } = row as UnitRow & { homework_unit_files: FileRow[] };
    return mapHomeworkUnit(unitRow, homework_unit_files ?? []);
  });
}

export async function getHomeworkUnit(supabase: Client, id: string): Promise<HomeworkUnit | null> {
  const { data, error } = await supabase
    .from("homework_units")
    .select("*, homework_unit_files(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const { homework_unit_files, ...unitRow } = data as UnitRow & { homework_unit_files: FileRow[] };
  return mapHomeworkUnit(unitRow, homework_unit_files ?? []);
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

/** Uploads a real file to Storage (owner-scoped path) and records it against the unit. */
export async function addFileToHomeworkUnit(
  supabase: Client,
  ownerId: string,
  unitId: string,
  group: HomeworkFileGroup,
  file: File,
  kind: FileKind
): Promise<void> {
  const bucket = BUCKET_BY_GROUP[group];
  const path = `${ownerId}/${unitId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
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
