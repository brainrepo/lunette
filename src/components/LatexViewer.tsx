import React, { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  baseContainer, gradientOverlay, toolbar, toolbarButton, toolbarButtonActive,
  contentArea,
  CYAN, WHITE_60, WHITE_10, WHITE_06,
  FONT_MONO, FONT_SANS,
} from "../theme";

interface LatexViewerProps {
  content: string;
}

type Segment =
  | { type: "display"; math: string }
  | { type: "inline"; math: string }
  | { type: "text"; value: string };

/** Split raw LaTeX/text content into typed segments. */
function parseSegments(raw: string): Segment[] {
  // Strip \documentclass preamble — keep only \begin{document}...\end{document}
  const docMatch = raw.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  const content = docMatch ? docMatch[1] : raw;

  const segments: Segment[] = [];
  const RE = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+?\$|\\\([\s\S]*?\\\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = RE.exec(content)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", value: content.slice(last, match.index) });
    }
    const m = match[0];
    if (m.startsWith("$$") || m.startsWith("\\[")) {
      const math = m.startsWith("$$") ? m.slice(2, -2) : m.slice(2, -2);
      segments.push({ type: "display", math: math.trim() });
    } else {
      const math = m.startsWith("$") ? m.slice(1, -1) : m.slice(2, -2);
      segments.push({ type: "inline", math: math.trim() });
    }
    last = match.index + m.length;
  }

  if (last < content.length) {
    segments.push({ type: "text", value: content.slice(last) });
  }

  return segments;
}

function renderMath(math: string, displayMode: boolean): { html: string; error: string | null } {
  try {
    return {
      html: katex.renderToString(math, { displayMode, throwOnError: true, trust: false }),
      error: null,
    };
  } catch (e) {
    return { html: "", error: e instanceof Error ? e.message : String(e) };
  }
}

function LatexViewer({ content }: LatexViewerProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const segments = useMemo(() => parseSegments(content), [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div style={baseContainer}>
      <div style={gradientOverlay} />

      <div style={toolbar}>
        <div style={labelStyle}>latex</div>
        <div style={{ flex: 1 }} />
        <button
          style={copied ? { ...toolbarButton, ...toolbarButtonActive } : toolbarButton}
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy source"}
        </button>
      </div>

      <div style={{ ...contentArea, padding: "2rem 3rem" }}>
        <div style={docStyle}>
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i} style={textStyle}>{seg.value}</span>;
            }
            const { html, error } = renderMath(seg.math, seg.type === "display");
            if (error) {
              return (
                <span key={i} style={errorStyle} title={error}>
                  {seg.type === "display" ? `$$${seg.math}$$` : `$${seg.math}$`}
                </span>
              );
            }
            return (
              <span
                key={i}
                style={seg.type === "display" ? displayMathStyle : undefined}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          })}
        </div>
      </div>

      <style>{katexOverrides}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontFamily: FONT_MONO,
  color: CYAN,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 600,
  opacity: 0.8,
};

const docStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  fontFamily: FONT_SANS,
  fontSize: "1rem",
  lineHeight: 1.9,
  color: WHITE_60,
};

const textStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
};

const displayMathStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  margin: "1.5rem 0",
  padding: "1rem",
  backgroundColor: WHITE_06,
  borderRadius: 10,
  border: `1px solid ${WHITE_10}`,
  overflowX: "auto",
};

const errorStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: "0.8rem",
  color: "#f03e3e",
  backgroundColor: "rgba(240,62,62,0.08)",
  border: "1px solid rgba(240,62,62,0.25)",
  borderRadius: 6,
  padding: "2px 6px",
  cursor: "help",
};

const katexOverrides = `
  .katex { color: rgba(255,255,255,0.88) !important; font-size: 1.1em; }
  .katex .mord, .katex .mbin, .katex .mrel,
  .katex .mopen, .katex .mclose, .katex .mpunct { color: rgba(255,255,255,0.88); }
  .katex .mop { color: ${CYAN}; }
  .katex-display { overflow-x: auto; overflow-y: hidden; }
`;

export default LatexViewer;
