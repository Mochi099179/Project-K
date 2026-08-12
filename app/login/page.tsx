"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(next);
        router.refresh();
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() || undefined } },
        });
        if (signUpError) throw signUpError;
        setCheckEmail(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-2xl text-primary">
          ✉️
        </div>
        <h1 className="mb-2 text-xl font-bold text-ink">ตรวจสอบอีเมลของคุณ</h1>
        <p className="text-[13px] leading-[1.6] text-ink/55">
          เราส่งลิงก์ยืนยันไปที่ {email} แล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-card">
            <path d="M12 3c-4 0-7 3-7 7 0 5 4 9 7 11 3-2 7-6 7-11 0-4-3-7-7-7z" />
            <path d="M12 8v6M9 11h6" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-ink">{mode === "sign-in" ? "เข้าสู่ระบบ" : "สร้างบัญชีครู"}</h1>
        <p className="mt-1 text-[13px] text-ink/55">TeachAI — Smart Teaching Assistant</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === "sign-up" && (
          <div>
            <label className="mb-1.5 block text-xs text-ink/55">ชื่อที่แสดง (ไม่บังคับ)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="เช่น ครูจิราภรณ์"
              className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs text-ink/55">อีเมล</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.ac.th"
            className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-ink/55">รหัสผ่าน</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-[#BB6B53]/30 bg-[#BB6B53]/10 px-4 py-3 text-[12.5px] text-[#BB6B53]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-6 py-3 text-[13.5px] font-bold text-card transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          {loading ? "กำลังดำเนินการ..." : mode === "sign-in" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
        }}
        className="mt-5 w-full text-center text-[12.5px] font-semibold text-primary"
      >
        {mode === "sign-in" ? "ยังไม่มีบัญชี? สร้างบัญชีใหม่" : "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"}
      </button>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-[420px] max-w-full rounded-[1.75rem] border border-border bg-card p-9">
        <Suspense fallback={null}>
          <LoginInner />
        </Suspense>
      </div>
    </div>
  );
}
