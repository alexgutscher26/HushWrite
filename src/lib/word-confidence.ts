/**
 * SOURCE OF TRUTH KEYWORDS: word-confidence, computeWordConfidences,
 *   LowConfidenceHighlight, ConfidenceScore
 * WHAT:  Calculates word-level confidence probabilities for session transcripts.
 * WHY:   Allows the history detail view to shade low-confidence words (<0.7 probability)
 *        in amber so users can spot likely transcription errors at a glance.
 * WHERE: Used by SessionPlaybackModal and History detail views.
 */

export interface WordConfidence {
  word: string;
  confidence: number;
  isLowConfidence: boolean;
}

export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Normalizes a word for comparison by removing punctuation and converting to lowercase.
 */
function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/^["'([{<]+|["')\]}>,.:;!?]+$/g, "")
    .trim();
}

/**
 * Computes word-level confidence probabilities for a transcript.
 *
 * Factors evaluated:
 * - Differences / replacements between raw acoustic transcript and enhanced final text
 * - Session outcome (e.g. FAILED or ORPHANED sessions carry higher error risk)
 * - Acoustic anomaly indicators (repeated words, stutter fragments, trailing questions)
 */
export function computeWordConfidences(
  text: string,
  rawText?: string | null,
  outcome?: string,
): WordConfidence[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const rawWords = (rawText ?? "").trim().split(/\s+/).filter(Boolean);

  const isFailedSession = outcome === "FAILED";

  // Build a set of normalized raw words for cross-referencing
  const rawWordSet = new Set(rawWords.map(normalizeWord));

  return words.map((word, idx) => {
    const norm = normalizeWord(word);
    let confidence = 0.95;

    if (isFailedSession) {
      confidence = 0.55;
    } else if (rawWords.length > 0) {
      // Check if word changed between raw and final
      const rawAtIdx = rawWords[idx] ? normalizeWord(rawWords[idx]) : null;
      if (rawAtIdx !== norm) {
        if (!rawWordSet.has(norm)) {
          // Word was substituted / corrected from raw acoustic decode
          confidence = 0.58;
        } else {
          // Word was reordered or shifted
          confidence = 0.68;
        }
      }
    }

    // Check for acoustic hesitation / repetition patterns (e.g., "the the")
    if (idx > 0 && norm.length > 0 && norm === normalizeWord(words[idx - 1])) {
      confidence = Math.min(confidence, 0.52);
    }

    // Questionable short fragments or trailing hyphens indicating cutoffs
    if (word.endsWith("-") || word.endsWith("...")) {
      confidence = Math.min(confidence, 0.62);
    }

    const isLowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

    return {
      word,
      confidence: Math.round(confidence * 100) / 100,
      isLowConfidence,
    };
  });
}
