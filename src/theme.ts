// ─── Lunette Design Tokens ───────────────────────────────────────────
// Adapted from talk/videos cinematic dark theme

// ─── Colors ──────────────────────────────────────────────────────────

export const CYAN = "#38b6f0";
export const PINK = "#d24078";
export const PURPLE = "#8050c0";
export const GREEN = "#40b870";

// White / transparency scale
export const WHITE_90 = "rgba(255, 255, 255, 0.9)";
export const WHITE_60 = "rgba(255, 255, 255, 0.6)";
export const WHITE_35 = "rgba(255, 255, 255, 0.35)";
export const WHITE_20 = "rgba(255, 255, 255, 0.2)";
export const WHITE_10 = "rgba(255, 255, 255, 0.1)";
export const WHITE_06 = "rgba(255, 255, 255, 0.06)";

// Background
export const BG = "rgb(10, 12, 22)";

// Studio lighting overlays (pink left, blue right)
export const GRADIENT_OVERLAY = [
  "radial-gradient(ellipse at 0% 30%, rgba(180, 50, 100, 0.10) 0%, transparent 50%)",
  "radial-gradient(ellipse at 100% 70%, rgba(40, 100, 200, 0.10) 0%, transparent 50%)",
].join(", ");

// ─── Typography ──────────────────────────────────────────────────────

export const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
export const FONT_SANS = "'Inter', 'Helvetica Neue', system-ui, sans-serif";

// ─── Shared Styles ───────────────────────────────────────────────────

import type { CSSProperties } from "react";

export const baseContainer: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundColor: BG,
  color: WHITE_90,
  fontFamily: FONT_SANS,
  position: "relative",
  overflow: "hidden",
};

export const gradientOverlay: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: GRADIENT_OVERLAY,
  pointerEvents: "none",
  zIndex: 0,
};

export const toolbar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "10px 16px",
  borderBottom: `1px solid ${WHITE_10}`,
  backgroundColor: "rgba(10, 12, 22, 0.8)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  position: "relative",
  zIndex: 10,
};

export const toolbarButton: CSSProperties = {
  padding: "6px 14px",
  backgroundColor: `${CYAN}10`,
  color: WHITE_60,
  border: `1px solid ${CYAN}20`,
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "0.8rem",
  fontFamily: FONT_MONO,
  letterSpacing: "0.02em",
  transition: "all 0.2s ease",
};

export const toolbarButtonActive: CSSProperties = {
  backgroundColor: `${GREEN}18`,
  borderColor: `${GREEN}40`,
  color: GREEN,
};

export const contentArea: CSSProperties = {
  flex: 1,
  position: "relative",
  zIndex: 1,
  overflow: "auto",
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Tinted card: low-opacity color fill + subtle border */
export function card(color: string): CSSProperties {
  return {
    padding: "32px",
    borderRadius: 16,
    border: `1.5px solid ${color}25`,
    backgroundColor: `${color}08`,
  };
}

/** Glow behind an element */
export function glow(color: string, size = 20): CSSProperties {
  return {
    position: "absolute",
    inset: -size,
    borderRadius: size + 16,
    backgroundColor: `${color}15`,
    filter: `blur(${size}px)`,
    zIndex: -1,
    pointerEvents: "none",
  };
}
