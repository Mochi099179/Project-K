# Test Case: Quick Check — เลขคณิตพื้นฐาน (1 ข้อถูก, 1 ข้อผิด)

ทดสอบ pipeline ปัจจุบัน (`app/api/process-check/route.ts`, โมเดล `claude-sonnet-5`)
แบบ end-to-end ผ่านหน้า Quick Check จริง (ไม่ใช้ Homework Unit) — ล็อกอินด้วยบัญชีจริง
อัปโหลดภาพจริงไปที่ Supabase Storage bucket `submissions`, สร้างแถวใน `submissions` จริง,
เรียก AI จริง, และตรวจผลลัพธ์ที่เขียนกลับเข้า `questions` + `evaluations` จริง

> หมายเหตุ: ไฟล์นี้แทนที่แนวทางของ `sample-homework-1.md` ซึ่งอ้างอิง
> `app/api/analyze-homework/route.ts` และ schema แบบเก่า (`score`/`strengths`/`weaknesses`/
> `suggestions` ระดับเดียว) — ทั้งคู่ถูกลบไปแล้วในการปรับสถาปัตยกรรมมาใช้ Supabase
> pipeline ปัจจุบันตรวจทีละข้อ (`questions[]`) ด้วย `is_correct`/`error_type`/
> `concept_issue`/`reasoning`/`areas_to_improve` ต่อข้อ ไม่ใช่คะแนนรวมเดียว

---

## 1. Setup

| Field | Value |
|---|---|
| โหมด | Quick Check (อัปโหลดเอง) — ไม่ผูก Classroom/Homework Unit |
| Student ID | `TEST-001` |
| สื่อการสอน | ไม่ได้แนบ |
| เฉลย (`answerKeyText`) | `ข้อ 1: 12 + 15 = ? เฉลย 27`<br>`ข้อ 2: 8 x 7 = ? เฉลย 56` |
| แบบฝึกหัดของนักเรียน | รูป PNG 1 หน้า (สร้างด้วย canvas จำลองลายมือ) ข้อความ:<br>`ชื่อ: เด็กชายทดสอบ ระบบ`<br>`ข้อ 1: 12 + 15 = 27`<br>`ข้อ 2: 8 x 7 = 54` ← ตอบผิดโดยตั้งใจ (คำตอบจริงคือ 56) |

---

## 2. ผลลัพธ์ที่คาดหวัง

| ข้อ | คำตอบนักเรียน | เฉลย | คาดว่า AI ควรตรวจว่า |
|---|---|---|---|
| 1 | 27 | 27 | ถูกต้อง |
| 2 | 54 | 56 | ไม่ถูกต้อง — คำนวณผิด (8×7=56 ไม่ใช่ 54) |

**คะแนนรวมที่คาดหวัง:** 1/2 = 50%

---

## 3. ผลลัพธ์จริงที่ได้ (บันทึกจากการรันจริง — 2026-08-13)

✅ **ผ่าน** — ตรงกับผลที่คาดหวังทุกจุด

| ข้อ | ผลตรวจของ AI | ตรงกับที่คาดหวัง? |
|---|---|---|
| 1 | ✓ ถูกต้อง | ✅ |
| 2 | ✗ ไม่ถูกต้อง | ✅ |

- **คะแนนรวม:** `1 / 2` (50%) — ตรงกับที่คาดหวังเป๊ะ
- **จุดที่ผิดบ่อย (AI ANALYSIS):** "คำนวณผิดพลาด" — ตรงประเด็น
- **ควรเสริม:** "ฝึกทบทวนสูตรคูณแม่ 7 และแม่ 8 ให้แม่นยำ", "ฝึกตรวจทานคำตอบหลังคำนวณเสร็จ" — เกี่ยวข้องและนำไปใช้ได้จริง
- **สถานะหลังตรวจ:** `รอครูตรวจสอบ` (`review_required`) — ถูกต้องตาม human-in-the-loop workflow

### สิ่งที่ยืนยันได้จากการรันนี้

- อัปโหลดไฟล์ไปยัง Supabase Storage สำเร็จ (`POST /storage/v1/object/submissions/... → 200`)
- สร้างแถว `submissions` จริงสำเร็จ (`POST /rest/v1/submissions → 201`)
- เรียก `claude-sonnet-5` ผ่าน `/api/process-check` สำเร็จ, ผลลัพธ์ผ่าน Zod validation (`aiCheckResultSchema`)
- แยกคำถามเป็นรายข้อถูกต้อง (ไม่ปนกันเป็น entity เดียว)
- แยกแยะคำตอบถูก/ผิดได้แม่นยำ ไม่ใช่แค่เทียบ string แต่เข้าใจว่า 8×7 คำนวณผิด
- คำนวณ `overall_score` รวมถูกต้อง (1/2 ข้อถูก = 50%)
- Document viewer แสดงภาพที่อัปโหลดถูกต้อง

---

## วิธีรันซ้ำ

1. ล็อกอินที่ `/login` ด้วยบัญชีจริง (ต้องยืนยันอีเมลก่อน — ดู Known Issues ด้านล่าง)
2. ไปที่ `/quick-check` → เลือกแท็บ "Quick Check (อัปโหลดเอง)"
3. ขั้นตอนที่ 1 (นักเรียน): กรอก Student ID ใดก็ได้ เช่น `TEST-001`
4. ขั้นตอนที่ 2 (สื่อการสอน): ข้ามได้ ไม่บังคับ
5. ขั้นตอนที่ 3 (เฉลย): วางข้อความจากส่วนที่ 1 ของไฟล์นี้ในช่อง "เฉลย (Answer Key)"
6. ขั้นตอนที่ 4 (แบบฝึกหัด): แนบภาพที่มีข้อความเดียวกับ "แบบฝึกหัดของนักเรียน" ด้านบน (ถ่ายจริง/พิมพ์ลงกระดาษ/วาดในโปรแกรมวาดภาพก็ได้)
7. ขั้นตอนที่ 5 (ตรวจ): กด "เริ่มตรวจ →" แล้วเทียบผลกับตารางในส่วนที่ 2

---

## Known Issues ที่พบระหว่างทดสอบ (แก้ไขแล้ว)

ระหว่างการทดสอบรอบนี้พบและแก้ไขบั๊กจริง 3 จุดในโค้ดที่ยังไม่เคยรันกับ Supabase จริงมาก่อน:

1. `lib/supabase/database.types.ts` ขาด `Relationships` ต่อตาราง (required โดย `@supabase/postgrest-js`) —
   ทำให้ทุก query resolve เป็น `never` และ `next build` จะ fail ทันที
2. `lib/data/homework-units.ts` สมมติว่า `answer_keys` embed เป็น array แต่จริง ๆ
   เป็น one-to-one object (unique FK) — ถ้าไม่แก้ `getExerciseWithAnswerKey` (ที่
   `/api/process-check` เรียกใช้หาเฉลยของ Homework Unit) จะหาเฉลยไม่เจอเงียบ ๆ
3. `components/quickcheck/HomeworkUnitCheckFlow.tsx` มี `setState` ใน `useEffect`
   โดยตรง (react-hooks/set-state-in-effect) — ย้ายไปทำใน `onChange` แทน

การสมัครบัญชีใหม่ต้องยืนยันอีเมลก่อนถึงจะล็อกอินได้ (Supabase Auth default) — ถ้าต้องการ
ทดสอบอัตโนมัติแบบไม่ต้องรอยืนยันอีเมล ให้ปิด "Confirm email" ชั่วคราวที่ Supabase Dashboard
→ Authentication → Sign In / Providers → Email
