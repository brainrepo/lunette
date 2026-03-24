import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import {
  BG, CYAN, GREEN, PURPLE, WHITE_90, WHITE_60, WHITE_35, WHITE_10, GRADIENT,
} from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadJetBrains("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const LINES: Array<{
  text: string;
  color: string;
  delay: number;
  typed?: boolean;
  prefix?: string;
  prefixColor?: string;
  speed?: number;
}> = [
  { prefix: "❯", prefixColor: CYAN, text: " Draw the OAuth sequence diagram", color: WHITE_90, delay: 10, typed: true, speed: 1.8 },
  { text: "", color: "transparent", delay: 50 },
  { prefix: "  ●", prefixColor: PURPLE, text: " I'll render a Mermaid diagram in Lunette.", color: WHITE_60, delay: 55 },
  { prefix: "  ●", prefixColor: PURPLE, text: " Open Lunette to visualize? (y/n)", color: WHITE_60, delay: 70 },
  { text: "", color: "transparent", delay: 82 },
  { prefix: "❯", prefixColor: GREEN, text: " y", color: WHITE_90, delay: 85, typed: true, speed: 3 },
  { text: "", color: "transparent", delay: 95 },
  { prefix: "  ✓", prefixColor: GREEN, text: " Content sent to Lunette", color: GREEN, delay: 100 },
  { prefix: "   ", prefixColor: WHITE_35, text: " Deep link: lunette://?file=/tmp/lunette_a8f3...", color: WHITE_35, delay: 108 },
];

const TypedLine: React.FC<{
  text: string;
  color: string;
  startFrame: number;
  speed: number;
  prefix?: string;
  prefixColor?: string;
}> = ({ text, color, startFrame, speed, prefix, prefixColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - startFrame);
  const charsPerFrame = speed / fps;
  const visibleChars = Math.min(text.length, Math.floor(elapsed * charsPerFrame * fps));
  const showCursor = frame >= startFrame && visibleChars < text.length;

  return (
    <div style={{ fontFamily: mono, fontSize: 20, color, lineHeight: 2 }}>
      {prefix && <span style={{ color: prefixColor }}>{prefix}</span>}
      {text.slice(0, visibleChars)}
      {showCursor && (
        <span style={{ color: CYAN, opacity: frame % 20 < 10 ? 1 : 0 }}>▋</span>
      )}
    </div>
  );
};

export const McpScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const termEntrance = spring({ frame, fps, config: { damping: 200 } });
  const termY = interpolate(termEntrance, [0, 1], [40, 0]);
  const termOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        backgroundImage: GRADIENT,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
          opacity: titleOpacity,
          fontFamily: inter,
          fontSize: 38,
          fontWeight: 700,
          color: WHITE_90,
          letterSpacing: "-0.01em",
        }}
      >
        Ask Claude Code to visualize
      </div>

      {/* Terminal window */}
      <div
        style={{
          opacity: termOpacity,
          transform: `translateY(${termY}px)`,
          width: 920,
          backgroundColor: "rgba(15,17,30,0.95)",
          border: `1px solid ${WHITE_10}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 25px 80px rgba(0,0,0,0.5), 0 0 60px ${CYAN}08`,
          marginTop: 30,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            backgroundColor: "rgba(255,255,255,0.03)",
            borderBottom: `1px solid ${WHITE_10}`,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
          <span style={{ marginLeft: 12, fontFamily: mono, fontSize: 13, color: WHITE_35 }}>
            claude — Claude Code
          </span>
        </div>

        {/* Terminal body */}
        <div style={{ padding: "20px 24px", minHeight: 300 }}>
          {LINES.map((line, i) => {
            if (line.typed) {
              return (
                <TypedLine
                  key={i}
                  text={line.text}
                  color={line.color}
                  startFrame={line.delay}
                  speed={line.speed ?? 1.5}
                  prefix={line.prefix}
                  prefixColor={line.prefixColor}
                />
              );
            }
            const opacity = interpolate(frame, [line.delay, line.delay + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: mono,
                  fontSize: 20,
                  color: line.color,
                  lineHeight: 2,
                  opacity,
                }}
              >
                {line.prefix && <span style={{ color: line.prefixColor }}>{line.prefix}</span>}
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
