import React, { useCallback, useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  baseContainer, gradientOverlay, toolbar, toolbarButton, toolbarButtonActive,
  card,
  BG, CYAN, PINK, WHITE_90, WHITE_60, WHITE_35, WHITE_10, WHITE_06,
  FONT_MONO,
} from "../theme";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: BG,
    primaryColor: `${CYAN}20`,
    primaryBorderColor: `${CYAN}60`,
    primaryTextColor: WHITE_90,
    lineColor: WHITE_35,
    textColor: WHITE_60,
    mainBkg: `${CYAN}10`,
    nodeBorder: `${CYAN}40`,
    clusterBkg: WHITE_06,
    clusterBorder: WHITE_10,
    edgeLabelBackground: BG,
    fontSize: "14px",
    fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
  },
});

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

interface MermaidViewerProps {
  content: string;
}

interface RenderState {
  svg: string | null;
  error: string | null;
}

function MermaidViewer({ content }: MermaidViewerProps): React.JSX.Element {
  const [state, setState] = useState<RenderState>({ svg: null, error: null });
  const [copied, setCopied] = useState(false);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  // Zoom & pan state — refs for performance (no re-render on every mousemove)
  const [scale, setScale] = useState(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyTransform = useCallback((s: number, tx: number, ty: number) => {
    if (svgWrapperRef.current) {
      svgWrapperRef.current.style.transform =
        `translate(${tx}px, ${ty}px) scale(${s})`;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const { svg } = await mermaid.render(idRef.current, content);
        if (!cancelled) setState({ svg, error: null });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ svg: null, error: message });
        }
      }
    }

    // Reset zoom/pan when content changes
    setScale(1);
    txRef.current = 0;
    tyRef.current = 0;
    applyTransform(1, 0, 0);

    render();
    return () => { cancelled = true; };
  }, [content, applyTransform]);

  // ── Wheel zoom (toward cursor) ──────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setScale((prev) => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + direction * ZOOM_STEP * prev));
      const ratio = next / prev;

      // Keep point under cursor fixed
      txRef.current = cursorX - (cursorX - txRef.current) * ratio;
      tyRef.current = cursorY - (cursorY - tyRef.current) * ratio;
      applyTransform(next, txRef.current, tyRef.current);
      return next;
    });
  }, [applyTransform]);

  // ── Drag pan ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // left click only
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - txRef.current, y: e.clientY - tyRef.current };
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    txRef.current = e.clientX - panStartRef.current.x;
    tyRef.current = e.clientY - panStartRef.current.y;
    applyTransform(scale, txRef.current, tyRef.current);
  }, [scale, applyTransform]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isPanningRef.current = false;
    e.currentTarget.style.cursor = "grab";
  }, []);

  // ── Double-click reset ──────────────────────────────────────────────
  const resetView = useCallback(() => {
    setScale(1);
    txRef.current = 0;
    tyRef.current = 0;
    applyTransform(1, 0, 0);
  }, [applyTransform]);

  // ── Toolbar zoom buttons ───────────────────────────────────────────
  const zoomIn = useCallback(() => {
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, prev + ZOOM_STEP * prev);
      applyTransform(next, txRef.current, tyRef.current);
      return next;
    });
  }, [applyTransform]);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(MIN_SCALE, prev - ZOOM_STEP * prev);
      applyTransform(next, txRef.current, tyRef.current);
      return next;
    });
  }, [applyTransform]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Note: mermaid.render() produces sanitized SVG output internally.
  // This is a local desktop app — content comes from the user's own pipe/stdin.

  return (
    <div style={baseContainer}>
      <div style={gradientOverlay} />

      <div style={toolbar}>
        <div style={{
          fontSize: "0.75rem",
          fontFamily: FONT_MONO,
          color: CYAN,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          fontWeight: 600,
          opacity: 0.8,
        }}>
          mermaid
        </div>

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <button style={zoomBtnStyle} onClick={zoomOut} title="Zoom out">−</button>
        <span style={scaleLabelStyle}>{Math.round(scale * 100)}%</span>
        <button style={zoomBtnStyle} onClick={zoomIn} title="Zoom in">+</button>
        <button style={toolbarButton} onClick={resetView} title="Reset zoom">
          Reset
        </button>

        <div style={separatorStyle} />

        <button
          style={copied ? { ...toolbarButton, ...toolbarButtonActive } : toolbarButton}
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy source"}
        </button>
      </div>

      {/* Zoomable / pannable area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          cursor: "grab",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={resetView}
      >
        {state.svg !== null && (
          <div
            ref={svgWrapperRef}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100%",
              padding: "2rem",
              transformOrigin: "0 0",
            }}
            dangerouslySetInnerHTML={{ __html: state.svg }}
          />
        )}

        {state.error !== null && (
          <div style={{ padding: "2rem" }}>
            <div style={card(PINK)}>
              <p style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: PINK,
                margin: "0 0 8px 0",
              }}>
                Mermaid Error
              </p>
              <p style={{
                color: WHITE_60,
                fontSize: "0.85rem",
                margin: "0 0 16px 0",
                lineHeight: 1.6,
              }}>
                {state.error}
              </p>
              <pre style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid ${WHITE_10}`,
                borderRadius: 10,
                padding: "1rem",
                color: WHITE_35,
                fontFamily: FONT_MONO,
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0,
                lineHeight: 1.6,
              }}>
                {content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Zoom toolbar styles ─────────────────────────────────────────────────

const zoomBtnStyle: React.CSSProperties = {
  ...toolbarButton,
  width: 30,
  height: 30,
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1rem",
  fontWeight: 600,
  lineHeight: 1,
};

const scaleLabelStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: "0.75rem",
  color: WHITE_35,
  minWidth: 44,
  textAlign: "center",
  letterSpacing: "0.02em",
  userSelect: "none",
};

const separatorStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  backgroundColor: WHITE_10,
  margin: "0 4px",
};

export default MermaidViewer;
