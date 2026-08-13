import type { Json } from "@/lib/supabase/database.types";
import type { FileKind } from "@/lib/types";

/** DB jsonb columns that store string[] (keywords, features, context, areas_to_improve, problems). */
export function asStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function toJsonStringArray(value: string[]): Json {
  return value as unknown as Json;
}

// file_kind is optional so old rows written before this field existed still parse.
export type StoredFileRef = { storage_path: string; file_name: string; file_kind?: FileKind };

export function asFileRefList(value: Json | null | undefined): StoredFileRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is StoredFileRef => !!v && typeof v === "object" && "storage_path" in v && "file_name" in v
  ) as StoredFileRef[];
}

export function asFileRef(value: Json | null | undefined): StoredFileRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("storage_path" in value) || !("file_name" in value)) return null;
  return value as unknown as StoredFileRef;
}
