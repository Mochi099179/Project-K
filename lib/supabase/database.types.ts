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
  | "failed"
  | "ocr_failed"
  | "analysis_failed";

export type HomeworkFileGroup = "exercise" | "answer_key" | "material";
export type FileKindEnum = "image" | "pdf" | "text" | "other";
export type ReferenceOcrStatus = "pending" | "processing" | "completed" | "failed";

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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "classrooms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "students_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "homework_units_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
          ocr_text: string | null;
          ocr_status: ReferenceOcrStatus | null;
          ocr_provider: string | null;
          ocr_model: string | null;
          ocr_error: string | null;
          ocr_processed_at: string | null;
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
          ocr_text?: string | null;
          ocr_status?: ReferenceOcrStatus | null;
          ocr_provider?: string | null;
          ocr_model?: string | null;
          ocr_error?: string | null;
          ocr_processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["homework_unit_files"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "homework_unit_files_homework_unit_id_fkey";
            columns: ["homework_unit_id"];
            isOneToOne: false;
            referencedRelation: "homework_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "homework_unit_files_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "submissions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_homework_unit_id_fkey";
            columns: ["homework_unit_id"];
            isOneToOne: false;
            referencedRelation: "homework_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          }
        ];
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
          ocr_text: string | null;
          ocr_status: ReferenceOcrStatus | null;
          ocr_provider: string | null;
          ocr_model: string | null;
          ocr_error: string | null;
          ocr_processed_at: string | null;
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
          ocr_text?: string | null;
          ocr_status?: ReferenceOcrStatus | null;
          ocr_provider?: string | null;
          ocr_model?: string | null;
          ocr_error?: string | null;
          ocr_processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "exercises_homework_unit_id_fkey";
            columns: ["homework_unit_id"];
            isOneToOne: false;
            referencedRelation: "homework_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
          ocr_text: string | null;
          ocr_status: ReferenceOcrStatus | null;
          ocr_provider: string | null;
          ocr_model: string | null;
          ocr_error: string | null;
          ocr_processed_at: string | null;
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
          ocr_text?: string | null;
          ocr_status?: ReferenceOcrStatus | null;
          ocr_provider?: string | null;
          ocr_model?: string | null;
          ocr_error?: string | null;
          ocr_processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["answer_keys"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "answer_keys_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: true;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answer_keys_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      questions: {
        Row: {
          id: string;
          submission_id: string;
          question_number: number | null;
          question_text: string;
          student_answer: string;
          expected_answer: string;
          keywords: Json; // string[]
          extraction_confidence: number;
          ocr_uncertain: boolean;
          ocr_alternatives: Json; // string[]
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_number?: number | null;
          question_text: string;
          student_answer?: string;
          expected_answer?: string;
          keywords?: Json;
          extraction_confidence?: number;
          ocr_uncertain?: boolean;
          ocr_alternatives?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "questions_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          }
        ];
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
          needs_review: boolean;
          review_reason: string;
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
          needs_review?: boolean;
          review_reason?: string;
        };
        Update: Partial<Database["public"]["Tables"]["evaluations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "evaluations_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: true;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
      ocr_results: {
        Row: {
          id: string;
          submission_id: string;
          owner_id: string;
          provider: string;
          model: string;
          raw_response: Json;
          normalized_result: Json; // { pages: { page_number: number; content: string; confidence?: number | null }[] }
          teacher_corrected_text: string | null;
          status: "completed" | "failed";
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          owner_id: string;
          provider: string;
          model: string;
          raw_response: Json;
          normalized_result: Json;
          teacher_corrected_text?: string | null;
          status: "completed" | "failed";
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ocr_results"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ocr_results_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ocr_results_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "teacher_corrections_evaluation_id_fkey";
            columns: ["evaluation_id"];
            isOneToOne: true;
            referencedRelation: "evaluations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_corrections_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      final_results: {
        Row: {
          question_id: string;
          submission_id: string;
          question_number: number | null;
          question_text: string;
          student_answer: string;
          expected_answer: string;
          keywords: Json;
          extraction_confidence: number;
          ocr_uncertain: boolean;
          ocr_alternatives: Json;
          evaluation_id: string;
          evaluation_confidence: number;
          is_correct: boolean;
          score: number;
          error_type: string;
          concept_issue: string;
          reasoning: string;
          areas_to_improve: Json;
          is_teacher_corrected: boolean;
          needs_review: boolean;
          review_reason: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      submission_status: SubmissionStatus;
      homework_file_group: HomeworkFileGroup;
      file_kind: FileKindEnum;
      reference_ocr_status: ReferenceOcrStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
