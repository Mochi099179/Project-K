// markdownToJson.ts

export interface OCRInput {
  markdown: string;

  // Overall confidence returned by OCR, e.g. 47
  pageConfidence?: number;
}

export interface OCRLine {
  index: number;
  text: string;
}

export interface QuestionSegment {
  id: string;

  questionNumber: number;

  question: {
    text: string;
    confidence: number;
  };

  answer: {
    text: string;
    confidence: number;
  };

  segmentationConfidence: number;

  metadata: {
    questionStartLine: number;
    answerStartLine: number | null;
    endLine: number;
  };
}

export interface ParsedDocument {
  pageConfidence: number | null;

  segments: QuestionSegment[];

  unsegmented: {
    text: string;
    lines: number[];
  };
}

/* =========================================================
   1. Normalize Markdown
========================================================= */

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/* =========================================================
   2. Convert Markdown → Lines
========================================================= */

function parseLines(markdown: string): OCRLine[] {
  return normalizeMarkdown(markdown)
    .split("\n")
    .map((text, index) => ({
      index,
      text: cleanLine(text),
    }))
    .filter(line => line.text.length > 0);
}

function cleanLine(text: string): string {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*(.*?)\*\*$/, "$1")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\\\.\s*/, match =>
      match.replace("\\.", ".")
    )
    .trim();
}

/* =========================================================
   3. Detect Question Anchor
========================================================= */

interface QuestionCandidate {
  number: number;
  confidence: number;
}

/**
 * Detect:
 *
 * 1. question
 * 2. question
 * 10. question
 *
 * But don't blindly assume every "1." is a question.
 */
function detectQuestionAnchor(
  line: string
): QuestionCandidate | null {

  const match = line.match(
    /^(\d{1,3})\.\s+(.+)/
  );

  if (!match) {
    return null;
  }

  const number = Number(match[1]);
  const content = match[2]?.trim();

  if (!content) {
    return null;
  }

  let confidence = 0.45;

  // Longer text is more likely to be an actual question
  if (content.length >= 20) {
    confidence += 0.15;
  }

  // Common Thai question language
  const questionWords = [
    "อะไร",
    "อย่างไร",
    "ทำไม",
    "เหตุใด",
    "เพราะเหตุใด",
    "ใดบ้าง",
    "กี่",
    "เท่าไร",
    "เท่าใด",
    "จง",
    "ได้กี่",
    "มีทั้งหมด"
  ];

  if (
    questionWords.some(word =>
      content.includes(word)
    )
  ) {
    confidence += 0.20;
  }

  // "วิธีทำ" etc. is unlikely to be a question
  if (
    content.startsWith("วิธีทำ") ||
    content.startsWith("วิธีคิด")
  ) {
    confidence -= 0.30;
  }

  return {
    number,
    confidence: clamp(confidence),
  };
}

/* =========================================================
   4. Detect Answer Marker
========================================================= */

function isAnswerMarker(line: string): boolean {
  const markers = [
    "วิธีทำ",
    "วิธีคิด",
    "คำตอบ",
    "ตอบ",
    "เฉลย"
  ];

  return markers.some(marker =>
    line.startsWith(marker)
  );
}

/* =========================================================
   5. Question / Answer scoring
========================================================= */

function questionStartScore(
  current: QuestionCandidate,
  previousQuestionNumber: number | null
): number {

  let score = current.confidence;

  // Sequential numbering is strong evidence
  if (
    previousQuestionNumber !== null &&
    current.number === previousQuestionNumber + 1
  ) {
    score += 0.25;
  }

  // If numbering jumps, reduce confidence
  if (
    previousQuestionNumber !== null &&
    current.number > previousQuestionNumber + 1
  ) {
    score -= 0.10;
  }

  return clamp(score);
}

/* =========================================================
   6. Segmentation
========================================================= */

