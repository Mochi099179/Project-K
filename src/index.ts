import {
  parseMarkdown,
} from "./raw-process/mdparser";

import {
    detectQuestionCandidate
} from "./raw-process/qdetectorv3";

import {
    updateKeywordDatabase
} from "./raw-process/keywords";

import {
  detectQuestions,
} from "./raw-process/qdetector";

import {
  segmentQuestions,
} from "./raw-process/segmenter";


// ============================================
// 1. OCR result
// ============================================

const markdown = `
10
ใบงาน การเรียงสับเปลี่ยนเชิงเส้น
ชื่อ นายณัฐรัฐ วงสาน ชั้น ม.5/1 เลขที่ 14
2. การเรียงสับเปลี่ยนเชิงเส้นของสิ่งของที่ไม่แตกต่างกันทั้งหมด บางอย่างจะเหมือนกัน
ทฤษฎีบท
ถ้าสิ่งของ k กลุ่ม ซึ่งในกลุ่มที่ 1 มีของ n1 สิ่งที่เหมือนกันในกลุ่มที่ 2 มีสิ่งของ n2 สิ่งที่เหมือนกัน... ในกลุ่มที่ k มีสิ่งของ nk สิ่งที่เหมือนกัน โดยที่ n1 + n2 + ... + nk = n จำนวนวิธีเรียงสับเปลี่ยนกลุ่มของสิ่งของ n สิ่ง เท่ากับ
n! / (n1! n2! ... nk!)
Note
n! -> ทั้งหมด
n1! n2! ... nk! -> จำนวนสิ่งของที่ซ้ำกัน
จำนวนของที่ไม่ซ้ำทั้งหมด

ตามเงื่อนไข 1. นำตัวอักษรทั้งหมดจากคำ "PAPAYA" มาสร้างคำโดยไม่คำนึงถึงความหมายได้ทั้งหมดกี่คำ
วิธีทำ ซ้ำ P มี 2 ตัว
ซ้ำ A มี 3 ตัว
ไม่ซ้ำ Y มี 1 ตัว
6! / (2! 3! 1!) = (6 x 5 x 4 x 3!) / (2 x 1 x 3!) = 60 คำ

2. มีธงสีขาว 3 ผืน สีเขียว 4 ผืน สีเหลือง 2 ผืน และสีแดง 1 ผืน นำทั้งหมดมาเรียงกันเป็นแถว เป็นสัญญาณต่างๆ ได้กี่แบบ
วิธีทำ ซ้ำ ขาว 3 ผืน
ซ้ำ เขียว 4 ผืน
ซ้ำ เหลือง 2 ผืน
ไม่ซ้ำ แดง 1 ผืน
10! / (3! 4! 2! 1!) = (10 x 9 x 8 x 7 x 6 x 5 x 4!) / (3 x 2 x 1 x 4! x 2 x 1) = 12,600 แบบ

3. นำธงสีเหลือง 3 ผืน สีแดง 3 ผืน สีขาว 4 ผืน มาผูกเป็นสัญญาณในแนวตั้ง จะมีสัญญาณที่แตกต่างกันได้กี่แบบ
วิธีทำ ซ้ำ เหลือง 3 ผืน
ซ้ำ แดง 3 ผืน
ซ้ำ ขาว 4 ผืน
10! / (3! 3! 4!) = (10 x 9 x 8 x 7 x 6 x 5 x 4!) / (3 x 2 x 1 x 3 x 2 x 1 x 4!) = 4,200 แบบ

4. ถ้าวาดแผนผังที่แสดงการเดินทางของถนนสายหนึ่งจากจุด A โดยเดิน ไปทางทิศเหนือ (N) และทิศตะวันออก (E) ไปยังจุด B ด้วยตารางดังภาพ การเดินทางจากจุด A ไปจุด B จะมีเส้นทางที่ผ่านจุด C แต่ไม่ผ่านจุด D
วิธีทำ
[Image of a grid with points A, B, C, and D]
`;

