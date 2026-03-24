import React from "react";
import {
  BG, CYAN, PINK, WHITE_90, WHITE_60, WHITE_35, WHITE_10,
  FONT_SANS, FONT_MONO, GRADIENT_OVERLAY,
} from "../theme";

interface ErrorViewerProps {
  title: string;
  message: string;
}

function ErrorViewer({ title, message }: ErrorViewerProps): React.JSX.Element {
  const isUsage = title === "Come usare Lunette";

  return (
    <div style={styles.container}>
      {/* Studio lighting */}
      <div style={styles.gradient} />

      {/* Glow behind card */}
      <div style={{
        position: "absolute",
        width: 340,
        height: 200,
        borderRadius: 80,
        backgroundColor: isUsage ? `${CYAN}12` : `${PINK}12`,
        filter: "blur(60px)",
        zIndex: 0,
      }} />

      {/* Card */}
      <div style={{
        ...styles.card,
        borderColor: isUsage ? `${CYAN}20` : `${PINK}20`,
      }}>
        {/* Icon */}
        <div style={{
          ...styles.icon,
          color: isUsage ? CYAN : PINK,
          borderColor: isUsage ? `${CYAN}30` : `${PINK}30`,
          backgroundColor: isUsage ? `${CYAN}08` : `${PINK}08`,
        }}>
          {isUsage ? "?" : "!"}
        </div>

        <h1 style={styles.title}>{title}</h1>
        <p style={styles.message}>{message}</p>

        {isUsage && (
          <div style={styles.hint}>
            <code style={styles.code}>echo "# hello" | lunette</code>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: BG,
    fontFamily: FONT_SANS,
    position: "relative",
    overflow: "hidden",
  },
  gradient: {
    position: "absolute",
    inset: 0,
    backgroundImage: GRADIENT_OVERLAY,
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "40px 48px",
    borderRadius: 20,
    border: "1.5px solid",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(8px)",
    maxWidth: 480,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: "1.5px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: 700,
    fontFamily: FONT_MONO,
    marginBottom: 20,
  },
  title: {
    fontSize: "1.4rem",
    fontWeight: 600,
    color: WHITE_90,
    marginBottom: 8,
    letterSpacing: "0.02em",
    lineHeight: 1.3,
    margin: "0 0 8px 0",
  },
  message: {
    fontSize: "0.9rem",
    lineHeight: 1.7,
    color: WHITE_35,
    margin: "0 0 20px 0",
    maxWidth: 380,
  },
  hint: {
    padding: "10px 16px",
    borderRadius: 10,
    backgroundColor: `${CYAN}06`,
    border: `1px solid ${WHITE_10}`,
  },
  code: {
    fontFamily: FONT_MONO,
    fontSize: "0.8rem",
    color: WHITE_60,
    letterSpacing: "0.02em",
  },
};

export default ErrorViewer;
