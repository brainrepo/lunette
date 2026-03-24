import React, { useMemo, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { darkTheme } from "@uiw/react-json-view/dark";
import {
  baseContainer, gradientOverlay, toolbar, toolbarButton, toolbarButtonActive,
  contentArea,
  CYAN, GREEN, WHITE_60, WHITE_10,
  FONT_MONO,
} from "../theme";
import ErrorViewer from "./ErrorViewer";

interface JsonViewerProps {
  content: string;
}

function JsonViewer({ content }: JsonViewerProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => {
    try {
      return { value: JSON.parse(content) as object, error: null };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(parsed.value, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  if (parsed.error !== null) {
    return <ErrorViewer title="Invalid JSON" message={parsed.error} />;
  }

  return (
    <div style={baseContainer}>
      <div style={gradientOverlay} />

      <div style={toolbar}>
        <div style={labelStyle}>json</div>
        <div style={{ flex: 1 }} />
        <button
          style={copied ? { ...toolbarButton, ...toolbarButtonActive } : toolbarButton}
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div style={{ ...contentArea, padding: "1.5rem 2rem" }}>
        <style>{jsonViewOverrides}</style>
        <JsonView
          value={parsed.value!}
          style={{ ...darkTheme, fontFamily: FONT_MONO, fontSize: "0.82rem", background: "transparent" }}
          enableClipboard={false}
          displayDataTypes={false}
          shortenTextAfterLength={0}
        />
      </div>
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

// Override @uiw/react-json-view CSS variables to match Lunette's palette
const jsonViewOverrides = `
  .w-rjv {
    --w-rjv-background-color: transparent !important;
    --w-rjv-border-left-color: ${WHITE_10} !important;
    --w-rjv-color: ${WHITE_60} !important;
    --w-rjv-key-string: ${CYAN} !important;
    --w-rjv-type-string-color: ${GREEN} !important;
    --w-rjv-brackets-color: rgba(255,255,255,0.35) !important;
    --w-rjv-ellipsis-color: rgba(255,255,255,0.35) !important;
    line-height: 1.7;
  }
`;

export default JsonViewer;
