import React, { useEffect, useRef, useState } from "react";
import {
  baseContainer, gradientOverlay, toolbar, card,
  CYAN, PINK, WHITE_60, WHITE_35,
  FONT_MONO, FONT_SANS,
} from "../theme";

interface PluginViewerProps {
  pluginId: string;
  entryPointPath: string;
  content: string;
}

type ViewerState =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string }
  | { kind: "timeout" };

function PluginViewer({
  pluginId,
  entryPointPath,
  content,
}: PluginViewerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ViewerState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadPlugin() {
      const container = containerRef.current;
      if (!container) return;

      const win = window as unknown as Record<string, unknown>;
      const tauriBackup = win.__TAURI__;
      delete win.__TAURI__;

      try {
        const mod = await import(/* @vite-ignore */ entryPointPath);

        await Promise.race([
          mod.render(content, container),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000)
          ),
        ]);

        if (!cancelled) setState({ kind: "ok" });
      } catch (err: unknown) {
        if (cancelled) return;

        if (err instanceof Error && err.message === "timeout") {
          setState({ kind: "timeout" });
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setState({ kind: "error", message });
        }
      } finally {
        if (tauriBackup !== undefined) {
          win.__TAURI__ = tauriBackup;
        }
      }
    }

    loadPlugin();
    return () => { cancelled = true; };
  }, [pluginId, entryPointPath, content]);

  if (state.kind === "error") {
    return (
      <div style={baseContainer}>
        <div style={gradientOverlay} />
        <div style={toolbar}>
          <div style={{
            fontSize: "0.75rem",
            fontFamily: FONT_MONO,
            color: PINK,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            fontWeight: 600,
            opacity: 0.8,
          }}>
            plugin &middot; {pluginId}
          </div>
        </div>
        <div style={{ padding: "2rem", position: "relative", zIndex: 1 }}>
          <div role="alert" style={card(PINK)}>
            <p style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: PINK,
              margin: "0 0 8px 0",
              fontFamily: FONT_SANS,
            }}>
              Plugin error
            </p>
            <p style={{
              marginTop: "0.5rem",
              whiteSpace: "pre-wrap",
              fontFamily: FONT_MONO,
              fontSize: "0.8rem",
              color: WHITE_60,
              lineHeight: 1.6,
              margin: "8px 0 0 0",
            }}>
              {state.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "timeout") {
    return (
      <div style={baseContainer}>
        <div style={gradientOverlay} />
        <div style={toolbar}>
          <div style={{
            fontSize: "0.75rem",
            fontFamily: FONT_MONO,
            color: PINK,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            fontWeight: 600,
            opacity: 0.8,
          }}>
            plugin &middot; {pluginId}
          </div>
        </div>
        <div style={{ padding: "2rem", position: "relative", zIndex: 1 }}>
          <div role="alert" style={card(PINK)}>
            <p style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: PINK,
              margin: "0 0 8px 0",
              fontFamily: FONT_SANS,
            }}>
              Plugin timeout
            </p>
            <p style={{
              color: WHITE_35,
              fontSize: "0.85rem",
              lineHeight: 1.6,
              margin: "8px 0 0 0",
            }}>
              The plugin did not complete rendering within 10 seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          plugin &middot; {pluginId}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
        {state.kind === "loading" && (
          <div style={{
            padding: "2rem",
            fontFamily: FONT_MONO,
            fontSize: "0.8rem",
            color: WHITE_35,
            letterSpacing: "0.02em",
          }}>
            Loading plugin {pluginId}...
          </div>
        )}
        <div id="plugin-container" ref={containerRef} />
      </div>
    </div>
  );
}

export default PluginViewer;
