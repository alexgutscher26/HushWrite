/**
 * SOURCE OF TRUTH KEYWORDS: wordDiff, DiffToken, word-level diff
 * WHAT:  A word-level diff between two strings, as an ordered token list the
 *        caller renders in place.
 * WHY:   The rule preview sandbox shows what each enhancement rule changed, and
 *        a bare before/after pair makes a one-word edit read as a rewrite.
 *        Tokenising on whitespace runs (keeping them as tokens) means the
 *        rendered text re-joins to the input exactly, so the diff can be shown
 *        as the AFTER text with the changes marked, rather than as two columns.
 *        Common-prefix/suffix trimming keeps the comparison linear on the part
 *        that actually differs, which keeps a large paste responsive on every
 *        keystroke of the sandbox.
 * WHERE: Consumed by the RulePreviewSandbox diff view; re-exported from
 *        src/lib/index.ts.
 */

export interface DiffToken {
  text: string;
  kind: "same" | "added" | "removed";
}

/**
 * WHAT:  Splits text into word and whitespace tokens, preserving the exact
 *        join so `tokens.map(t => t.text).join("")` reconstructs the input.
 * WHY:   Splitting on `/\s+/` would lose the separator style; keeping
 *        whitespace as its own tokens means newlines produced by spoken
 *        commands render faithfully in the diff.
 */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

function isWhitespace(token: string): boolean {
  return /^\s+$/.test(token);
}

/**
 * WHAT:  The word-level diff of `before` into `after`.
 * WHY:   Whitespace tokens anchor the alignment: words that moved across
 *        whitespace still pair up, and the trim of the common head and tail
 *        means identical opening and closing sentences cost O(1) instead of
 *        dominating the table. Equal-length segments pair word-for-word; a
 *        length change inside the differing span renders as removals followed
 *        by additions, which is the honest shape of an edit.
 * WHERE: Called once per rule step by the preview sandbox.
 */
export function wordDiff(before: string, after: string): DiffToken[] {
  const a = tokenize(before);
  const b = tokenize(after);

  // Trim the common head and tail so the table only covers the change.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start += 1;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const head: DiffToken[] = a.slice(0, start).map((text) => ({ text, kind: "same" }));
  const tail: DiffToken[] = a.slice(endA).map((text) => ({ text, kind: "same" }));

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  // Collapse a whitespace-only difference to "same": a run of spaces rendered
  // as an edit is noise, not information.
  const midMeaningful = (tokens: string[]) => tokens.some((t) => !isWhitespace(t));

  const middle: DiffToken[] = [];
  if (!midMeaningful(midA) && !midMeaningful(midB)) {
    // Only whitespace differs between the two spans; prefer the AFTER shape so
    // the diff shows the text as it now is.
    const shared = Math.min(midA.length, midB.length);
    for (let i = 0; i < shared; i += 1) {
      middle.push({ text: midB[i], kind: "same" });
    }
    for (let i = shared; i < midB.length; i += 1) {
      middle.push({ text: midB[i], kind: "added" });
    }
  } else {
    const shared = Math.min(midA.length, midB.length);
    for (let i = 0; i < shared; i += 1) {
      if (midA[i] === midB[i]) {
        middle.push({ text: midB[i], kind: "same" });
      } else {
        // Whitespace itself never renders as a change inside a word edit.
        if (!isWhitespace(midA[i])) {
          middle.push({ text: midA[i], kind: "removed" });
        }
        if (!isWhitespace(midB[i])) {
          middle.push({ text: midB[i], kind: "added" });
        }
      }
    }
    for (let i = shared; i < midA.length; i += 1) {
      if (!isWhitespace(midA[i])) middle.push({ text: midA[i], kind: "removed" });
    }
    for (let i = shared; i < midB.length; i += 1) {
      if (!isWhitespace(midB[i])) middle.push({ text: midB[i], kind: "added" });
    }
  }

  return [...head, ...middle, ...tail];
}
