import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runMaterialOcr } from "@/lib/pipeline/reference-ocr";

/**
 * OCRs one Teaching Material file, caching the result on its
 * homework_unit_files row so grading can fold real material content into
 * the Answer Analysis context instead of just a filename note. Triggered
 * fire-and-forget right after addFileToHomeworkUnit() uploads it, and again
 * by the UI's retry action.
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { materialId } = (await req.json()) as { materialId?: string };
  if (!materialId) {
    return NextResponse.json({ error: "missing materialId" }, { status: 400 });
  }

  // RLS already scopes this to the caller's own rows; the owner_id check is defense in depth.
  const { data: material, error: fetchError } = await supabase
    .from("homework_unit_files")
    .select("id")
    .eq("id", materialId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (fetchError || !material) {
    return NextResponse.json({ error: "ไม่พบไฟล์สื่อการสอนนี้" }, { status: 404 });
  }

  try {
    await runMaterialOcr(supabase, user.id, materialId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ถอดข้อความจากไฟล์สื่อการสอนไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, materialId });
}
