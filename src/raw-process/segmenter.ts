import {
    MarkdownBlock
} from "./types";
import {
    QuestionCandidate
} from "./qdetector";

export interface QuestionSegment {

  questionNumber: number;

  question: {
    blockId: string;
    text: string;
  };

  answer: {
    blockId: string | null;
    text: string | null;
  };

  segmentationConfidence: number;
}

export function segmentQuestions(
  blocks: MarkdownBlock[],
  candidates: QuestionCandidate[]
): QuestionSegment[] {

  const segments: QuestionSegment[] = [];

  for (const candidate of candidates) {

    if (
      candidate.decision !== "question"
    ) {
      continue;
    }

    const blockIndex =
      blocks.findIndex(
        block =>
          block.id === candidate.blockId
      );

    if (blockIndex === -1) {
      continue;
    }

    const block =
      blocks[blockIndex];

    const lines =
      block!.text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    /*
     * ---------------------------------------
     * First line = question
     * Following lines = answer
     * ---------------------------------------
     */

    const questionText =
      lines[0];

    const answerLines =
      lines.slice(1);

    const answerText =
      answerLines.length > 0
        ? answerLines.join("\n")
        : null;


    /*
     * ---------------------------------------
     * Confidence
     * ---------------------------------------
     */

    const segmentationConfidence =
      calculateSegmentationConfidence(
        candidate,
        answerText !== null
      );


    segments.push({

      questionNumber:
        candidate.questionNumber ?? 0,

      question: {

        blockId:
          candidate.blockId,

        text:
          questionText!,
      },

      answer: {

        blockId:
          answerText !== null
            ? candidate.blockId
            : null,

        text:
          answerText,
      },

      segmentationConfidence,
    });
  }

  return segments;
}

function calculateSegmentationConfidence(
  candidate: QuestionCandidate,
  hasAnswer: boolean
): number {

  let score =
    candidate.confidence;

  /*
   * We have an actual next block
   * that isn't another question.
   */
  if (hasAnswer) {

    score += 0.15;

  } else {

    score -= 0.10;
  }

  return Math.max(
    0,
    Math.min(
      1,
      score
    )
  );
}