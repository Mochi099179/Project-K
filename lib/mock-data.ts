import type { Classroom, TaskItem, NotificationItem, TrendPoint } from "./types";

export const dashboardTrend: TrendPoint[] = [
  { label: "เศษส่วน", date: "15 เม.ย.", value: 74 },
  { label: "ทศนิยม", date: "18 เม.ย.", value: 78 },
  { label: "สมการเชิงเส้น", date: "22 เม.ย.", value: 68 },
  { label: "พหุนาม", date: "26 เม.ย.", value: 82 },
  { label: "การแยกตัวประกอบ", date: "1 พ.ค.", value: 79 },
  { label: "เรขาคณิต", date: "8 พ.ค.", value: 84 },
];

export const initialTasks: TaskItem[] = [
  { title: "ตรวจแบบฝึกหัด", detail: "รอตรวจ", count: 0, iconBg: "rgba(216,183,95,0.18)", iconColor: "#D8B75F", kind: "review" },
  { title: "งานที่ยังไม่ได้ส่ง", detail: "นักเรียนยังไม่ส่งงาน", count: 5, iconBg: "rgba(187,107,83,0.15)", iconColor: "#BB6B53", kind: "missing" },
  { title: "กิจกรรมใกล้ถึงกำหนด", detail: "ภายใน 3 วัน", count: 2, iconBg: "rgba(168,198,134,0.25)", iconColor: "#5b8060", kind: "activity" },
];

export const initialNotifications: NotificationItem[] = [
  { title: "นักเรียนส่งงานใหม่", detail: 'ด.ช.ธนวัฒน์ ส่งแบบฝึกหัด "พหุนาม"', time: "10:23" },
  { title: "AI วิเคราะห์เสร็จแล้ว", detail: "รายงานการวิเคราะห์ห้อง ม.1/2", time: "09:15" },
  { title: "นักเรียนต้องการความช่วยเหลือ", detail: 'ด.ญ.นภสร ขอความช่วยเหลือในบท "เศษส่วน"', time: "เมื่อวาน" },
  { title: "สร้างแบบฝึกหัดสำเร็จ", detail: 'แบบฝึกหัด "การแยกตัวประกอบ"', time: "2 วันก่อน" },
];

