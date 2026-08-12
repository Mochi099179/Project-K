export interface SegmentationConfidenceInput {
  questionCandidate: number;
  numberSequence: number;
  answerMarker: number;
  context: number;
}

export function calculateSegmentationConfidence(
  input: SegmentationConfidenceInput
): number {

  const score =
    input.questionCandidate * 0.40 +
    input.numberSequence * 0.20 +
    input.answerMarker * 0.20 +
    input.context * 0.20;

  return round(
    clamp(score)
  );
}

export function clamp(
  value: number
): number {

  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

export function round(
  value: number
): number {

  return Math.round(
    value * 1000
  ) / 1000;
}