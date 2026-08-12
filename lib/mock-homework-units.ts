import type { HomeworkUnit } from "./types";

export function buildSeedHomeworkUnits(): HomeworkUnit[] {
  return [
    {
      id: "hu1",
      name: "พหุนามและการดำเนินการ",
      subject: "คณิตศาสตร์",
      grade: "ม.2",
      createdAt: "2024-04-20T09:00:00Z",
      exercises: [
        { id: "hu1-ex1", name: "ใบงาน พหุนาม ชุด 1.pdf", kind: "pdf", addedAt: "2024-04-20T09:00:00Z" },
        { id: "hu1-ex2", name: "ใบงาน พหุนาม ชุด 2.pdf", kind: "pdf", addedAt: "2024-04-22T09:00:00Z" },
      ],
      answerKeys: [{ id: "hu1-ak1", name: "เฉลย พหุนาม ชุด 1-2.pdf", kind: "pdf", addedAt: "2024-04-20T09:00:00Z" }],
      teachingMaterials: [
        { id: "hu1-tm1", name: "สไลด์ บทที่ 4 พหุนาม.pdf", kind: "pdf", addedAt: "2024-04-18T09:00:00Z" },
        { id: "hu1-tm2", name: "บันทึกการสอน - พหุนาม.txt", kind: "text", addedAt: "2024-04-18T09:00:00Z" },
      ],
    },
    {
      id: "hu2",
      name: "การแยกตัวประกอบพหุนาม",
      subject: "คณิตศาสตร์",
      grade: "ม.2",
      createdAt: "2024-04-28T09:00:00Z",
      exercises: [{ id: "hu2-ex1", name: "ใบงาน การแยกตัวประกอบ.pdf", kind: "pdf", addedAt: "2024-04-28T09:00:00Z" }],
      answerKeys: [{ id: "hu2-ak1", name: "เฉลย การแยกตัวประกอบ.pdf", kind: "pdf", addedAt: "2024-04-28T09:00:00Z" }],
      teachingMaterials: [],
    },
  ];
}
