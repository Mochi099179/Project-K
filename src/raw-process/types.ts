export interface OCRInput {
  markdown: string;
  pageConfidence?: number;
}

export interface MarkdownBlock {
  id: string;

  type:
    | "heading"
    | "paragraph"
    | "listItem"
    | "blockquote"
    | "code"
    | "thematicBreak"
    | "unknown";

  text: string;

  /**
   * Original Markdown corresponding to this AST node.
   */
  raw: string;

  ordered?: boolean;
  listNumber?: number;

  startLine: number;
  endLine: number;

  startOffset: number | null;
  endOffset: number | null;
}

export interface OCRLine {
  index: number;
  text: string;

  sourceBlockId: string;
  sourceLine: number;
}

export type CandidateDecision =
  | "candidate"
  | "not_candidate";


export interface CandidateFeatures {

  // Structure
  structureScore: number;

  isOrderedList: boolean;

  hasQuestionNumber: boolean;

  // Linguistic
  linguisticScore: number;

  strongMatches: string[];

  mediumMatches: string[];

  // Context
  contextScore: number;

  previousWasQuestion: boolean;

  nextLooksLikeAnswer: boolean;

  numberSequence: boolean;
}


export interface QuestionCandidate {

  blockId: string;

  text: string;

  questionNumber:
    | number
    | null;

  confidence: number;

  decision:
    | CandidateDecision;

  features: CandidateFeatures;
}

// export interface QuestionCandidate {
//   blockId: string;

//   questionNumber: number | null;

//   text: string;

//   score: number;

//   decision:
//     | "question"
//     | "not_question"
//     | "ambiguous";

//   features: {
//     orderedList: boolean;

//     sequenceScore: number;

//     questionLanguageScore: number;

//     answerContextScore: number;

//     structuralScore: number;

//     contentScore: number;
//   };

//   reasons: string[];
// }

export interface QuestionSegment {
  id: string;

  questionNumber: number;

  question: {
    text: string;
    confidence: number;
    lines: number[];
  };

  answer: {
    text: string;
    confidence: number;
    lines: number[];
    detected: boolean;
  };

  segmentationConfidence: number;

  confidenceBreakdown: {
    questionCandidate: number;
    numberSequence: number;
    answerMarker: number;
    context: number;
  };

  metadata: {
    questionStartLine: number;
    answerStartLine: number | null;
    endLine: number;
  };
}

export interface ParsedDocument {
  pageConfidence: number | null;

  blocks: MarkdownBlock[];

  lines: OCRLine[];

  candidates: QuestionCandidate[];

  segments: QuestionSegment[];
}