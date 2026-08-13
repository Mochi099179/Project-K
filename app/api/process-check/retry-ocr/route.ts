import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runOcrStage } from "@/lib/pipeline/check-pipeline";

/**
 * Re-runs ONLY the Handwriting recognition stage — does not re-download
 * anything the teacher hasn't already uploaded, and does not auto-chain into
 * Answer analysis. That's deliberate: a teacher retrying OCR usually wants to
 * see (and possibly correct) the new reading before it's graded.
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { submissionId } = (await req.json()) as { submissionId?: string };
  if (!submissionId) {
    return NextResponse.json({ error: "missing submissionId" }, { status: 400 });
  }

  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "ไม่พบคำขอตรวจนี้" }, { status: 404 });
  }

  const outcome = await runOcrStage(supabase, user.id, submission);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submissionId });
}
