import type {
  MarkdownBlock,
  QuestionCandidate
} from './types'

const STRONG_PATTERNS = [

  /เหตุใด/,

  /เพราะเหตุใด/,

  /อย่างไร/,

  /อะไร/,

  /ใดบ้าง/,

  /กี่/,

  /เท่าใด/,

  /เท่าไร/,

  /จงหา/,

  /จงคำนวณ/,

  /จงคำนวณหา/,

  /ข้อใด/,

  /จำนวนวิธี/,

  /ได้กี่/,

  /เป็นอย่างไร/,
];


const MEDIUM_PATTERNS = [

  /อธิบาย/,

  /บอก/,

  /ระบุ/,

  /เปรียบเทียบ/,

  /ยกตัวอย่าง/,

  /วิเคราะห์/,

  /หาค่า/,

  /เขียน/,

  /คำนวณ/,

  /หาจำนวน/,

  /จงแสดง/,

  /จงตอบ/,

  /จงอธิบาย/,
];

function detectQuestionLanguage(
  text: string
) {

  const strongMatches =
    STRONG_PATTERNS
      .filter(
        pattern =>
          pattern.test(text)
      )
      .map(
        pattern =>
          pattern.source
      );


  const mediumMatches =
    MEDIUM_PATTERNS
      .filter(
        pattern =>
          pattern.test(text)
      )
      .map(
        pattern =>
          pattern.source
      );


  let score = 0;


  if (strongMatches.length > 0) {

    score += 0.35;
  }


  if (mediumMatches.length > 0) {

    score += 0.20;
  }


  // Multiple linguistic signals
  if (
    strongMatches.length >= 2
  ) {

    score += 0.10;
  }


  return {

    score:
      Math.min(
        score,
        0.45
      ),

    strongMatches,

    mediumMatches,
  };
}

function detectStructure(
  block: MarkdownBlock
) {

  let score = 0;


  const isOrderedList =
    block.type === "listItem" &&
    block.ordered === true;


  const hasQuestionNumber =
    block.listNumber !== undefined;


  /*
   * Ordered list is a strong signal
   */

  if (isOrderedList) {

    score += 0.50;
  }


  /*
   * Explicit list number
   */

  if (hasQuestionNumber) {

    score += 0.15;
  }


  return {

    score:
      Math.min(score, 0.65),

    isOrderedList,

    hasQuestionNumber,
  };
}

function looksLikeAnswer(
  text: string
): boolean {

  const normalized =
    text.trim();


  if (!normalized) {
    return false;
  }


  /*
   * Common answer indicators
   */

  const answerPatterns = [

    /^วิธีทำ/,

    /^ตอบ/,

    /^คำตอบ/,

    /^วิธีคิด/,

    /^เฉลย/,

    /^ดังนั้น/,

    /^เพราะ/,

    /^เนื่องจาก/,

  ];


  if (
    answerPatterns.some(
      pattern =>
        pattern.test(normalized)
    )
  ) {

    return true;
  }


  /*
   * Mathematical / explanatory answer
   */

  if (
    normalized.includes("=") ||
    normalized.includes("คือ") ||
    normalized.includes("ได้")
  ) {

    return true;
  }


  return false;
}

interface Context {

  previousWasQuestion: boolean;

  nextLooksLikeAnswer: boolean;

  numberSequence: boolean;
}

function detectContext(
  blocks: MarkdownBlock[],
  index: number
): Context {

  const current =
    blocks[index];


  const previous =
    blocks[index - 1];


  const next =
    blocks[index + 1];


  /*
   * Previous block
   */

  const previousWasQuestion =
    previous?.listNumber !== undefined;


  /*
   * Next block
   */

  const nextLooksLikeAnswer =
    next
      ? looksLikeAnswer(next.text)
      : false;


  /*
   * Number sequence
   */

  let numberSequence =
    false;


  if (
    current!.listNumber !== undefined &&
    previous?.listNumber !== undefined
  ) {

    numberSequence =
      current!.listNumber ===
      previous.listNumber + 1;
  }


  return {

    previousWasQuestion,

    nextLooksLikeAnswer,

    numberSequence,
  };
}

function calculateContextScore(
  context: Context
): number {

  let score = 0;


  if (
    context.nextLooksLikeAnswer
  ) {

    score += 0.15;
  }


  if (
    context.numberSequence
  ) {

    score += 0.10;
  }


  /*
   * This is intentionally weak.
   *
   * Previous question alone should
   * NOT make something a candidate.
   */

  if (
    context.previousWasQuestion
  ) {

    score += 0.05;
  }


  return Math.min(
    score,
    0.30
  );
}

function calculateCandidateScore(
  block: MarkdownBlock,
  context: Context
) {

  const structure =
    detectStructure(block);


  const linguistic =
    detectQuestionLanguage(
      block.text
    );


  const contextScore =
    calculateContextScore(
      context
    );


  const score =
    Math.min(
      1,

      structure.score +

      linguistic.score +

      contextScore
    );


  return {

    score,

    features: {

      structureScore:
        structure.score,

      isOrderedList:
        structure.isOrderedList,

      hasQuestionNumber:
        structure.hasQuestionNumber,


      linguisticScore:
        linguistic.score,

      strongMatches:
        linguistic.strongMatches,

      mediumMatches:
        linguistic.mediumMatches,


      contextScore,

      previousWasQuestion:
        context.previousWasQuestion,

      nextLooksLikeAnswer:
        context.nextLooksLikeAnswer,

      numberSequence:
        context.numberSequence,
    },
  };
}

export function detectQuestions(
  blocks: MarkdownBlock[]
): QuestionCandidate[] {

  const candidates:
    QuestionCandidate[] = [];


  for (
    let i = 0;
    i < blocks.length;
    i++
  ) {

    const block =
      blocks[i];


    const context =
      detectContext(
        blocks,
        i
      );


    const result =
      calculateCandidateScore(
        block!,
        context
      );


    /*
     * High recall threshold.
     *
     * We intentionally keep this low.
     */

    const decision =
      result.score >= 0.40
        ? "candidate"
        : "not_candidate";


    candidates.push({

      blockId:
        block!.id,

      text:
        block!.text,

      questionNumber:
        block!.listNumber ?? null,

      confidence:
        result.score,

      decision,

      features:
        result.features,
    });
  }


  return candidates;
}