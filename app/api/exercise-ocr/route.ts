import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runExerciseReferenceOcr } from "@/lib/pipeline/reference-ocr";

/**
 * OCRs an Exercise's reference file and its paired answer-key file, caching
 * the result on the exercises/answer_keys rows so grading reads it instead
 * of re-downloading the raw file every submission. Triggered fire-and-forget
 * right after createExercise() uploads either file, and again by the UI's
 * retry action — a single idempotent operation, so unlike process-check
 * there's no separate retry route.
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { exerciseId } = (await req.json()) as { exerciseId?: string };
  if (!exerciseId) {
    return NextResponse.json({ error: "missing exerciseId" }, { status: 400 });
  }

  // RLS already scopes this to the caller's own rows; the owner_id check is defense in depth.
  const { data: exercise, error: fetchError } = await supabase
    .from("exercises")
    .select("id")
    .eq("id", exerciseId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (fetchError || !exercise) {
    return NextResponse.json({ error: "ไม่พบแบบฝึกหัดนี้" }, { status: 404 });
  }

  try {
    await runExerciseReferenceOcr(supabase, user.id, exerciseId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ถอดข้อความจากไฟล์อ้างอิงไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exerciseId });
}
