import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  BG, WHITE_35, FONT_MONO, GRADIENT_OVERLAY,
} from "../theme";

const MermaidViewer = React.lazy(() => import("./MermaidViewer"));
const ExcalidrawViewer = React.lazy(() => import("./ExcalidrawViewer"));
const MarkdownViewer = React.lazy(() => import("./MarkdownViewer"));
const JsonViewer = React.lazy(() => import("./JsonViewer"));
const PluginViewer = React.lazy(() => import("./PluginViewer"));
const ErrorViewer = React.lazy(() => import("./ErrorViewer"));
const LatexViewer = React.lazy(() => import("./LatexViewer"));

type ContentTypeDto =
  | "mermaid"
  | "excalidraw"
  | "markdown"
  | "json"
  | "latex"
  | { plugin: { id: string; entryPoint: string } };

interface ViewerPayload {
  content: string;
  contentType: ContentTypeDto | "error";
  error?: { title: string; message: string };
}

const loadingFallback: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  backgroundColor: BG,
  backgroundImage: GRADIENT_OVERLAY,
  fontFamily: FONT_MONO,
  fontSize: "0.8rem",
  color: WHITE_35,
  letterSpacing: "0.06em",
};

function ViewerRouter(): React.JSX.Element {
  const [payload, setPayload] = useState<ViewerPayload | null>(null);

  useEffect(() => {
    const unlistenNewContent = listen<{
      content: string;
      contentType: ContentTypeDto;
    }>("lunette://new-content", (event) => {
      setPayload({
        content: event.payload.content,
        contentType: event.payload.contentType,
      });
    });

    const unlistenError = listen<{ title: string; message: string }>(
      "lunette://error",
      (event) => {
        setPayload({
          content: "",
          contentType: "error",
          error: { title: event.payload.title, message: event.payload.message },
        });
      }
    );

    Promise.all([unlistenNewContent, unlistenError]).then(() => {
      invoke("frontend_ready").catch((e) =>
        console.error("frontend_ready error:", e)
      );
    });

    return () => {
      unlistenNewContent.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  const renderViewer = (): React.ReactNode => {
    if (payload === null || payload.contentType === "error") {
      const title = payload?.error?.title ?? "Come usare Lunette";
      const message =
        payload?.error?.message ??
        "Avvia Lunette tramite pipe o deep link per visualizzare un contenuto.";
      return <ErrorViewer title={title} message={message} />;
    }

    const { content, contentType } = payload;

    if (contentType === "mermaid") {
      return <MermaidViewer content={content} />;
    }

    if (contentType === "excalidraw") {
      return <ExcalidrawViewer content={content} />;
    }

    if (contentType === "markdown") {
      return <MarkdownViewer content={content} />;
    }

    if (contentType === "json") {
      return <JsonViewer content={content} />;
    }

    if (contentType === "latex") {
      return <LatexViewer content={content} />;
    }

    if (typeof contentType === "object" && "plugin" in contentType) {
      return (
        <PluginViewer
          pluginId={contentType.plugin.id}
          entryPointPath={contentType.plugin.entryPoint}
          content={content}
        />
      );
    }

    return (
      <ErrorViewer
        title="Formato non riconoscibile"
        message="Il contenuto ricevuto non può essere visualizzato."
      />
    );
  };

  return (
    <React.Suspense fallback={<div style={loadingFallback}>caricamento...</div>}>
      {renderViewer()}
    </React.Suspense>
  );
}

export default ViewerRouter;
