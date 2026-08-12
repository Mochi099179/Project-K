import type { Check, CheckQuestion, QuestionResult } from "./types";

let seq = 0;
function qid(checkId: string) {
  seq += 1;
  return `${checkId}-q${seq}`;
}

function ok(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    isCorrect: true,
    score: 1,
    errorType: "",
    conceptIssue: "",
    reasoning: "นักเรียนแสดงวิธีทำถูกต้องครบทุกขั้นตอนและตอบตรงกับเฉลย",
    areasToImprove: [],
    evaluationConfidence: 0.95,
    ...overrides,
  };
}

function bad(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    isCorrect: false,
    score: 0,
    errorType: "แนวคิดคลาดเคลื่อน",
    conceptIssue: "",
    reasoning: "คำตอบไม่ตรงกับเฉลย และวิธีทำแสดงความเข้าใจที่คลาดเคลื่อนในบางขั้นตอน",
    areasToImprove: [],
    evaluationConfidence: 0.88,
    ...overrides,
  };
}

function q(checkId: string, input: Omit<CheckQuestion, "id" | "teacherCorrected"> & { teacherCorrected?: QuestionResult | null }): CheckQuestion {
  return { id: qid(checkId), teacherCorrected: null, ...input };
}

function makeCheck(input: {
  id: string;
  createdAt: string;
  topic: string;
  classroomId: string;
  studentId: string;
  studentLabel: string;
  questions: CheckQuestion[];
  savedDaysAgoLabel: string;
}): Check {
  const { questions } = input;
  const correct = questions.filter((qq) => (qq.teacherCorrected ?? qq.ai).isCorrect).length;
  return {
    id: input.id,
    createdAt: input.createdAt,
    status: "reviewed",
    studentLabel: input.studentLabel,
    topic: input.topic,
    exerciseImages: [],
    questions,
    overallScore: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    homeworkUnitId: null,
    classroomId: input.classroomId,
    studentId: input.studentId,
    savedToProfile: { classroomId: input.classroomId, studentId: input.studentId, savedAt: input.createdAt },
  };
}

