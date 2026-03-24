import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type { AppState } from "@excalidraw/excalidraw/types/types";

export interface ParsedData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
}

export interface ParseError {
  message: string;
}

export function parseExcalidrawContent(content: string): ParsedData | ParseError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return {
      message: `JSON non valido: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { message: "Il contenuto non è un oggetto JSON valido." };
  }

  const obj = parsed as Record<string, unknown>;

  if (!("elements" in obj)) {
    return { message: "Campo mancante: 'elements'" };
  }
  if (!("appState" in obj)) {
    return { message: "Campo mancante: 'appState'" };
  }

  return {
    elements: obj.elements as readonly ExcalidrawElement[],
    appState: obj.appState as Partial<AppState>,
  };
}
