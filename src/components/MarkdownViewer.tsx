import React, { useMemo, useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import {
  baseContainer, gradientOverlay, toolbar, toolbarButton, toolbarButtonActive,
  contentArea,
  CYAN, WHITE_90, WHITE_60, WHITE_35, WHITE_10,
  FONT_MONO, FONT_SANS,
} from "../theme";

// Configure marked with GFM and highlight.js code renderer
marked.use({
  gfm: true,
  renderer: {
    code(tokenOrCode: { text: string; lang?: string }): string {
      // marked v13 types declare token-object API but runtime still
      // passes positional args (code, lang, escaped). Handle both.
      let code: string;
      let lang: string;
      if (typeof tokenOrCode === "string") {
        code = tokenOrCode;
        // eslint-disable-next-line prefer-rest-params
        lang = (arguments[1] as string) ?? "";
      } else {
        code = tokenOrCode.text;
        lang = tokenOrCode.lang ?? "";
      }
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(code, { language: lang }).value;
          return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        } catch {
          // fall through to auto-detect
        }
      }
      const highlighted = hljs.highlightAuto(code).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    },
  },
});

interface MarkdownViewerProps {
  content: string;
}

// Security note: Lunette is a local desktop app. Content arrives from the
// user's own pipe/stdin — the same trust boundary as their terminal.
// dangerouslySetInnerHTML is acceptable here (same as any markdown previewer).

function MarkdownViewer({ content }: MarkdownViewerProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    return marked.parse(content) as string;
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copia fallita:", err);
    }
  };

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
          markdown
        </div>
        <div style={{ flex: 1 }} />
        <button
          style={copied ? { ...toolbarButton, ...toolbarButtonActive } : toolbarButton}
          onClick={handleCopy}
        >
          {copied ? "Copiato!" : "Copia sorgente"}
        </button>
      </div>

      <div style={{
        ...contentArea,
        padding: "2rem",
        display: "flex",
        justifyContent: "center",
      }}>
        <div
          style={styles.content}
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Injected markdown styles */}
      <style>{markdownCSS}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    flex: 1,
    maxWidth: 780,
    width: "100%",
    lineHeight: 1.8,
    fontFamily: FONT_SANS,
    color: WHITE_60,
    fontSize: "0.95rem",
  },
};

const markdownCSS = `
  .markdown-body h1, .markdown-body h2, .markdown-body h3,
  .markdown-body h4, .markdown-body h5, .markdown-body h6 {
    color: ${WHITE_90};
    font-family: ${FONT_SANS};
    font-weight: 600;
    letter-spacing: 0.01em;
    margin: 1.8em 0 0.6em 0;
    line-height: 1.3;
  }
  .markdown-body h1 { font-size: 1.6rem; }
  .markdown-body h2 { font-size: 1.3rem; }
  .markdown-body h3 { font-size: 1.1rem; }
  .markdown-body p { margin: 0 0 1em 0; }
  .markdown-body strong { color: ${WHITE_90}; font-weight: 600; }
  .markdown-body em { color: ${WHITE_60}; }
  .markdown-body a {
    color: ${CYAN};
    text-decoration: none;
    border-bottom: 1px solid ${CYAN}40;
  }
  .markdown-body a:hover { border-bottom-color: ${CYAN}; }
  .markdown-body code {
    font-family: ${FONT_MONO};
    font-size: 0.85em;
    background: rgba(255,255,255,0.06);
    border: 1px solid ${WHITE_10};
    border-radius: 6px;
    padding: 2px 6px;
    color: ${CYAN};
  }
  .markdown-body pre {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid ${WHITE_10};
    border-radius: 12px;
    padding: 16px 20px;
    overflow-x: auto;
    margin: 1.2em 0;
  }
  .markdown-body pre code {
    background: none;
    border: none;
    padding: 0;
    color: ${WHITE_60};
    font-size: 0.82rem;
    line-height: 1.7;
  }
  .markdown-body blockquote {
    border-left: 3px solid ${CYAN}30;
    margin: 1em 0;
    padding: 0.5em 0 0.5em 16px;
    color: ${WHITE_35};
  }
  .markdown-body ul, .markdown-body ol {
    padding-left: 1.5em;
    margin: 0 0 1em 0;
  }
  .markdown-body li { margin: 0.3em 0; }
  .markdown-body hr {
    border: none;
    height: 1px;
    background: ${WHITE_10};
    margin: 2em 0;
  }
  .markdown-body table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  .markdown-body th, .markdown-body td {
    border: 1px solid ${WHITE_10};
    padding: 8px 12px;
    text-align: left;
  }
  .markdown-body th {
    color: ${WHITE_90};
    font-weight: 600;
    background: rgba(255,255,255,0.03);
  }
  .markdown-body img { max-width: 100%; border-radius: 8px; }
`;

export default MarkdownViewer;
