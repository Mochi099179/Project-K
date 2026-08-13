-- ============================================================================
-- Optional demo data.
--
-- 1. Sign up your first teacher account at /login.
-- 2. Replace 'teacher@example.com' below with that account's email.
-- 3. Run this file in the Supabase SQL editor (or `supabase db execute`).
--
-- This seeds one classroom with two students, one Homework Unit, and one
-- fully-worked example submission (two questions, one correct one not) so
-- the Student Learning Profile / Class Analysis views have something to show
-- on first login instead of looking empty.
-- ============================================================================

do $$
declare
  v_owner_id uuid;
  v_classroom_id uuid;
  v_student_id uuid;
  v_submission_id uuid := gen_random_uuid();
  v_q1_id uuid;
  v_q2_id uuid;
  v_e1_id uuid;
begin
  select id into v_owner_id from auth.users where email = 'techjournal.team@gmail.com';
  if v_owner_id is null then
    raise exception 'No auth.users row for that email — sign up at /login first, then edit the email at the top of this file.';
  end if;

  insert into public.classrooms (owner_id, name, subject, grade, term, learning_problems)
  values (v_owner_id, 'ม.2/1', 'คณิตศาสตร์', 'มัธยมศึกษาปีที่ 2', 'ภาคเรียนที่ 1/2567', '["เรียนไม่ทันเพื่อน"]'::jsonb)
  returning id into v_classroom_id;

  insert into public.students (classroom_id, student_code, display_name, seat_no, gender)
  values (v_classroom_id, '44821', null, 1, 'M')
  returning id into v_student_id;

  insert into public.students (classroom_id, student_code, display_name, seat_no, gender)
  values (v_classroom_id, '44826', null, 2, 'F');

  insert into public.homework_units (owner_id, name, subject, grade)
  values (v_owner_id, 'พหุนามและการดำเนินการ', 'คณิตศาสตร์', 'ม.2');

  -- One worked example submission, already reviewed, tied to the first student.
  insert into public.submissions (
    id, owner_id, student_code, student_id, classroom_id, topic, status,
    answer_key_text, overall_score, saved_to_profile_at
  ) values (
    v_submission_id, v_owner_id, '44821', v_student_id, v_classroom_id, 'พหุนาม', 'completed',
    'ข้อ 1: 4x^2 - 2x + 4, ข้อ 2: x = 6', 50, now()
  );

  insert into public.questions (submission_id, question_number, question_text, student_answer, expected_answer, keywords, extraction_confidence)
  values (v_submission_id, 1, 'จงหาผลบวกของพหุนาม (3x^2 + 2x - 1) และ (x^2 - 4x + 5)', '4x^2 - 2x + 4', '4x^2 - 2x + 4', '["พหุนาม","การบวกพหุนาม"]'::jsonb, 0.97)
  returning id into v_q1_id;

  insert into public.questions (submission_id, question_number, question_text, student_answer, expected_answer, keywords, extraction_confidence)
  values (v_submission_id, 2, 'จงแก้สมการ 2x + 5 = 3x - 1', 'x = 4', 'x = 6', '["สมการเชิงเส้น","การย้ายข้าง"]'::jsonb, 0.93)
  returning id into v_q2_id;

  insert into public.evaluations (question_id, is_correct, score, reasoning, evaluation_confidence)
  values (v_q1_id, true, 1, 'กระจายและรวมพจน์ที่คล้ายกันได้ถูกต้อง', 0.95);

  insert into public.evaluations (
    question_id, is_correct, score, error_type, concept_issue, reasoning, areas_to_improve, evaluation_confidence
  ) values (
    v_q2_id, false, 0, 'คำนวณย้ายข้างผิดเครื่องหมาย', 'สับสนเรื่องการเปลี่ยนเครื่องหมายเมื่อย้ายพจน์ข้ามสมการ',
    'นักเรียนย้าย 5 ไปฝั่งขวาโดยไม่เปลี่ยนเครื่องหมาย ทำให้ได้คำตอบผิดจากเฉลย',
    '["ทบทวนกฎการย้ายข้างสมการ","ฝึกตรวจคำตอบด้วยการแทนค่ากลับ"]'::jsonb, 0.88
  )
  returning id into v_e1_id;

  raise notice 'Seeded classroom % for owner %', v_classroom_id, v_owner_id;
end $$;

-- ============================================================================
-- Demo data for the reusable Check workflow (migration 0006): a Homework
-- Unit whose Exercises each carry their own answer key and scoring criteria,
-- so "Check Student Exercise → Use Homework Unit" has something to select
-- immediately. Teaching Materials are seeded as catalog rows with no
-- uploaded file (storage_path null) — enough to show file counts in the UI
-- without needing real files pushed into Storage by this script.
-- ============================================================================

do $$
declare
  v_owner_id uuid;
  v_unit_id uuid;
  v_ex1_id uuid;
  v_ex2_id uuid;
begin
  select id into v_owner_id from auth.users where email = 'techjournal.team@gmail.com';
  if v_owner_id is null then
    raise exception 'No auth.users row for that email — sign up at /login first, then edit the email at the top of this file.';
  end if;

  insert into public.homework_units (owner_id, name, subject, grade)
  values (v_owner_id, 'เศษส่วน', 'คณิตศาสตร์', 'ม.2')
  returning id into v_unit_id;

  insert into public.homework_unit_files (homework_unit_id, owner_id, group_type, file_name, storage_path, file_kind)
  values
    (v_unit_id, v_owner_id, 'material', 'เศษส่วน บทที่ 1.pdf', null, 'pdf'),
    (v_unit_id, v_owner_id, 'material', 'ตัวอย่างโจทย์เศษส่วน.pdf', null, 'pdf');

  insert into public.exercises (homework_unit_id, owner_id, title, description, scoring_criteria)
  values (
    v_unit_id, v_owner_id, 'การบวกเศษส่วน', 'โจทย์บวกเศษส่วนที่มีตัวส่วนต่างกัน 5 ข้อ',
    '2 คะแนน ถ้าตอบถูกและแสดงวิธีทำครบ
1 คะแนน ถ้าวิธีทำถูกแต่คำนวณผิด
0 คะแนน ถ้าวิธีทำผิด'
  )
  returning id into v_ex1_id;

  insert into public.answer_keys (exercise_id, owner_id, answer_text)
  values (
    v_ex1_id, v_owner_id,
    'ข้อ 1: 5/6
ข้อ 2: 1 1/4
ข้อ 3: 7/10
ข้อ 4: 2/3
ข้อ 5: 11/12'
  );

  insert into public.exercises (homework_unit_id, owner_id, title, description, scoring_criteria)
  values (
    v_unit_id, v_owner_id, 'การลบเศษส่วน', 'โจทย์ลบเศษส่วนที่มีตัวส่วนต่างกัน 5 ข้อ',
    '2 คะแนน ถ้าตอบถูกและแสดงวิธีทำครบ
1 คะแนน ถ้าวิธีทำถูกแต่คำนวณผิด
0 คะแนน ถ้าวิธีทำผิด'
  )
  returning id into v_ex2_id;

  insert into public.answer_keys (exercise_id, owner_id, answer_text)
  values (
    v_ex2_id, v_owner_id,
    'ข้อ 1: 1/6
ข้อ 2: 3/8
ข้อ 3: 5/12
ข้อ 4: 1/4
ข้อ 5: 2/9'
  );

  raise notice 'Seeded Homework Unit % (เศษส่วน) with 2 exercises for owner %', v_unit_id, v_owner_id;
end $$;
