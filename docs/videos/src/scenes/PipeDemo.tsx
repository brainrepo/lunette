import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { BG, CYAN, GREEN, WHITE_90, WHITE_60, WHITE_35, WHITE_10, GRADIENT } from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadJetBrains("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const LINES = [
  { prompt: '$ echo "graph TD; A-->B" | lunette', delay: 15, typeSpeed: 1.2 },
  { result: "  ✓ Rendered in Lunette", delay: 70, color: GREEN },
  { prompt: "$ cat report.md | lunette", delay: 100, typeSpeed: 1.5 },
  { result: "  ✓ Rendered in Lunette", delay: 145, color: GREEN },
];

const Typewriter: React.FC<{
  text: string;
  startFrame: number;
  speed: number;
  color: string;
}> = ({ text, startFrame, speed, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - startFrame);
  const charsPerFrame = speed / fps;
  const visibleChars = Math.min(text.length, Math.floor(elapsed * charsPerFrame * fps));
  const showCursor = frame >= startFrame && visibleChars < text.length;

  return (
    <div style={{ fontFamily: mono, fontSize: 22, color, lineHeight: 1.8 }}>
      {text.slice(0, visibleChars)}
      {showCursor && (
        <span style={{ color: CYAN, opacity: frame % 20 < 10 ? 1 : 0 }}>▋</span>
      )}
    </div>
  );
};

export const PipeDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Terminal window slides up
  const termY = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1],
    [60, 0]
  );
  const termOpacity = interpolate(frame, [0, 15], [0, 1], {
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
      {/* Section title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          fontFamily: inter,
          fontSize: 38,
          fontWeight: 700,
          color: WHITE_90,
          letterSpacing: "-0.01em",
        }}
      >
        Just pipe it
      </div>

      {/* Terminal window */}
      <div
        style={{
          opacity: termOpacity,
          transform: `translateY(${termY}px)`,
          width: 860,
          backgroundColor: "rgba(15,17,30,0.95)",
          border: `1px solid ${WHITE_10}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 25px 80px rgba(0,0,0,0.5), 0 0 60px ${CYAN}08`,
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
          <span
            style={{
              marginLeft: 12,
              fontFamily: mono,
              fontSize: 13,
              color: WHITE_35,
            }}
          >
            Terminal
          </span>
        </div>

        {/* Terminal body */}
        <div style={{ padding: "20px 24px", minHeight: 180 }}>
          {LINES.map((line, i) => {
            if ("prompt" in line) {
              return (
                <Typewriter
                  key={i}
                  text={line.prompt}
                  startFrame={line.delay}
                  speed={line.typeSpeed}
                  color={WHITE_60}
                />
              );
            }
            const resultOpacity = interpolate(frame, [line.delay, line.delay + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: mono,
                  fontSize: 22,
                  color: line.color,
                  lineHeight: 1.8,
                  opacity: resultOpacity,
                }}
              >
                {line.result}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
