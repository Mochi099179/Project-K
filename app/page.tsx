import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen justify-center bg-cream p-5">
      <div className="relative w-full max-w-[1600px] overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-[0_25px_80px_rgba(55,65,81,0.15)]">
        {/* ambient glows */}
        <div
          className="pointer-events-none absolute -top-32 left-[8%] h-[480px] w-[480px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(109,151,115,0.35), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute top-[200px] right-[5%] h-[420px] w-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%)" }}
        />

        {/* Nav */}
        <nav className="sticky top-5 z-20 mx-8 mt-5 flex items-center justify-between rounded-full border border-border bg-card/90 p-2.5 pl-4.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base font-bold text-card">
              T
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-ink">TeachAI</span>
          </div>
          <div className="hidden items-center gap-7 rounded-full bg-card px-6.5 py-2.5 backdrop-blur-md md:flex">
            <a href="#features" className="text-[13px] font-medium text-ink/70 hover:text-ink">
              Features
            </a>
            <a href="#how" className="text-[13px] font-medium text-ink/70 hover:text-ink">
              How it works
            </a>
            <a href="#footer" className="text-[13px] font-medium text-ink/70 hover:text-ink">
              Contact
            </a>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50 sm:flex">
              <span className="h-1.5 w-1.5 animate-[pulse-dot_2s_infinite] rounded-full bg-primary" />
              System Online
            </div>
            <Link
              href="/dashboard"
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-primary"
            >
              Open App
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative z-10 grid grid-cols-1 gap-10 px-6 py-20 sm:px-10 md:px-16 lg:grid-cols-[7fr_5fr] lg:py-28">
          <div>
            <div className="mb-7 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary/90">
              <span className="h-1.5 w-1.5 animate-[pulse-dot_2s_infinite] rounded-full bg-primary" />
              AI Teaching Assistant
            </div>
            <h1 className="text-[3rem] font-bold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[4.5rem] lg:text-[6rem] lg:leading-[0.88]">
              Every classroom,
              <br />
              <span className="bg-gradient-to-r from-primary to-gold bg-clip-text italic text-transparent">
                understood.
              </span>
            </h1>
            <p className="mt-8 max-w-[520px] text-lg leading-[1.7] text-ink/65">
              TeachAI ช่วยครูสร้างห้องเรียน บันทึกปัญหาการเรียนของนักเรียนแต่ละคน
              ให้ AI ตรวจการบ้านและวิเคราะห์ผล พร้อมสร้างสื่อการสอน แบบฝึกหัด
              และแผนการสอนที่ปรับให้เหมาะกับศักยภาพของผู้เรียนในแต่ละห้อง
            </p>
            <div className="mt-11 flex flex-wrap gap-3.5">
              <Link
                href="/dashboard"
                className="rounded-full bg-primary px-8 py-4 text-[15px] font-bold text-card shadow-[0_0_30px_rgba(109,151,115,0.3)] transition-transform hover:scale-105"
              >
                Open TeachAI →
              </Link>
              <a
                href="#features"
                className="rounded-full border border-border bg-card px-8 py-4 text-[15px] font-semibold text-ink backdrop-blur-md transition-colors hover:border-primary/40"
              >
                See features ↓
              </a>
            </div>
          </div>

          <div className="relative h-[460px]">
            <div className="absolute inset-0 animate-[float-slow_7s_infinite_ease-in-out] rounded-[1.75rem] border border-border bg-card p-5.5 backdrop-blur-md">
              <div className="mb-4.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">TeachAI · ม.2/1</span>
                <span className="font-mono text-[10px] tracking-[0.1em] text-ink/40">30 STUDENTS</span>
              </div>
              <div className="mb-4.5 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-cream p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink/40">Graded</div>
                  <div className="mt-1 text-xl font-bold text-primary">24/30</div>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink/40">Flagged</div>
                  <div className="mt-1 text-xl font-bold text-ink">5</div>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink/40">Insight</div>
                  <div className="mt-1 text-xl font-bold text-emerald-500">Ready</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { name: "ณัฐวุฒิ ส.", tag: "เรียนไม่ทันเพื่อน", color: "text-primary bg-primary/10" },
                  { name: "พิมพ์ชนก อ.", tag: "เข้าสังคมไม่ได้", color: "text-emerald-600 bg-emerald-500/10" },
                  { name: "ธีรภัทร ก.", tag: "ขาดสมาธิ", color: "text-ink/50 bg-cream" },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-xl bg-cream px-3.5 py-2.5"
                  >
                    <span className="text-xs text-ink">{row.name}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${row.color}`}>
                      {row.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-4 -right-2.5 animate-[float_6s_infinite_ease-in-out] rounded-full bg-primary px-3.5 py-2 font-mono text-[11px] font-bold text-card shadow-[0_0_24px_rgba(109,151,115,0.4)]">
              ✓ AI Insight ready
            </div>
            <div className="absolute -bottom-3.5 -left-3.5 animate-[float_6s_infinite_ease-in-out_1.5s] rounded-full border border-border bg-card px-4 py-2.5 font-mono text-[10px] text-ink backdrop-blur-md">
              ⚙ Analyzing homework...
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative z-10 px-6 pb-24 sm:px-10 md:px-16">
          <div className="mb-12 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                Features
              </div>
              <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.75rem]">
                One system, every teaching task.
              </h2>
            </div>
            <p className="max-w-[360px] text-[15px] leading-[1.6] text-ink/55">
              ตั้งแต่สร้างห้องเรียน วิเคราะห์นักเรียนรายคน
              ไปจนถึงสร้างสื่อการสอนที่ปรับให้เหมาะกับผู้เรียนแต่ละห้อง
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-fr">
            <div className="flex flex-col justify-between rounded-[2rem] border border-border bg-card p-8 transition-colors hover:border-primary/40 sm:col-span-2 lg:row-span-2">
              <div>
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                  Classroom Overview
                </div>
                <h3 className="mb-2.5 text-[1.6rem] font-semibold tracking-[-0.02em] text-ink">
                  AI room-level analysis
                </h3>
                <p className="max-w-[360px] text-sm leading-[1.6] text-ink/55">
                  AI สรุปปัญหาโดยรวมของห้อง พร้อมแนะนำจุดที่ควรเน้นและเทคนิคการสอนที่เหมาะกับห้องนี้
                  โดยอิงจากปัญหานักเรียนรายคนและผลตรวจการบ้าน
                </p>
              </div>
              <div className="mt-6 flex h-[110px] items-end gap-2.5">
                {[
                  { h: "70%", label: "เรียนไม่ทัน", bg: "bg-primary" },
                  { h: "45%", label: "เข้าสังคม", bg: "bg-emerald-500" },
                  { h: "85%", label: "LD", bg: "bg-gold/50" },
                  { h: "30%", label: "ขาดสมาธิ", bg: "bg-sage/40" },
                ].map((bar) => (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className={`w-full rounded-t-md ${bar.bg}`} style={{ height: bar.h }} />
                    <span className="text-center font-mono text-[8px] text-ink/40">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[2rem] border border-border bg-card p-7 transition-colors hover:border-primary/40 lg:row-span-2">
              <div>
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                  Student Profiles
                </div>
                <h3 className="mb-2 text-xl font-semibold text-ink">Per-student tracking</h3>
                <p className="text-[13px] leading-[1.6] text-ink/55">
                  เลขประจำตัว เลขที่ ปัญหาการเรียน และข้อมูลจะอัปเดตทุกครั้งที่ตรวจการบ้าน
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="h-5.5 rounded-lg bg-primary" />
                <div className="h-5.5 rounded-lg bg-emerald-500" />
                <div className="h-5.5 rounded-lg bg-white/30" />
                <div className="h-5.5 rounded-lg bg-border" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-primary p-6.5 transition-[filter] hover:brightness-105">
              <div className="relative">
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-cream/70">
                  AI Grading
                </div>
                <h3 className="text-[1.15rem] font-bold leading-tight text-cream">
                  อัปโหลดการบ้าน + เฉลย ให้ AI ตรวจและวิเคราะห์ทันที
                </h3>
              </div>
            </div>

            {[
              { label: "Materials", title: "Generate teaching decks (.pptx) tailored to the room" },
              { label: "Exercises", title: "Auto-generate practice sets matched to student level" },
              { label: "Lesson Plans", title: "Build a period-by-period plan from your syllabus" },
              { label: "Techniques", title: "AI-recommended teaching techniques & activities" },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-[2rem] border border-border bg-card p-6.5 transition-colors hover:border-primary/40"
              >
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                  {f.label}
                </div>
                <h3 className="text-[1.05rem] font-semibold text-ink">{f.title}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="relative z-10 rounded-t-[4rem] bg-sage px-6 py-20 sm:px-10 md:px-16 md:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-primary-dark">
                How it works
              </div>
              <h2 className="mb-10 text-[2rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
                Three steps to a room AI understands.
              </h2>

              {[
                {
                  no: "01",
                  title: "Create your classroom",
                  body: "สร้างห้องเรียน ใส่โปรไฟล์นักเรียนแต่ละคน พร้อมติ๊กเลือกปัญหาการเรียนที่มี เช่น เรียนไม่ทันเพื่อน หรือเข้าสังคมไม่ได้",
                },
                {
                  no: "02",
                  title: "AI grades & analyzes",
                  body: "อัปโหลดการบ้านคู่กับเฉลย ให้ AI ตรวจและวิเคราะห์คำตอบของนักเรียนแต่ละคน ครูตรวจสอบและยืนยันความถูกต้องได้ทุกครั้ง",
                },
                {
                  no: "03",
                  title: "Get tailored materials",
                  body: "รับสื่อการสอน แบบฝึกหัด และแผนการสอนที่ปรับให้เหมาะกับศักยภาพของผู้เรียนในห้องนั้นๆ โดยอิงจากผลวิเคราะห์ของ AI",
                },
              ].map((step, i, arr) => (
                <div key={step.no} className={`flex gap-4.5 ${i < arr.length - 1 ? "mb-8" : ""}`}>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-ink/25 font-mono text-[13px] text-ink">
                    {step.no}
                  </div>
                  <div>
                    <h4 className="mb-1.5 text-[1.1rem] font-semibold text-ink">{step.title}</h4>
                    <p className="max-w-[420px] text-sm leading-[1.6] text-ink/75">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <div
                className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-ink/15"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, #d4d4d4 0 2px, #dedede 2px 14px)",
                }}
              >
                <span className="font-mono text-xs tracking-wide text-ink/55">
                  APP SCREENSHOT — CLASSROOM OVERVIEW
                </span>
              </div>
              <div className="absolute -bottom-7 -left-6 max-w-[280px] rounded-2xl border border-border bg-card px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
                <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-ink/50">
                  Example · ม.2/1
                </div>
                <p className="text-[13px] leading-[1.6] text-ink">
                  &ldquo;AI แนะนำให้เน้นกิจกรรมกลุ่มเล็ก เพราะ 40% ของห้องมีปัญหาเข้าสังคมไม่ได้&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="footer" className="relative z-10 overflow-hidden bg-cream px-6 pt-28 pb-12 sm:px-10 md:px-16">
          <div className="pointer-events-none absolute top-5 left-0 right-0 hidden select-none whitespace-nowrap text-center text-[9rem] font-bold tracking-[-0.04em] text-card md:block lg:text-[11rem]">
            TEACHAI
          </div>
          <div className="relative mb-24 text-center">
            <h2 className="mb-8 text-[2.2rem] font-semibold tracking-[-0.03em] text-ink sm:text-[3rem]">
              Start understanding
              <br />
              your classroom today.
            </h2>
            <Link
              href="/dashboard"
              className="inline-block rounded-full bg-primary px-12 py-5 text-[17px] font-bold text-card shadow-[0_0_40px_rgba(109,151,115,0.35)] transition-transform hover:scale-105"
            >
              Open TeachAI →
            </Link>
          </div>
          <div className="relative grid grid-cols-2 gap-8 border-t border-border pt-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-card">
                  T
                </div>
                <span className="text-sm font-semibold text-ink">TeachAI</span>
              </div>
              <p className="max-w-[260px] text-[13px] leading-[1.6] text-ink/40">
                ผู้ช่วย AI สำหรับครู ตั้งแต่สร้างห้องเรียนไปจนถึงสื่อการสอนที่ปรับให้เหมาะกับผู้เรียนแต่ละคน
              </p>
            </div>
            <div>
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                Product
              </div>
              <div className="flex flex-col gap-2.5">
                <a href="#features" className="text-[13px] text-ink/60 hover:text-primary">
                  Features
                </a>
                <Link href="/dashboard" className="text-[13px] text-ink/60 hover:text-primary">
                  Classrooms
                </Link>
                <Link href="/dashboard" className="text-[13px] text-ink/60 hover:text-primary">
                  AI Tools
                </Link>
              </div>
            </div>
            <div>
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                Company
              </div>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-[13px] text-ink/60 hover:text-primary">
                  About
                </a>
                <a href="#" className="text-[13px] text-ink/60 hover:text-primary">
                  Contact
                </a>
              </div>
            </div>
            <div>
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                Legal
              </div>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-[13px] text-ink/60 hover:text-primary">
                  Privacy
                </a>
                <a href="#" className="text-[13px] text-ink/60 hover:text-primary">
                  Terms
                </a>
              </div>
            </div>
          </div>
          <div className="relative mt-10 flex items-center justify-between border-t border-card pt-6 font-mono text-[11px] text-ink/35">
            <span>© 2026 TEACHAI</span>
            <div className="flex gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border">
                in
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border">
                x
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
