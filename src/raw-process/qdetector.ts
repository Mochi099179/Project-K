import type {
  MarkdownBlock,
} from './types'

export interface QuestionCandidate {

  blockId: string;

  text: string;

  questionNumber:
    | number
    | null;

  confidence: number;

  decision:
    | "question"
    | "ambiguous"
    | "not_question";

  features: {

    numberAtStart: boolean;

    numberAtEnd: boolean;

    numberAfterText: boolean;

    keywordMatches: string[];

    keywordScore: number;

    numberScore: number;
  };
}

const QUESTION_KEYWORDS = [

  "เหตุใด",

  "เพราะเหตุใด",

  "อย่างไร",

  "อะไร",

  "ใดบ้าง",

  "กี่",

  "เท่าไร",

  "เท่าใด",

  "จง",

  "จงหา",

  "จงคำนวณ",

  "คำนวณ",

  "กำหนดให้",

  "ข้อใด",

  "มีทั้งหมด",

  "จำนวนวิธีทั้งหมด",

  "ได้ทั้งหมดกี่",

  "ได้กี่",

  "ได้กี่แบบ",

  "ได้กี่วิธี",

  "เป็นอย่างไร",

  "คืออะไร",
];

function detectQuestionNumber(
  text: string
) {

  const trimmed =
    text.trim();

  /*
   * Case 1:
   *
   * 1. คำถาม
   * 1) คำถาม
   * 1 คำถาม
   */
  
  // below is actually match anywhere.
  const startMatch =
    trimmed.match(
      /(\d{1,3})\s*([.)]|\.\))\s+/
    );

  if (startMatch) {

    return {
      number:
        Number(startMatch[1]),

      position:
        "start" as const,
    };
  }

  /*
   * Case 2:
   *
   * คำถาม ... 1.
   */
  const endMatch =
    trimmed.match(
      /(?:^|\s)(\d{1,3})\s*[.)]?\s*$/
    );

  if (endMatch) {

    return {
      number:
        Number(endMatch[1]),

      position:
        "end" as const,
    };
  }

  return {
    number: null,

    position:
      null,
  };
}

function detectQuestionKeywords(
  text: string
): string[] {

  return QUESTION_KEYWORDS
    .filter(
      keyword =>
        text.includes(keyword)
    );
}

function calculateQuestionConfidence(
  text: string
): QuestionCandidate {

  const number =
    detectQuestionNumber(text);

  const keywords =
    detectQuestionKeywords(text);

  const numberAtStart =
    number.position === "start";

  const numberAtEnd =
    number.position === "end";

  /*
   * Basic scoring
   */

  let numberScore = 0;

  if (numberAtStart) {

    numberScore = 0.60;

  } else if (numberAtEnd) {

    numberScore = 0.45;
  }

  /*
   * Keyword score
   */

  let keywordScore = 0;

  if (keywords.length >= 2) {

    keywordScore = 0.40;

  } else if (
    keywords.length === 1
  ) {

    keywordScore = 0.30;
  }

  /*
   * Combine.
   *
   * Maximum is ~1.0
   */

  const confidence =
    Math.min(
      1,
      numberScore +
      keywordScore
    );

  let decision:
    QuestionCandidate["decision"];

  if (confidence >= 0.75) {

    decision = "question";

  } else if (confidence >= 0.40) {

    decision = "ambiguous";

  } else {

    decision = "not_question";
  }

  return {

    blockId: "",

    text,

    questionNumber:
      number.number,

    confidence,

    decision,

    features: {

      numberAtStart,

      numberAtEnd,

      numberAfterText:
        numberAtEnd,

      keywordMatches:
        keywords,

      keywordScore,

      numberScore,
    },
  };
}

export function detectQuestions(
  blocks: MarkdownBlock[]
): QuestionCandidate[] {

  return blocks.map(
    block => {

      const result =
        calculateQuestionConfidence(
          block.text
        );

      return {
        ...result,

        blockId:
          block.id,
      };
    }
  );
}