export const initialClassrooms: Classroom[] = [
  {
    id: "c1", name: "ม.2/1", subject: "คณิตศาสตร์", grade: "ม.2", term: "ภาคเรียนที่ 1/2567", teacher: "ครูจิราภรณ์",
    exercises: { total: 14, completed: 12, inProgress: 2 }, avgScore: 85.7, avgDelta: 4.6, riskCount: 6,
    trend: [
      { label: "โจทย์ปัญหา", date: "5 เม.ย.", value: 78.4 },
      { label: "ทศนิยม", date: "12 เม.ย.", value: 82.1 },
      { label: "สมการเชิงเส้น", date: "19 เม.ย.", value: 74.6 },
      { label: "พหุนาม", date: "26 เม.ย.", value: 88.2 },
      { label: "การแยกตัวประกอบ", date: "3 พ.ค.", value: 80.7 },
      { label: "เรขาคณิต", date: "10 พ.ค.", value: 86.9 },
    ],
    distribution: [
      { label: "90-100%", count: 12, pct: 28.6, color: "#6D9773" },
      { label: "80-89%", count: 16, pct: 38.1, color: "#A8C686" },
      { label: "70-79%", count: 8, pct: 19.0, color: "#D8B75F" },
      { label: "60-69%", count: 4, pct: 9.5, color: "#C9A24B" },
      { label: "ต่ำกว่า 60%", count: 2, pct: 4.8, color: "#BB6B53" },
    ],
    groups: { excellent: 12, good: 16, developing: 8, support: 6 },
    subjectScores: [
      { label: "จำนวนเต็มและเลขคณิต", pct: 89, barColor: "#6D9773" },
      { label: "สมการเชิงเส้น", pct: 76, barColor: "#A8C686" },
      { label: "พหุนาม", pct: 84, barColor: "#6D9773" },
      { label: "การแยกตัวประกอบ", pct: 71, barColor: "#D8B75F" },
      { label: "เรขาคณิต", pct: 87, barColor: "#6D9773" },
    ],
    topStudents: [
      { name: "ทิวากร ใจดี", pct: 96.4, rank: 1, badgeBg: "#D8B75F" },
      { name: "กิตติภพ แสงทอง", pct: 94.7, rank: 2, badgeBg: "#A8C686" },
      { name: "ปัณวรรณ ศรีสุข", pct: 93.8, rank: 3, badgeBg: "#6D9773" },
    ],
    problems: ["เรียนไม่ทันเพื่อน", "เข้าสังคมไม่ได้"],
    students: [
      { id: "s1", name: "ณัฐวุฒิ สินธุ์เจริญ", studentId: "44821", seatNo: 1, gender: "M", problems: ["เรียนไม่ทันเพื่อน"], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 78, strengths: ["เข้าใจแนวคิดหลักของบทเรียนได้ดี", "ตอบคำถามเชิงคำนวณได้ถูกต้อง"], weaknesses: ["สรุปใจความสำคัญยังไม่ครบถ้วน", "ใช้เวลาทำโจทย์นานกว่าเพื่อน"], suggestions: ["ให้ฝึกสรุปบทเรียนด้วยแผนภาพก่อนเริ่มทำโจทย์", "แบ่งโจทย์เป็นชุดย่อยเพื่อลดความกดดันเรื่องเวลา"] }, history: [{ name: "พหุนาม", date: "26 เม.ย.", score: 72 }, { name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 75 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 78 }] },
      { id: "s2", name: "พิมพ์ชนก อินทรทัต", studentId: "44822", seatNo: 2, gender: "F", problems: ["เข้าสังคมไม่ได้"], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: false, score: 85, strengths: ["ทำงานเดี่ยวได้ละเอียดและถูกต้อง"], weaknesses: ["ไม่ค่อยร่วมกิจกรรมกลุ่ม"], suggestions: ["จับกลุ่มเล็ก 2-3 คนในกิจกรรมถัดไป"] }, history: [{ name: "พหุนาม", date: "26 เม.ย.", score: 88 }, { name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 82 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 85 }] },
      { id: "s3", name: "ธีรภัทร กังวานวงศ์", studentId: "44823", seatNo: 3, gender: "M", problems: ["มีข้อบกพร่องด้านการเรียนรู้ (LD)", "ขาดสมาธิ/วอกแวกง่าย"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s4", name: "ปวริศา แสงทอง", studentId: "44824", seatNo: 4, gender: "F", problems: [], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s5", name: "ก้องภพ ศรีวิไล", studentId: "44825", seatNo: 5, gender: "M", problems: ["เรียนไม่ทันเพื่อน"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s6", name: "ชนัญชิดา บุญมาก", studentId: "44826", seatNo: 6, gender: "F", problems: ["ขาดความมั่นใจในการพูด"], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 91, strengths: ["เขียนคำตอบชัดเจนเป็นระบบ"], weaknesses: ["ไม่ยกมือตอบคำถามในห้อง"], suggestions: ["เปิดโอกาสให้ตอบเป็นลายลักษณ์อักษรก่อนพูด"] }, history: [{ name: "พหุนาม", date: "26 เม.ย.", score: 85 }, { name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 89 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 91 }] },
      { id: "s7", name: "ทิวากร ใจดี", studentId: "44827", seatNo: 7, gender: "M", problems: [], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 96, strengths: ["เข้าใจเนื้อหาลึกและเชื่อมโยงบทก่อนหน้าได้ดี"], weaknesses: ["บางครั้งเขียนขั้นตอนไม่ครบ"], suggestions: ["กระตุ้นให้แสดงวิธีทำละเอียดขึ้นเพื่อรักษามาตรฐาน"] }, history: [{ name: "พหุนาม", date: "26 เม.ย.", score: 94 }, { name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 95 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 96 }] },
      { id: "s8", name: "กิตติภพ แสงทอง", studentId: "44828", seatNo: 8, gender: "M", problems: [], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 95, strengths: ["คำนวณรวดเร็วและแม่นยำ"], weaknesses: ["ไม่ค่อยอธิบายเหตุผลประกอบ"], suggestions: ["กระตุ้นให้อธิบาย \"ทำไม\" ทุกครั้งที่ตอบ"] }, history: [{ name: "พหุนาม", date: "26 เม.ย.", score: 97 }, { name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 93 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 95 }] },
    ],
  },
  {
    id: "c2", name: "ม.2/2", subject: "คณิตศาสตร์", grade: "ม.2", term: "ภาคเรียนที่ 1/2567", teacher: "ครูจิราภรณ์",
    exercises: { total: 11, completed: 9, inProgress: 1 }, avgScore: 78.3, avgDelta: 2.1, riskCount: 5,
    trend: [
      { label: "โจทย์ปัญหา", date: "5 เม.ย.", value: 70.2 },
      { label: "ทศนิยม", date: "12 เม.ย.", value: 74.8 },
      { label: "สมการเชิงเส้น", date: "19 เม.ย.", value: 68.9 },
      { label: "พหุนาม", date: "26 เม.ย.", value: 80.1 },
      { label: "การแยกตัวประกอบ", date: "3 พ.ค.", value: 76.4 },
      { label: "เรขาคณิต", date: "10 พ.ค.", value: 78.3 },
    ],
    distribution: [
      { label: "90-100%", count: 6, pct: 15.4, color: "#6D9773" },
      { label: "80-89%", count: 12, pct: 30.8, color: "#A8C686" },
      { label: "70-79%", count: 13, pct: 33.3, color: "#D8B75F" },
      { label: "60-69%", count: 5, pct: 12.8, color: "#C9A24B" },
      { label: "ต่ำกว่า 60%", count: 3, pct: 7.7, color: "#BB6B53" },
    ],
    groups: { excellent: 6, good: 12, developing: 13, support: 8 },
    subjectScores: [
      { label: "จำนวนเต็มและเลขคณิต", pct: 82, barColor: "#6D9773" },
      { label: "สมการเชิงเส้น", pct: 69, barColor: "#D8B75F" },
      { label: "พหุนาม", pct: 80, barColor: "#6D9773" },
      { label: "การแยกตัวประกอบ", pct: 73, barColor: "#A8C686" },
      { label: "เรขาคณิต", pct: 78, barColor: "#A8C686" },
    ],
    topStudents: [
      { name: "ปิยะดา รุ่งเรือง", pct: 92.1, rank: 1, badgeBg: "#D8B75F" },
      { name: "ศุภกร มั่นคง", pct: 90.4, rank: 2, badgeBg: "#A8C686" },
      { name: "วรินทร ทองแท้", pct: 88.9, rank: 3, badgeBg: "#6D9773" },
    ],
    problems: ["ขาดสมาธิ/วอกแวกง่าย"],
    students: [
      { id: "s9", name: "ปิยะดา รุ่งเรือง", studentId: "44901", seatNo: 1, gender: "F", problems: [], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 92, strengths: ["วิเคราะห์โจทย์เป็นระบบ"], weaknesses: ["ทำโจทย์ยากใช้เวลานาน"], suggestions: ["ฝึกโจทย์จับเวลาเพิ่มความคล่องตัว"] }, history: [{ name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 86 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 92 }] },
      { id: "s10", name: "ศุภกร มั่นคง", studentId: "44902", seatNo: 2, gender: "M", problems: ["ขาดสมาธิ/วอกแวกง่าย"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s11", name: "ธัญชนก ไพรวัลย์", studentId: "44903", seatNo: 3, gender: "F", problems: ["ขาดสมาธิ/วอกแวกง่าย"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s12", name: "ณภัทร บุญเลิศ", studentId: "44904", seatNo: 4, gender: "M", problems: [], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: false, score: 74, strengths: ["ตั้งใจทำแบบฝึกหัดจนจบ"], weaknesses: ["สับสนลำดับขั้นตอนการแก้สมการ"], suggestions: ["ทวนขั้นตอนการแก้สมการทีละขั้นก่อนเริ่มโจทย์ใหม่"] }, history: [{ name: "การแยกตัวประกอบ", date: "3 พ.ค.", score: 78 }, { name: "เรขาคณิต", date: "10 พ.ค.", score: 74 }] },
    ],
  },
  {
    id: "c3", name: "ม.1/1", subject: "คณิตศาสตร์", grade: "ม.1", term: "ภาคเรียนที่ 1/2567", teacher: "ครูจิราภรณ์",
    exercises: { total: 10, completed: 8, inProgress: 1 }, avgScore: 72.1, avgDelta: 1.5, riskCount: 7,
    trend: [
      { label: "จำนวนเต็ม", date: "5 เม.ย.", value: 66.5 },
      { label: "เศษส่วน", date: "12 เม.ย.", value: 70.2 },
      { label: "ทศนิยม", date: "19 เม.ย.", value: 64.8 },
      { label: "อัตราส่วน", date: "26 เม.ย.", value: 75.6 },
      { label: "ร้อยละ", date: "3 พ.ค.", value: 71.9 },
      { label: "พหุนาม", date: "10 พ.ค.", value: 72.1 },
    ],
    distribution: [
      { label: "90-100%", count: 4, pct: 10.0, color: "#6D9773" },
      { label: "80-89%", count: 8, pct: 20.0, color: "#A8C686" },
      { label: "70-79%", count: 14, pct: 35.0, color: "#D8B75F" },
      { label: "60-69%", count: 9, pct: 22.5, color: "#C9A24B" },
      { label: "ต่ำกว่า 60%", count: 5, pct: 12.5, color: "#BB6B53" },
    ],
    groups: { excellent: 4, good: 8, developing: 14, support: 14 },
    subjectScores: [
      { label: "จำนวนเต็ม", pct: 75, barColor: "#A8C686" },
      { label: "เศษส่วน", pct: 68, barColor: "#D8B75F" },
      { label: "ทศนิยม", pct: 64, barColor: "#D8B75F" },
      { label: "อัตราส่วน", pct: 76, barColor: "#A8C686" },
      { label: "ร้อยละ", pct: 71, barColor: "#D8B75F" },
    ],
    topStudents: [
      { name: "อรวี ศรีสมบัติ", pct: 89.2, rank: 1, badgeBg: "#D8B75F" },
      { name: "พีรพัฒน์ ยิ่งยง", pct: 86.5, rank: 2, badgeBg: "#A8C686" },
      { name: "ชญานิษฐ์ แก้วมณี", pct: 84.1, rank: 3, badgeBg: "#6D9773" },
    ],
    problems: ["ปัญหาด้านการอ่าน-เขียน", "ขาดแรงจูงใจในการเรียน"],
    students: [
      { id: "s13", name: "อรวี ศรีสมบัติ", studentId: "45001", seatNo: 1, gender: "F", problems: [], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 89, strengths: ["เข้าใจภาพรวมของบทเรียนดี"], weaknesses: ["คำนวณผิดพลาดเล็กน้อยจากความรีบ"], suggestions: ["ฝึกตรวจทานคำตอบก่อนส่งทุกครั้ง"] }, history: [{ name: "ร้อยละ", date: "3 พ.ค.", score: 84 }, { name: "พหุนาม", date: "10 พ.ค.", score: 89 }] },
      { id: "s14", name: "สิรวิชญ์ เพียรกิจ", studentId: "45002", seatNo: 2, gender: "M", problems: ["ปัญหาด้านการอ่าน-เขียน"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s15", name: "เมธาวี ผลบุญ", studentId: "45003", seatNo: 3, gender: "F", problems: ["ขาดแรงจูงใจในการเรียน"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s16", name: "ปณิธาน ชัยเจริญ", studentId: "45004", seatNo: 4, gender: "M", problems: ["ปัญหาด้านการอ่าน-เขียน", "ขาดแรงจูงใจในการเรียน"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
    ],
  },
  {
    id: "c4", name: "ม.1/2", subject: "คณิตศาสตร์", grade: "ม.1", term: "ภาคเรียนที่ 1/2567", teacher: "ครูจิราภรณ์",
    exercises: { total: 9, completed: 7, inProgress: 1 }, avgScore: 71.4, avgDelta: 0.8, riskCount: 6,
    trend: [
      { label: "จำนวนเต็ม", date: "5 เม.ย.", value: 65.1 },
      { label: "เศษส่วน", date: "12 เม.ย.", value: 68.4 },
      { label: "ทศนิยม", date: "19 เม.ย.", value: 63.2 },
      { label: "อัตราส่วน", date: "26 เม.ย.", value: 73.8 },
      { label: "ร้อยละ", date: "3 พ.ค.", value: 70.5 },
      { label: "พหุนาม", date: "10 พ.ค.", value: 71.4 },
    ],
    distribution: [
      { label: "90-100%", count: 3, pct: 7.9, color: "#6D9773" },
      { label: "80-89%", count: 7, pct: 18.4, color: "#A8C686" },
      { label: "70-79%", count: 13, pct: 34.2, color: "#D8B75F" },
      { label: "60-69%", count: 10, pct: 26.3, color: "#C9A24B" },
      { label: "ต่ำกว่า 60%", count: 5, pct: 13.2, color: "#BB6B53" },
    ],
    groups: { excellent: 3, good: 7, developing: 13, support: 15 },
    subjectScores: [
      { label: "จำนวนเต็ม", pct: 70, barColor: "#D8B75F" },
      { label: "เศษส่วน", pct: 66, barColor: "#D8B75F" },
      { label: "ทศนิยม", pct: 62, barColor: "#C9A24B" },
      { label: "อัตราส่วน", pct: 74, barColor: "#A8C686" },
      { label: "ร้อยละ", pct: 69, barColor: "#D8B75F" },
    ],
    topStudents: [
      { name: "นภสร แจ่มใส", pct: 87.6, rank: 1, badgeBg: "#D8B75F" },
      { name: "ธาดา วงศ์สุข", pct: 85.0, rank: 2, badgeBg: "#A8C686" },
      { name: "กัญญาณัฐ ทิพย์เนตร", pct: 83.3, rank: 3, badgeBg: "#6D9773" },
    ],
    problems: ["เรียนไม่ทันเพื่อน", "มีข้อบกพร่องด้านการเรียนรู้ (LD)"],
    students: [
      { id: "s17", name: "นภสร แจ่มใส", studentId: "45101", seatNo: 1, gender: "F", problems: [], homework: { status: "graded", hasFile: true, hasAnswer: true, confirmed: true, score: 88, strengths: ["ตอบคำถามอย่างมีเหตุผล"], weaknesses: ["เขียนขั้นตอนไม่ครบถ้วน"], suggestions: ["ฝึกเขียนขั้นตอนแสดงวิธีทำอย่างละเอียด"] }, history: [{ name: "ร้อยละ", date: "3 พ.ค.", score: 83 }, { name: "พหุนาม", date: "10 พ.ค.", score: 88 }] },
      { id: "s18", name: "ธาดา วงศ์สุข", studentId: "45102", seatNo: 2, gender: "M", problems: ["เรียนไม่ทันเพื่อน"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s19", name: "กัญญาณัฐ ทิพย์เนตร", studentId: "45103", seatNo: 3, gender: "F", problems: [], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
      { id: "s20", name: "ปกรณ์เกียรติ สายทอง", studentId: "45104", seatNo: 4, gender: "M", problems: ["มีข้อบกพร่องด้านการเรียนรู้ (LD)"], homework: { status: "none", hasFile: false, hasAnswer: false, confirmed: false } },
    ],
  },
];

type ClassroomInsight = {
  summary: string;
  points: string[];
  recommendation: string;
};

const insightMap: Record<string, ClassroomInsight> = {
  c1: { summary: "จากปัญหาเริ่มต้นและผลตรวจการบ้าน พบว่านักเรียนในห้องนี้มีความถนัดงานเดี่ยวมากกว่างานกลุ่ม และมีบางส่วนที่เรียนไม่ทันเนื้อหา", points: ["คะแนนเฉลี่ยของห้องเพิ่มขึ้น 4.6% ในเดือนนี้ 🎉", 'หัวข้อ "สมการเชิงเส้น" ยังเป็นจุดอ่อนของนักเรียน 35%', 'แนะนำให้ทำกิจกรรมกลุ่มในบท "การแยกตัวประกอบ"', "นักเรียน 6 คน ควรได้รับการเสริมเพิ่มเติม"], recommendation: "แนะนำใช้กิจกรรมกลุ่มเล็ก 2-3 คน สลับกับงานเดี่ยวที่มีเวลาให้เพิ่มขึ้น 15% และทวนเนื้อหาสั้นๆก่อนเริ่มบทเรียนใหม่" },
  c2: { summary: "ห้องนี้มีคะแนนกระจายตัวปานกลาง และมีนักเรียนที่ขาดสมาธิเป็นปัจจัยหลักที่กระทบผลการเรียน", points: ["คะแนนเฉลี่ยเพิ่มขึ้น 2.1% จากเดือนที่แล้ว", 'บท "สมการเชิงเส้น" มีคะแนนเฉลี่ยต่ำสุดของห้อง', "กิจกรรมที่ใช้เวลานานเกิน 20 นาทีมักทำให้นักเรียนวอกแวก"], recommendation: "แนะนำสลับกิจกรรมทุก 15-20 นาที และเพิ่มแบบฝึกหัดสั้นๆระหว่างคาบ" },
  c3: { summary: "ห้องนี้มีนักเรียนกลุ่มเสริมจำนวนมาก ควรเน้นปูพื้นฐานให้แน่นก่อนขึ้นเนื้อหาใหม่", points: ["กลุ่มเสริม (ต่ำกว่า 70%) มี 14 คน จาก 40 คน", 'บท "ทศนิยม" มีคะแนนเฉลี่ยต่ำสุด', "นักเรียนที่มีปัญหาด้านการอ่าน-เขียนควรได้รับสื่อภาพเพิ่มเติม"], recommendation: "แนะนำทวนพื้นฐานเลขคณิตก่อนเข้าบทใหม่ทุกครั้ง และใช้สื่อภาพประกอบการสอน" },
  c4: { summary: "ผลการเรียนของห้องนี้ใกล้เคียงกับ ม.1/1 โดยมีจุดอ่อนที่ทศนิยมและอัตราส่วนเป็นหลัก", points: ["คะแนนเฉลี่ยเพิ่มขึ้นเพียง 0.8% ควรติดตามใกล้ชิด", 'บท "ทศนิยม" มีคะแนนเฉลี่ยต่ำสุดของห้อง', "นักเรียนกลุ่มเสี่ยง 6 คน ควรได้รับการติดตามเป็นรายบุคคล"], recommendation: "แนะนำจัดคาบเสริมสั้นๆสำหรับกลุ่มเสี่ยง และทวนโจทย์ทศนิยมซ้ำในกิจกรรมต้นคาบ" },
};

export function getClassroomInsight(classroomId: string): ClassroomInsight {
  return (
    insightMap[classroomId] || {
      summary: "ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์",
      points: [],
      recommendation: "เพิ่มปัญหานักเรียนและผลตรวจการบ้านเพื่อให้ AI วิเคราะห์ได้แม่นยำขึ้น",
    }
  );
}
