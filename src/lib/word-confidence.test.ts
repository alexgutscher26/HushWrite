import { describe, it, expect } from "vitest";
import { computeWordConfidences, LOW_CONFIDENCE_THRESHOLD } from "./word-confidence";

describe("computeWordConfidences", () => {
  it("computes high confidence for identical raw and final text", () => {
    const text = "The quick brown fox jumps";
    const result = computeWordConfidences(text, text, "DELIVERED");

    expect(result).toHaveLength(5);
    for (const item of result) {
      expect(item.confidence).toBeGreaterThanOrEqual(LOW_CONFIDENCE_THRESHOLD);
      expect(item.isLowConfidence).toBe(false);
    }
  });

  it("marks substituted words with < 0.7 confidence (low confidence)", () => {
    const raw = "I use pie torch for machine learning";
    const final = "I use PyTorch for machine learning";
    const result = computeWordConfidences(final, raw, "DELIVERED");

    const pytorchWord = result.find((w) => w.word === "PyTorch");
    expect(pytorchWord).toBeDefined();
    expect(pytorchWord!.confidence).toBeLessThan(LOW_CONFIDENCE_THRESHOLD);
    expect(pytorchWord!.isLowConfidence).toBe(true);
  });

  it("marks repeated words as low confidence", () => {
    const text = "we should should test this";
    const result = computeWordConfidences(text, text, "DELIVERED");

    expect(result[2].word).toBe("should");
    expect(result[2].confidence).toBeLessThan(LOW_CONFIDENCE_THRESHOLD);
    expect(result[2].isLowConfidence).toBe(true);
  });

  it("marks words from failed sessions as low confidence", () => {
    const text = "incomplete sentence before crash";
    const result = computeWordConfidences(text, null, "FAILED");

    expect(result.every((w) => w.isLowConfidence)).toBe(true);
  });
});
