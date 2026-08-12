import {
  detectQuestionKeywords,
} from "./keywords";

import {
    QuestionKeyword
} from "./store-kw"

import {
  MarkdownBlock,
} from "./types";


export interface QuestionCandidate {

  blockId: string;

  questionText: string;

  answerText: string;

  score: number;

  keywordMatches:
    QuestionKeyword[];

}


export async function detectQuestionCandidate(
  block: MarkdownBlock
): Promise<QuestionCandidate | null> {

  console.log(block)
  const lines =
    block.text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);


  if (
    lines.length === 0
  ) {
    return null;
  }


  /*
   * Basic assumption:
   *
   * line 0 = question
   * line 1+ = answer
   *
   * This is exactly the format
   * we're currently targeting.
   */

  const questionText =
    lines[0]!;


  const answerText =
    lines
      .slice(1)
      .join("\n");


  const detection =
    await detectQuestionKeywords(
      questionText
    );


  /*
   * Basic threshold.
   *
   * Tune this using real OCR data.
   */

  const isQuestion =
    detection.score >= 0.25;


  if (!isQuestion) {
    return null;
  }


  return {

    blockId:
      block.id,

    questionText,

    answerText,

    score:
      detection.score,

    keywordMatches:
      detection.matches,
  };
}