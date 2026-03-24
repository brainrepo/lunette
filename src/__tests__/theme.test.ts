import { describe, it, expect } from "vitest";
import { card, glow, CYAN, PINK, BG, FONT_MONO, FONT_SANS } from "../theme";

describe("theme", () => {
  describe("constants", () => {
    it("exports color tokens", () => {
      expect(CYAN).toBe("#38b6f0");
      expect(PINK).toBe("#d24078");
    });

    it("exports background color", () => {
      expect(BG).toBe("rgb(10, 12, 22)");
    });

    it("exports font stacks", () => {
      expect(FONT_MONO).toContain("JetBrains Mono");
      expect(FONT_SANS).toContain("Inter");
    });
  });

  describe("card()", () => {
    it("returns CSSProperties with padding and border radius", () => {
      const result = card("#ff0000");
      expect(result.padding).toBe("32px");
      expect(result.borderRadius).toBe(16);
    });

    it("uses the color for border and background with alpha suffixes", () => {
      const result = card("#ff0000");
      expect(result.border).toBe("1.5px solid #ff000025");
      expect(result.backgroundColor).toBe("#ff000008");
    });

    it("works with different color values", () => {
      const result = card(CYAN);
      expect(result.border).toContain(CYAN);
      expect(result.backgroundColor).toContain(CYAN);
    });
  });

  describe("glow()", () => {
    it("returns absolute positioning with negative inset", () => {
      const result = glow("#ff0000", 20);
      expect(result.position).toBe("absolute");
      expect(result.inset).toBe(-20);
    });

    it("calculates borderRadius as size + 16", () => {
      expect(glow("#ff0000", 20).borderRadius).toBe(36);
      expect(glow("#ff0000", 10).borderRadius).toBe(26);
    });

    it("sets blur filter based on size", () => {
      expect(glow("#ff0000", 30).filter).toBe("blur(30px)");
    });

    it("defaults size to 20", () => {
      const result = glow("#ff0000");
      expect(result.inset).toBe(-20);
      expect(result.filter).toBe("blur(20px)");
      expect(result.borderRadius).toBe(36);
    });

    it("is non-interactive (pointerEvents none, zIndex -1)", () => {
      const result = glow("#ff0000");
      expect(result.pointerEvents).toBe("none");
      expect(result.zIndex).toBe(-1);
    });
  });
});
