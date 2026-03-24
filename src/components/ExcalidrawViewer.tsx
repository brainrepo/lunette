import React, { useState } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import {
  baseContainer, gradientOverlay, toolbar, toolbarButton, toolbarButtonActive,
  card,
  CYAN, PINK, WHITE_60, WHITE_35, WHITE_10,
  FONT_MONO,
} from "../theme";
import { parseExcalidrawContent } from "../utils/parseExcalidrawContent";
import type { ParsedData, ParseError } from "../utils/parseExcalidrawContent";

interface ExcalidrawViewerProps {
  content: string;
}

function ExcalidrawViewer({ content }: ExcalidrawViewerProps): React.JSX.Element {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const result = parseExcalidrawContent(content);
  const isError = "message" in result;

  const handleExportPng = async () => {
    if (isError) return;
    setExporting(true);
    try {
      const { elements, appState } = result as ParsedData;
      const blob = await exportToBlob({
        elements,
        appState,
        files: null,
        mimeType: "image/png",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "excalidraw-export.png";
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (err) {
      console.error("Esportazione PNG fallita:", err);
    } finally {
      setExporting(false);
    }
  };

  if (isError) {
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
            excalidraw
          </div>
          <div style={{ flex: 1 }} />
          <button style={{ ...toolbarButton, opacity: 0.4, cursor: "not-allowed" }} disabled>
            Esporta PNG
          </button>
        </div>
        <div style={{ padding: "2rem", position: "relative", zIndex: 1 }}>
          <div style={card(PINK)}>
            <p style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: PINK,
              margin: "0 0 8px 0",
            }}>
              Errore Excalidraw
            </p>
            <p style={{
              color: WHITE_60,
              fontSize: "0.85rem",
              margin: "0 0 16px 0",
              lineHeight: 1.6,
            }}>
              {(result as ParseError).message}
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
      </div>
    );
  }

  const { elements, appState } = result as ParsedData;

  const btnStyle = exported
    ? { ...toolbarButton, ...toolbarButtonActive }
    : exporting
      ? { ...toolbarButton, opacity: 0.5, cursor: "not-allowed" }
      : toolbarButton;

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
          excalidraw
        </div>
        <div style={{ flex: 1 }} />
        <button
          style={btnStyle}
          onClick={handleExportPng}
          disabled={exporting}
        >
          {exported ? "Esportato!" : exporting ? "Esportazione..." : "Esporta PNG"}
        </button>
      </div>

      <div style={{
        flex: 1,
        position: "relative",
        zIndex: 1,
      }}>
        <Excalidraw
          initialData={{ elements, appState }}
          viewModeEnabled={true}
        />
      </div>
    </div>
  );
}

export default ExcalidrawViewer;