export function markdownToJson(
  input: OCRInput
): ParsedDocument {

  const lines = parseLines(input.markdown);

  const segments: QuestionSegment[] = [];

  const unsegmentedLines: number[] = [];

  let currentQuestion: {
    number: number;
    startIndex: number;
    questionLines: OCRLine[];
    answerLines: OCRLine[];
    answerStarted: boolean;
    anchorConfidence: number;
  } | null = null;

  let previousQuestionNumber: number | null = null;

  for (const line of lines) {

    const candidate =
      detectQuestionAnchor(line.text);

    /*
     * -----------------------------------------------------
     * Is this a new question?
     * -----------------------------------------------------
     */

    if (candidate) {

      const confidence =
        questionStartScore(
          candidate,
          previousQuestionNumber
        );

      /*
       * Only treat it as a new question when confidence
       * passes threshold.
       */
      if (confidence >= 0.65) {

        // Finish previous question
        if (currentQuestion) {

          segments.push(
            finalizeSegment(
              currentQuestion,
              lines,
              line.index - 1
            )
          );
        }

        currentQuestion = {
          number: candidate.number,
          startIndex: line.index,
          questionLines: [line],
          answerLines: [],
          answerStarted: false,
          anchorConfidence: confidence,
        };

        previousQuestionNumber =
          candidate.number;

        continue;
      }
    }

    /*
     * -----------------------------------------------------
     * Before first question
     * -----------------------------------------------------
     */

    if (!currentQuestion) {
      unsegmentedLines.push(line.index);
      continue;
    }

    /*
     * -----------------------------------------------------
     * Answer marker
     * -----------------------------------------------------
     */

    if (isAnswerMarker(line.text)) {

      currentQuestion.answerStarted = true;

      currentQuestion.answerLines.push(line);

      continue;
    }

    /*
     * -----------------------------------------------------
     * Everything after question:
     *
     * before answer marker → question
     * after answer marker  → answer
     * -----------------------------------------------------
     */

    if (!currentQuestion.answerStarted) {
      currentQuestion.questionLines.push(line);
    } else {
      currentQuestion.answerLines.push(line);
    }
  }

  /*
   * Finish final question
   */

  if (currentQuestion) {
    segments.push(
      finalizeSegment(
        currentQuestion,
        lines,
        lines.length - 1
      )
    );
  }

  return {
    pageConfidence:
      input.pageConfidence ?? null,

    segments,

    unsegmented: {
      text: unsegmentedLines
        .map(index =>
          lines.find(l => l.index === index)?.text ?? ""
        )
        .join("\n"),

      lines: unsegmentedLines,
    },
  };
}

/* =========================================================
   7. Finalize Segment
========================================================= */

function finalizeSegment(
  current: {
    number: number;
    startIndex: number;
    questionLines: OCRLine[];
    answerLines: OCRLine[];
    answerStarted: boolean;
    anchorConfidence: number;
  },
  lines: OCRLine[],
  endIndex: number
): QuestionSegment {

  const questionText =
    current.questionLines
      .map(line => line.text)
      .join("\n");

  const answerText =
    current.answerLines
      .map(line => line.text)
      .join("\n");

  /*
   * Question confidence
   */
  let questionConfidence =
    current.anchorConfidence;

  /*
   * If we actually found an answer marker,
   * confidence goes up.
   */
  if (current.answerStarted) {
    questionConfidence += 0.05;
  }

  /*
   * If question text is extremely long,
   * segmentation becomes slightly less certain.
   */
  if (questionText.length > 500) {
    questionConfidence -= 0.05;
  }

  questionConfidence =
    clamp(questionConfidence);

  /*
   * Answer confidence
   *
   * If there is an explicit answer marker,
   * confidence is high.
   *
   * If there is no answer at all,
   * that's not necessarily an error.
   */
  let answerConfidence = 0.70;

  if (current.answerStarted) {
    answerConfidence = 0.90;
  }

  if (answerText.length === 0) {
    answerConfidence = 0.85;
  }

  /*
   * Overall segmentation confidence
   */
  const segmentationConfidence =
    clamp(
      questionConfidence * 0.65 +
      answerConfidence * 0.35
    );

  return {
    id:
      `q_${String(current.number).padStart(3, "0")}`,

    questionNumber:
      current.number,

    question: {
      text: questionText,
      confidence:
        round(questionConfidence),
    },

    answer: {
      text: answerText,
      confidence:
        round(answerConfidence),
    },

    segmentationConfidence:
      round(segmentationConfidence),

    metadata: {
      questionStartLine:
        current.startIndex,

      answerStartLine:
        current.answerStarted &&
        current.answerLines.length > 0
          ? current.answerLines[0]!.index
          : null,

      endLine:
        endIndex,
    },
  };
}

/* =========================================================
   Helpers
========================================================= */

function clamp(value: number): number {
  return Math.max(
    0,
    Math.min(1, value)
  );
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}