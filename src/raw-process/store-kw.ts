import fs from "node:fs/promises";
import path from "node:path";

/* =========================================================
   TYPES
========================================================= */

export type KeywordCategory =
  | "interrogative"
  | "instruction"
  | "quantity"
  | "comparison"
  | "explanation";


export interface QuestionKeyword {

  phrase: string;

  category: KeywordCategory;

  /*
   * How strongly this phrase indicates
   * that a text is a question.
   *
   * 0.0 - 1.0
   */
  weight: number;

  source:
    | "manual"
    | "ai";

  /*
   * AI-generated keywords should not
   * enter production until verified.
   */
  verified: boolean;
}

// ---------------------------------------------------------
// JSON file location
// ---------------------------------------------------------

const KEYWORDS_FILE =
  path.join(
    process.cwd(),
    "src",
    "raw-process",
    "question-keywords.json"
  );


// ---------------------------------------------------------
// Load
// ---------------------------------------------------------

export async function loadKeywords():
  Promise<QuestionKeyword[]> {

  try {

    const raw =
      await fs.readFile(
        KEYWORDS_FILE,
        "utf-8"
      );

    const data =
      JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error(
        "Keyword JSON must contain an array"
      );
    }

    return data;

  } catch (error: any) {

    /*
     * If the file doesn't exist,
     * create an empty database.
     */

    if (error.code === "ENOENT") {

      await saveKeywords([]);

      return [];
    }

    throw error;
  }
}


// ---------------------------------------------------------
// Save
// ---------------------------------------------------------

export async function saveKeywords(
  keywords: QuestionKeyword[]
): Promise<void> {

  await fs.mkdir(
    path.dirname(KEYWORDS_FILE),
    {
      recursive: true
    }
  );

  await fs.writeFile(

    KEYWORDS_FILE,

    JSON.stringify(
      keywords,
      null,
      2
    ),

    "utf-8"
  );
}

// export async function addKeyword(
//   keyword: QuestionKeyword
// ): Promise<QuestionKeyword> {

//   const keywords =
//     await loadKeywords();


//   // -----------------------------------------
//   // Prevent duplicates
//   // -----------------------------------------

//   const existing =
//     keywords.find(
//       item =>
//         normalize(item.phrase) ===
//         normalize(keyword.phrase)
//     );


//   if (existing) {

//     return existing;
//   }


//   keywords.push(keyword);


//   await saveKeywords(
//     keywords
//   );


//   return keyword;
// }

// function normalize(
//   text: string
// ): string {

//   return text
//     .replace(/\s+/g, " ")
//     .trim()
//     .toLowerCase();
// }

// export async function addKeywords(
//   newKeywords: QuestionKeyword[]
// ): Promise<QuestionKeyword[]> {

//   const keywords =
//     await loadKeywords();


//   const added: QuestionKeyword[] = [];


//   for (const keyword of newKeywords) {

//     const exists =
//       keywords.some(
//         existing =>
//           normalize(existing.phrase) ===
//           normalize(keyword.phrase)
//       );


//     if (exists) {
//       continue;
//     }


//     keywords.push(keyword);

//     added.push(keyword);
//   }


//   if (added.length > 0) {

//     await saveKeywords(
//       keywords
//     );
//   }


//   return added;
// }