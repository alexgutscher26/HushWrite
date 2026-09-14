/**
 * SOURCE OF TRUTH KEYWORDS: detectWordReplacements, DiffAlignment, WordPair
 * WHAT:  Calculates word-level differences between an original transcription and an edited version.
 * WHY:   Allows Murmur to extract minimal (misheard pattern -> corrected replacement) pairs
 *        so users can learn custom vocabulary from edits in 1-click.
 * WHERE: Used by Pill overlay, Session Feedback, and Dictionary learning.
 */

export interface WordReplacementCandidate {
  pattern: string;
  replacement: string;
  confidence: number;
}

/**
 * Normalizes text for token comparison, stripping leading/trailing punctuation
 * while preserving internal dashes, underscores, or capitalization.
 */
export function tokenizeWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Detects word-level or short phrase-level replacements between original and edited text.
 * E.g.: "I like pie torch and cube netties" -> "I like PyTorch and Kubernetes"
 * returns:
 * [
 *   { pattern: "pie torch", replacement: "PyTorch", confidence: 0.95 }
 * ]
 */
export function detectWordReplacements(
  originalText: string,
  editedText: string,
): WordReplacementCandidate[] {
  if (!originalText || !editedText || originalText.trim() === editedText.trim()) {
    return [];
  }

  const origWords = tokenizeWords(originalText);
  const editWords = tokenizeWords(editedText);

  // Find longest common prefix
  let prefixLen = 0;
  while (
    prefixLen < origWords.length &&
    prefixLen < editWords.length &&
    origWords[prefixLen].toLowerCase() === editWords[prefixLen].toLowerCase()
  ) {
    prefixLen++;
  }

  // Find longest common suffix
  let origSuffix = origWords.length - 1;
  let editSuffix = editWords.length - 1;
  while (
    origSuffix >= prefixLen &&
    editSuffix >= prefixLen &&
    origWords[origSuffix].toLowerCase() === editWords[editSuffix].toLowerCase()
  ) {
    origSuffix--;
    editSuffix--;
  }

  const mismatchedOrig = origWords.slice(prefixLen, origSuffix + 1);
  const mismatchedEdit = editWords.slice(prefixLen, editSuffix + 1);

  if (mismatchedOrig.length === 0 || mismatchedEdit.length === 0) {
    return [];
  }

  // Limit to reasonable phrase length replacements (<= 5 words) to avoid catching whole sentence rewrites
  if (mismatchedOrig.length > 5 || mismatchedEdit.length > 5) {
    return [];
  }

  const rawPattern = mismatchedOrig.join(" ");
  const rawReplacement = mismatchedEdit.join(" ");

  const cleanPattern = rawPattern.replace(/^["'([{<]+|["')\]}>,.:;!?]+$/g, "").trim();
  const cleanReplacement = rawReplacement.replace(/^["'([{<]+|["')\]}>,.:;!?]+$/g, "").trim();

  if (
    !cleanPattern ||
    !cleanReplacement ||
    cleanPattern.toLowerCase() === cleanReplacement.toLowerCase()
  ) {
    return [];
  }

  return [
    {
      pattern: cleanPattern,
      replacement: cleanReplacement,
      confidence: 0.9,
    },
  ];
}
