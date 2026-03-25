import { describe, it, expect } from "vitest";
import { parseExcalidrawContent } from "../utils/parseExcalidrawContent";

describe("parseExcalidrawContent()", () => {
  it("parses valid excalidraw JSON with elements and appState", () => {
    const input = JSON.stringify({
      elements: [{ id: "1", type: "rectangle" }],
      appState: { viewBackgroundColor: "#fff" },
    });
    const result = parseExcalidrawContent(input);
    expect("message" in result).toBe(false);
    expect((result as any).elements).toEqual([{ id: "1", type: "rectangle" }]);
    expect((result as any).appState).toEqual({ viewBackgroundColor: "#fff" });
  });

  it("returns error for invalid JSON", () => {
    const result = parseExcalidrawContent("not json {{{");
    expect("message" in result).toBe(true);
    expect((result as any).message).toContain("Invalid JSON");
  });

  it("returns error when content is a JSON primitive", () => {
    const result = parseExcalidrawContent('"just a string"');
    expect("message" in result).toBe(true);
    expect((result as any).message).toContain("not a valid JSON object");
  });

  it("returns error for null JSON", () => {
    const result = parseExcalidrawContent("null");
    expect("message" in result).toBe(true);
  });

  it("returns error when elements field is missing", () => {
    const input = JSON.stringify({ appState: {} });
    const result = parseExcalidrawContent(input);
    expect("message" in result).toBe(true);
    expect((result as any).message).toContain("elements");
  });

  it("returns error when appState field is missing", () => {
    const input = JSON.stringify({ elements: [] });
    const result = parseExcalidrawContent(input);
    expect("message" in result).toBe(true);
    expect((result as any).message).toContain("appState");
  });

  it("accepts empty elements array and minimal appState", () => {
    const input = JSON.stringify({ elements: [], appState: {} });
    const result = parseExcalidrawContent(input);
    expect("message" in result).toBe(false);
    expect((result as any).elements).toEqual([]);
  });
});
