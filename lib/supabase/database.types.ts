// Hand-authored to match supabase/migrations/*.sql.
// Once the project is live, replace this file with the real output of:
//   supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
// The shape is intentionally identical to what that command produces, so the
// swap is a drop-in replacement — nothing else in the app needs to change.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SubmissionStatus =
  | "uploaded"
  | "processing"
  | "ocr_completed"
  | "extracting"
  | "evaluating"
  | "review_required"
  | "completed"
  | "failed";

export type HomeworkFileGroup = "exercise" | "answer_key" | "material";
export type FileKindEnum = "image" | "pdf" | "text" | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
        };
        Update: {
          display_name?: string;
        };
      };
      classrooms: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          subject: string;
          grade: string | null;
          term: string | null;
          learning_problems: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          subject?: string;
          grade?: string | null;
          term?: string | null;
          learning_problems?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["classrooms"]["Insert"]>;
      };
      students: {
        Row: {
          id: string;
          classroom_id: string;
          student_code: string;
          display_name: string | null;
          seat_no: number | null;
          gender: "M" | "F" | null;
          problems: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          classroom_id: string;
          student_code: string;
          display_name?: string | null;
          seat_no?: number | null;
          gender?: "M" | "F" | null;
          problems?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      homework_units: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          subject: string;
          grade: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          subject?: string;
          grade?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["homework_units"]["Insert"]>;
      };
      homework_unit_files: {
        Row: {
          id: string;
          homework_unit_id: string;
          owner_id: string;
          group_type: HomeworkFileGroup;
          file_name: string;
          storage_path: string | null;
          file_kind: FileKindEnum;
          created_at: string;
        };
        Insert: {
          id?: string;
          homework_unit_id: string;
          owner_id: string;
          group_type: HomeworkFileGroup;
          file_name: string;
          storage_path?: string | null;
          file_kind?: FileKindEnum;
        };
        Update: Partial<Database["public"]["Tables"]["homework_unit_files"]["Insert"]>;
      };
      submissions: {
        Row: {
          id: string;
          owner_id: string;
          student_code: string;
          student_id: string | null;
          classroom_id: string | null;
          homework_unit_id: string | null;
          exercise_id: string | null;
          topic: string | null;
          status: SubmissionStatus;
          exercise_files: Json; // { storage_path: string; file_name: string }[]
          answer_key_file: Json | null; // { storage_path: string; file_name: string } | null
          answer_key_text: string | null;
          teaching_materials_text: string | null;
          overall_score: number | null;
          error_message: string | null;
          saved_to_profile_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          student_code: string;
          student_id?: string | null;
          classroom_id?: string | null;
          homework_unit_id?: string | null;
          exercise_id?: string | null;
          topic?: string | null;
          status?: SubmissionStatus;
          exercise_files?: Json;
          answer_key_file?: Json | null;
          answer_key_text?: string | null;
          teaching_materials_text?: string | null;
          overall_score?: number | null;
          error_message?: string | null;
          saved_to_profile_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
      };
      exercises: {
        Row: {
          id: string;
          homework_unit_id: string;
          owner_id: string;
          title: string;
          description: string | null;
          exercise_file_path: string | null;
          exercise_file_name: string | null;
          exercise_file_kind: FileKindEnum;
          scoring_criteria: string | null;
          max_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          homework_unit_id: string;
          owner_id: string;
          title: string;
          description?: string | null;
          exercise_file_path?: string | null;
          exercise_file_name?: string | null;
          exercise_file_kind?: FileKindEnum;
          scoring_criteria?: string | null;
          max_score?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
      };
      answer_keys: {
        Row: {
          id: string;
          exercise_id: string;
          owner_id: string;
          file_path: string | null;
          file_name: string | null;
          file_kind: FileKindEnum;
          answer_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          owner_id: string;
          file_path?: string | null;
          file_name?: string | null;
          file_kind?: FileKindEnum;
          answer_text?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["answer_keys"]["Insert"]>;
      };
      questions: {
        Row: {
          id: string;
          submission_id: string;
          question_number: number;
          question_text: string;
          student_answer: string;
          expected_answer: string;
          keywords: Json; // string[]
          features: Json; // string[]
          context: Json; // string[]
          extraction_confidence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_number: number;
          question_text: string;
          student_answer?: string;
          expected_answer?: string;
          keywords?: Json;
          features?: Json;
          context?: Json;
          extraction_confidence?: number;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
      };
      evaluations: {
        Row: {
          id: string;
          question_id: string;
          is_correct: boolean;
          score: number;
          error_type: string;
          concept_issue: string;
          reasoning: string;
          areas_to_improve: Json; // string[]
          evaluation_confidence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          is_correct: boolean;
          score?: number;
          error_type?: string;
          concept_issue?: string;
          reasoning?: string;
          areas_to_improve?: Json;
          evaluation_confidence?: number;
        };
        Update: Partial<Database["public"]["Tables"]["evaluations"]["Insert"]>;
      };
      teacher_corrections: {
        Row: {
          id: string;
          evaluation_id: string;
          teacher_id: string;
          corrected_is_correct: boolean;
          corrected_score: number;
          corrected_error_type: string;
          corrected_reasoning: string;
          corrected_areas_to_improve: Json; // string[]
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          evaluation_id: string;
          teacher_id: string;
          corrected_is_correct: boolean;
          corrected_score?: number;
          corrected_error_type?: string;
          corrected_reasoning?: string;
          corrected_areas_to_improve?: Json;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["teacher_corrections"]["Insert"]>;
      };
    };
    Views: {
      final_results: {
        Row: {
          question_id: string;
          submission_id: string;
          question_number: number;
          question_text: string;
          student_answer: string;
          expected_answer: string;
          keywords: Json;
          features: Json;
          context: Json;
          extraction_confidence: number;
          evaluation_id: string;
          evaluation_confidence: number;
          is_correct: boolean;
          score: number;
          error_type: string;
          concept_issue: string;
          reasoning: string;
          areas_to_improve: Json;
          is_teacher_corrected: boolean;
        };
      };
    };
    Enums: {
      submission_status: SubmissionStatus;
      homework_file_group: HomeworkFileGroup;
      file_kind: FileKindEnum;
    };
  };
}
