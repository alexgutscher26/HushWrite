import { describe, it, expect } from "bun:test";
import { detectWordReplacements, tokenizeWords } from "./diff-alignment";

describe("diff-alignment", () => {
  it("tokenizes words correctly", () => {
    expect(tokenizeWords("hello world  test")).toEqual(["hello", "world", "test"]);
  });

  it("detects single word replacement", () => {
    const res = detectWordReplacements("I like pie torch a lot", "I like PyTorch a lot");
    expect(res).toHaveLength(1);
    expect(res[0].pattern).toBe("pie torch");
    expect(res[0].replacement).toBe("PyTorch");
  });

  it("detects phrase replacement with punctuation", () => {
    const res = detectWordReplacements(
      "Let's deploy on cube netties.",
      "Let's deploy on Kubernetes.",
    );
    expect(res).toHaveLength(1);
    expect(res[0].pattern).toBe("cube netties");
    expect(res[0].replacement).toBe("Kubernetes");
  });

  it("detects hush right to HushWrite", () => {
    const res = detectWordReplacements("Welcome to hush right today", "Welcome to HushWrite today");
    expect(res).toHaveLength(1);
    expect(res[0].pattern).toBe("hush right");
    expect(res[0].replacement).toBe("HushWrite");
  });

  it("returns empty array when text is identical or empty", () => {
    expect(detectWordReplacements("", "")).toEqual([]);
    expect(detectWordReplacements("Same text", "Same text")).toEqual([]);
    expect(detectWordReplacements("Hello", "Hello")).toEqual([]);
  });
});