export function buildSeedChecks(): Check[] {
  const checks: Check[] = [];

  // --- s1 ณัฐวุฒิ (c1) — เรียนไม่ทันเพื่อน, จุดอ่อนสมการเชิงเส้น/พหุนาม ---
  {
    const id = "chk-seed-s1-1";
    checks.push(
      makeCheck({
        id,
        createdAt: "2024-04-26T09:00:00Z",
        topic: "พหุนาม",
        classroomId: "c1",
        studentId: "s1",
        studentLabel: "44821",
        savedDaysAgoLabel: "26 เม.ย.",
        questions: [
          q(id, {
            question: "จงหาผลบวกของพหุนาม (3x² + 2x − 1) และ (x² − 4x + 5)",
            studentAnswer: "4x² − 2x + 4",
            expectedAnswer: "4x² − 2x + 4",
            keywords: ["พหุนาม", "การบวกพหุนาม"],
            features: ["multi_step"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 4 พหุนาม"],
            extractionConfidence: 0.97,
            ai: ok(),
          }),
          q(id, {
            question: "จงแก้สมการ 2x + 5 = 3x − 1",
            studentAnswer: "x = 4",
            expectedAnswer: "x = 6",
            keywords: ["สมการเชิงเส้น", "การย้ายข้าง"],
            features: ["requires_isolating_variable"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 3 สมการเชิงเส้น"],
            extractionConfidence: 0.93,
            ai: bad({
              errorType: "คำนวณย้ายข้างผิดเครื่องหมาย",
              conceptIssue: "สับสนเรื่องการเปลี่ยนเครื่องหมายเมื่อย้ายพจน์ข้ามสมการ",
              reasoning: "นักเรียนย้าย 5 ไปฝั่งขวาโดยไม่เปลี่ยนเครื่องหมาย ทำให้ได้คำตอบผิดจากเฉลย",
              areasToImprove: ["ทบทวนกฎการย้ายข้างสมการ", "ฝึกตรวจคำตอบด้วยการแทนค่ากลับ"],
            }),
          }),
          q(id, {
            question: "จงหาผลคูณของ (x + 2)(x − 3)",
            studentAnswer: "x² − x − 6",
            expectedAnswer: "x² − x − 6",
            keywords: ["พหุนาม", "การกระจาย"],
            features: ["multi_step"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 4 พหุนาม"],
            extractionConfidence: 0.96,
            ai: ok({ reasoning: "กระจายและรวมพจน์ที่คล้ายกันได้ถูกต้อง" }),
          }),
        ],
      })
    );
  }
  {
    const id = "chk-seed-s1-2";
    checks.push(
      makeCheck({
        id,
        createdAt: "2024-05-03T09:00:00Z",
        topic: "การแยกตัวประกอบ",
        classroomId: "c1",
        studentId: "s1",
        studentLabel: "44821",
        savedDaysAgoLabel: "3 พ.ค.",
        questions: [
          q(id, {
            question: "จงแยกตัวประกอบ x² − 9",
            studentAnswer: "(x − 3)(x + 3)",
            expectedAnswer: "(x − 3)(x + 3)",
            keywords: ["การแยกตัวประกอบ", "ผลต่างกำลังสอง"],
            features: ["difference_of_squares"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 5 การแยกตัวประกอบ"],
            extractionConfidence: 0.95,
            ai: ok(),
          }),
          q(id, {
            question: "จงแยกตัวประกอบ x² + 5x + 6",
            studentAnswer: "(x + 2)(x + 4)",
            expectedAnswer: "(x + 2)(x + 3)",
            keywords: ["การแยกตัวประกอบ", "ตรีนาม"],
            features: ["multi_step", "requires_common_denominator"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 5 การแยกตัวประกอบ"],
            extractionConfidence: 0.9,
            ai: bad({
              errorType: "หาคู่ตัวประกอบผิด",
              conceptIssue: "ยังไม่คล่องเรื่องการหาคู่ตัวเลขที่คูณกันได้ค่าคงที่และบวกกันได้สัมประสิทธิ์ของ x",
              reasoning: "2 × 4 = 8 ไม่ใช่ 6 ตามที่โจทย์ต้องการ นักเรียนน่าจะรีบตอบโดยไม่ตรวจทาน",
              areasToImprove: ["ฝึกหาคู่ตัวประกอบของค่าคงที่อย่างเป็นระบบ", "ฝึกตรวจคำตอบด้วยการกระจายกลับ"],
            }),
          }),
        ],
      })
    );
  }

  // --- s6 ชนัญชิดา (c1) — ขาดความมั่นใจในการพูด, ผลการเรียนดี ---
  {
    const id = "chk-seed-s6-1";
    checks.push(
      makeCheck({
        id,
        createdAt: "2024-05-10T09:00:00Z",
        topic: "เรขาคณิต",
        classroomId: "c1",
        studentId: "s6",
        studentLabel: "44826",
        savedDaysAgoLabel: "10 พ.ค.",
        questions: [
          q(id, {
            question: "รูปสามเหลี่ยมมีมุมภายใน 40° และ 65° จงหามุมที่สาม",
            studentAnswer: "75°",
            expectedAnswer: "75°",
            keywords: ["เรขาคณิต", "ผลรวมมุมสามเหลี่ยม"],
            features: ["single_step"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 6 เรขาคณิต"],
            extractionConfidence: 0.98,
            ai: ok(),
          }),
          q(id, {
            question: "จงหาพื้นที่สี่เหลี่ยมผืนผ้ากว้าง 5 ซม. ยาว 12 ซม.",
            studentAnswer: "60 ตร.ซม.",
            expectedAnswer: "60 ตร.ซม.",
            keywords: ["เรขาคณิต", "พื้นที่สี่เหลี่ยมผืนผ้า"],
            features: ["single_step"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 6 เรขาคณิต"],
            extractionConfidence: 0.97,
            ai: ok(),
          }),
        ],
      })
    );
  }

  // --- s12 ณภัทร (c2) — สับสนลำดับขั้นตอนการแก้สมการ ---
  {
    const id = "chk-seed-s12-1";
    checks.push(
      makeCheck({
        id,
        createdAt: "2024-05-03T09:00:00Z",
        topic: "การแยกตัวประกอบ",
        classroomId: "c2",
        studentId: "s12",
        studentLabel: "44904",
        savedDaysAgoLabel: "3 พ.ค.",
        questions: [
          q(id, {
            question: "จงแก้สมการ 3(x − 2) = 2x + 1",
            studentAnswer: "x = 5",
            expectedAnswer: "x = 7",
            keywords: ["สมการเชิงเส้น", "การกระจาย"],
            features: ["multi_step"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 3 สมการเชิงเส้น"],
            extractionConfidence: 0.91,
            ai: bad({
              errorType: "กระจายวงเล็บไม่ครบ",
              conceptIssue: "ลืมกระจาย 3 เข้าไปคูณกับ −2 ภายในวงเล็บ",
              reasoning: "3(x−2) ควรเป็น 3x−6 แต่นักเรียนกระจายได้ 3x−2 ทำให้สมการที่ได้ผิดตั้งแต่ขั้นแรก",
              areasToImprove: ["ฝึกกระจายวงเล็บทีละพจน์อย่างละเอียด", "ตรวจคำตอบด้วยการแทนค่ากลับในสมการเดิม"],
            }),
            teacherCorrected: null,
          }),
          q(id, {
            question: "จงแยกตัวประกอบ 2x² + 6x",
            studentAnswer: "2x(x + 3)",
            expectedAnswer: "2x(x + 3)",
            keywords: ["การแยกตัวประกอบ", "ตัวประกอบร่วม"],
            features: ["common_factor"],
            context: ["คณิตศาสตร์ ม.2", "บทที่ 5 การแยกตัวประกอบ"],
            extractionConfidence: 0.96,
            ai: ok(),
          }),
        ],
      })
    );
  }

  // --- s13 อรวี (c3) ---
  {
    const id = "chk-seed-s13-1";
    checks.push(
      makeCheck({
        id,
        createdAt: "2024-05-10T09:00:00Z",
        topic: "พหุนาม",
        classroomId: "c3",
        studentId: "s13",
        studentLabel: "45001",
        savedDaysAgoLabel: "10 พ.ค.",
        questions: [
          q(id, {
            question: "9 × 7 เท่ากับเท่าไร",
            studentAnswer: "62",
            expectedAnswer: "63",
            keywords: ["เลขคณิต", "การคูณ"],
            features: ["single_step"],
            context: ["คณิตศาสตร์ ม.1", "ทบทวนพื้นฐาน"],
            extractionConfidence: 0.92,
            ai: bad({
              errorType: "คำนวณผิดพลาดเล็กน้อยจากความรีบ",
              conceptIssue: "",
              reasoning: "วิธีคิดถูกต้องแต่คำนวณผลคูณผิดพลาดเล็กน้อย (careless error)",
              areasToImprove: ["ฝึกตรวจทานคำตอบก่อนส่งทุกครั้ง"],
              evaluationConfidence: 0.8,
            }),
          }),
          q(id, {
            question: "จงหาผลบวกของพหุนาม (2x + 3) และ (x − 1)",
            studentAnswer: "3x + 2",
            expectedAnswer: "3x + 2",
            keywords: ["พหุนาม", "การบวกพหุนาม"],
            features: ["single_step"],
            context: ["คณิตศาสตร์ ม.1", "บทที่ 4 พหุนาม"],
            extractionConfidence: 0.95,
            ai: ok(),
          }),
        ],
      })
    );
  }

  return checks;
}
