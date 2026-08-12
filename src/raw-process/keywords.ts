import { GoogleGenAI } from "@google/genai";
import { QuestionKeyword, KeywordCategory, loadKeywords, saveKeywords } from "./store-kw";
import "dotenv/config";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});


/* =========================================================
   DETECTION
========================================================= */

export interface KeywordDetectionResult {

  score: number;

  matches: QuestionKeyword[];

}


export async function detectQuestionKeywords(
  text: string,
): Promise<KeywordDetectionResult> {

  const keywords = await loadKeywords();

  const normalized =
    normalizeText(text);


  const matches =
    keywords.filter(keyword =>
      normalized.includes(
        normalizeText(keyword.phrase)
      )
    );


  /*
   * Sum keyword weights.
   *
   * Example:
   *
   * "เหตุใด ... ได้ทั้งหมดกี่"
   *
   * = 0.35 + 0.40
   *
   * but never exceed 1.
   */

  const rawScore =
    matches.reduce(
      (sum, keyword) =>
        sum + keyword.weight,
      0
    );


  return {

    score:
      Math.min(
        rawScore,
        1
      ),

    matches,
  };
}


/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(
  text: string
): string {

  return text
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
   AI KEYWORD DISCOVERY
========================================================= */

export interface KeywordDiscoveryExample {

  text: string;

  isQuestion: boolean;

}


export interface AIKeywordCandidate {

  phrase: string;

  category: KeywordCategory;

  suggestedWeight: number;

  reason: string;

}

/* =========================================================
   JSON SCHEMA
========================================================= */

const keywordDiscoverySchema = {

  type: "object",

  properties: {

    keywords: {

      type: "array",

      items: {

        type: "object",

        properties: {

          phrase: {
            type: "string",
            description:
              "A Thai word or phrase that can help identify question text."
          },

          category: {
            type: "string",

            enum: [
              "interrogative",
              "instruction",
              "quantity",
              "comparison",
              "explanation"
            ]
          },

          suggestedWeight: {
            type: "number",
            description:
              "How strongly this phrase indicates question text. Value between 0 and 1."
          },

          reason: {
            type: "string",
            description:
              "Why this phrase is useful for detecting questions."
          }

        },

        required: [
          "phrase",
          "category",
          "suggestedWeight",
          "reason"
        ]
      }
    }

  },

  required: [
    "keywords"
  ]
};


/*
 * AI does NOT modify QUESTION_KEYWORDS.
 *
 * It only returns suggestions.
 */


export async function expandQuestionKeywords(
  examples: KeywordDiscoveryExample[]
): Promise<AIKeywordCandidate[]> {

  const prompt = `
You are helping build a rule-based
Thai question detector for educational worksheets.

Analyze the examples below.

Find Thai words or phrases that are useful
for identifying QUESTION TEXT.

IMPORTANT:

1. Only suggest phrases supported by the examples.
2. Prefer phrases strongly associated with questions.
3. Do NOT suggest generic words such as:
   "เป็น", "มี", "คือ", "ของ", "ใน".
4. Do NOT generate regex.
5. Do NOT classify the examples.
6. Do NOT suggest answer-specific phrases.
7. Return JSON only.

Categories:

- interrogative
- instruction
- quantity
- comparison
- explanation

Examples:

${JSON.stringify(
  examples,
  null,
  2
)}
`;


  const response =
    await ai.interactions.create({

      model:
        "gemini-3.6-flash",

      input:
        prompt,
    
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: keywordDiscoverySchema
      }
    });


  const parsed =
    JSON.parse(
      response.output_text ?? "{}"
    );


  return parsed.keywords ?? [];
}

export async function addAIKeywordCandidates(
  candidates: AIKeywordCandidate[]
): Promise<{ added: QuestionKeyword[], keywords: QuestionKeyword[] }> {

  const keywords = await loadKeywords();
  const added: QuestionKeyword[] = [];

  for (const candidate of candidates) {

    const phrase =
      candidate.phrase.trim();

    if (!phrase) {
      continue;
    }

    // ป้องกัน keyword ซ้ำ
    const alreadyExists =
      keywords.some(
        keyword =>
          keyword.phrase === phrase
      );

    if (alreadyExists) {
      continue;
    }

    const keyword: QuestionKeyword = {

      phrase,

      category:
        candidate.category,

      weight:
        Math.max(
          0,
          Math.min(
            candidate.suggestedWeight,
            1
          )
        ),

      source:
        "ai",

      // สำคัญมาก:
      // AI-generated keyword ยังไม่อนุญาต
      // ให้ production detector ใช้
      verified:
        false,
    };


    keywords.push(
      keyword
    );

    added.push(
      keyword
    );
  }

  return { added, keywords };
}

type ExampleQuestions = {
    text: string,
    isQuestion: boolean
}

export async function updateKeywordDatabase(examples: ExampleQuestions[]) {
    // -----------------------------
  // 1. Ask AI to discover keywords
  // -----------------------------

  const candidates =
    await expandQuestionKeywords(
      examples
    );


  console.log(
    "AI candidates:",
    candidates
  );


  // -----------------------------
  // 2. Add to keyword database
  // -----------------------------

  let expanded =
    await addAIKeywordCandidates(
      candidates
    );


  console.log(
    "Added:",
    expanded.added
  );

  // verify everything for now.
  expanded.keywords = expanded.keywords.map(k => ({...k, verified: true}));
  await saveKeywords(expanded.keywords);
}

export async function verifyKeyword(
  phrase: string
): Promise<boolean> {

  const keywords =
    await loadKeywords();
  const keyword =
    keywords.find(
      keyword =>
        keyword.phrase === phrase
    );


  if (!keyword) {
    return false;
  }


  keyword.verified = true;

  return true;
}