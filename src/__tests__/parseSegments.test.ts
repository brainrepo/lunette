import { describe, it, expect } from "vitest";
import { parseSegments } from "../components/LatexViewer";

describe("parseSegments()", () => {
  it("returns plain text as a single text segment", () => {
    const result = parseSegments("Hello world");
    expect(result).toEqual([{ type: "text", value: "Hello world" }]);
  });

  it("parses inline math with $...$", () => {
    const result = parseSegments("The formula $x^2$ is nice");
    expect(result).toEqual([
      { type: "text", value: "The formula " },
      { type: "inline", math: "x^2" },
      { type: "text", value: " is nice" },
    ]);
  });

  it("parses inline math with \\(...\\)", () => {
    const result = parseSegments("Value \\(a+b\\) here");
    expect(result).toEqual([
      { type: "text", value: "Value " },
      { type: "inline", math: "a+b" },
      { type: "text", value: " here" },
    ]);
  });

  it("parses display math with $$...$$", () => {
    const result = parseSegments("Before $$E=mc^2$$ after");
    expect(result).toEqual([
      { type: "text", value: "Before " },
      { type: "display", math: "E=mc^2" },
      { type: "text", value: " after" },
    ]);
  });

  it("parses display math with \\[...\\]", () => {
    const result = parseSegments("See \\[\\sum_{i=1}^{n} i\\] below");
    expect(result).toEqual([
      { type: "text", value: "See " },
      { type: "display", math: "\\sum_{i=1}^{n} i" },
      { type: "text", value: " below" },
    ]);
  });

  it("handles multiple mixed segments", () => {
    const result = parseSegments("Text $a$ more $$b$$ end");
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ type: "text", value: "Text " });
    expect(result[1]).toEqual({ type: "inline", math: "a" });
    expect(result[2]).toEqual({ type: "text", value: " more " });
    expect(result[3]).toEqual({ type: "display", math: "b" });
    expect(result[4]).toEqual({ type: "text", value: " end" });
  });

  it("strips LaTeX preamble and extracts document body", () => {
    const input = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
Hello $x$
\\end{document}`;
    const result = parseSegments(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "text", value: "\nHello " });
    expect(result[1]).toEqual({ type: "inline", math: "x" });
    expect(result[2]).toEqual({ type: "text", value: "\n" });
  });

  it("returns empty array for empty input", () => {
    const result = parseSegments("");
    expect(result).toEqual([]);
  });

  it("handles content that is only math", () => {
    const result = parseSegments("$$x$$");
    expect(result).toEqual([{ type: "display", math: "x" }]);
  });
});