const markdown2 = `
ชื่อ เปียโน นามสกุล เมฆทา ชั้น ม.6/1 เลขที่ 24

ใบงาน ASEAN 1

ตอนที่ 1 คำชี้แจง : ให้นักเรียนตอบคำถามต่อไปนี้

1.) เหตุใดองค์การสนธิสัญญาป้องกันร่วมกันแห่งเอเชียตะวันออกเฉียงใต้ หรือ SEATO จึงต้องล้มเลิกไป
ขาดความร่วมมือกันระหว่างสมาชิก ปัญหาความขัดแย้งภายใน การถอนตัวของประเทศสมาชิก

2.) สมาคมเอเชียตะวันออกเฉียงใต้ หรือสมาคมอาสา (ASA) มีจุดเริ่มต้นที่มีจุดเด่นอย่างไร และมีประเทศใดบ้างเป็นสมาชิก
เป็นการรวมตัวของประเทศในเอเชียตะวันออกเฉียงใต้เพื่อความร่วมมือทางเศรษฐกิจ สังคมและวัฒนธรรม สมาชิกคือ ไทย มาเลเซีย ฟิลิปปินส์

3.) เหตุใดสมาคมเอเชียตะวันออกเฉียงใต้ หรือสมาคมอาสา จึงต้องล้มเลิกไป
ความขัดแย้งระหว่างประเทศสมาชิก ไทย มาเลเซีย ฟิลิปปินส์

4.) ประเทศสมาชิกที่ร่วมก่อตั้งอาเซียน ได้แก่ประเทศใดบ้าง
มีทั้งหมด 5 ประเทศ ไทย อินโดนีเซีย มาเลเซีย ฟิลิปปินส์ สิงคโปร์

5.) วัตถุประสงค์ในการก่อตั้งอาเซียนในระยะเริ่มแรกคืออะไร
ส่งเสริมความร่วมมือและความช่วยเหลือซึ่งกันและกันทางเศรษฐกิจ

6.) เหตุใดอาเซียนจึงหันมามุ่งเน้นกระชับความสัมพันธ์และขยายความร่วมมือด้านเศรษฐกิจระหว่างกันมากขึ้น
วิกฤตการณ์ทางเศรษฐกิจในภูมิภาค

7. ประเทศสมาชิกอาเซียนมีสภาพภูมิศาสตร์และประวัติศาสตร์ที่คล้ายคลึงกันเด่นชัดในเรื่องใด
ตั้งอยู่ในภูมิภาคเอเชียตะวันออกเฉียงใต้ สภาพภูมิอากาศแบบร้อนชื้น ทรัพยากรธรรมชาติที่คล้ายคลึงกัน

8. กฎบัตรอาเซียนมีความสำคัญอย่างไร
เป็นธรรมนูญของอาเซียนที่วางกรอบกฎหมายและโครงสร้างองค์กรของอาเซียน เพื่อเพิ่มประสิทธิภาพของอาเซียนในการดำเนินการตามวัตถุประสงค์และเป้าหมายที่กำหนดไว้

9. 3 เสาหลักของอาเซียนประกอบด้วย
1. ประชาคมการเมืองและความมั่นคงอาเซียน 2. ประชาคมเศรษฐกิจอาเซียน 3. ประชาคมสังคมและวัฒนธรรมอาเซียน

10. อาเซียนมีบทบาทอย่างไรในสังคมโลก
ส่งเสริมสันติภาพและความมั่นคงในภูมิภาค และสร้างความร่วมมือทางเศรษฐกิจและสังคมกับประเทศและองค์กรระหว่างประเทศอื่นๆ
`;

// ============================================
// 2. Markdown → Blocks
// ============================================

// const blocks =
//   parseMarkdown(markdown);


// const candidates =
//   detectQuestions(blocks);


// for (const candidate of candidates) {

//   if (
//     candidate.decision === "candidate"
//   ) {

//     console.log({
//       number:
//         candidate.questionNumber,

//       text:
//         candidate.text,

//       confidence:
//         candidate.confidence,

//       features:
//         candidate.features,
//     });
//   }
// }

// const blocks =
//   parseMarkdown(markdown);

// console.log(
//   "\n========== BLOCKS ==========\n"
// );

// for (const block of blocks) {

//   console.log({
//     id: block.id,
//     type: block.type,
//     text: block.text,
//     startLine: block.startLine,
//     endLine: block.endLine,
//   });

// }


// // ============================================
// // 3. Detect question candidates
// // ============================================

// const candidates =
//   detectQuestions(blocks);

// console.log(
//   "\n========== QUESTION CANDIDATES ==========\n"
// );

// for (const candidate of candidates) {

//   console.log({
//     blockId:
//       candidate.blockId,

//     questionNumber:
//       candidate.questionNumber,

//     confidence:
//       candidate.confidence,

//     decision:
//       candidate.decision,

//     features:
//       candidate.features,
//   });

// }


// // ============================================
// // 4. Segment Question → Answer
// // ============================================

// const segments =
//   segmentQuestions(
//     blocks,
//     candidates
//   );


// // ============================================
// // 5. Final result
// // ============================================

// const result = {

//   questions:
//     segments,

//   statistics: {

//     totalBlocks:
//       blocks.length,

//     totalCandidates:
//       candidates.length,

//     detectedQuestions:
//       candidates.filter(
//         candidate =>
//           candidate.decision ===
//           "question"
//       ).length,

//     ambiguous:
//       candidates.filter(
//         candidate =>
//           candidate.decision ===
//           "ambiguous"
//       ).length,
//   },
// };


// // ============================================
// // 6. Print JSON
// // ============================================

// console.log(
//   "\n========== FINAL JSON ==========\n"
// );

// console.log(
//   JSON.stringify(
//     result,
//     null,
//     2
//   )
// );
(async () => {
const blocks =
  parseMarkdown(markdown2);


const candidates = [];
const example_qs = [];

for (const block of blocks) {

  const candidate =
    await detectQuestionCandidate(
      block
    );

  
  if (candidate) {

    candidates.push(
      candidate
    );

    example_qs.push({
        text: candidate.questionText,
        isQuestion: true
    })
  } else {
    example_qs.push({
    text: block.text,
    isQuestion: false
    })
  }
}

// updateKeywordDatabase(example_qs);

console.log(
  JSON.stringify(
    candidates,
    null,
    2
  )
);
})();