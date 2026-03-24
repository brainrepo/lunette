import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { BG, CYAN, GREEN, PURPLE, WHITE_90, WHITE_60, WHITE_10, GRADIENT } from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadJetBrains("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const STEPS = [
  { label: "Claude", sub: "asks to visualize", color: PURPLE, symbol: "◈" },
  { label: "MCP Server", sub: "writes temp file", color: CYAN, symbol: "⟡" },
  { label: "Lunette", sub: "renders instantly", color: GREEN, symbol: "◉" },
];

export const McpScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
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
          top: 100,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: inter,
            fontSize: 38,
            fontWeight: 700,
            color: WHITE_90,
            letterSpacing: "-0.01em",
          }}
        >
          Works with Claude via MCP
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 18,
            color: WHITE_60,
            marginTop: 12,
          }}
        >
          Model Context Protocol integration built-in
        </div>
      </div>

      {/* Flow diagram */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginTop: 40,
        }}
      >
        {STEPS.map((step, i) => {
          const delay = 25 + i * 20;
          const entrance = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14 },
          });
          const opacity = interpolate(entrance, [0, 1], [0, 1]);
          const x = interpolate(entrance, [0, 1], [30, 0]);

          const arrowDelay = delay + 15;
          const arrowOpacity = interpolate(frame, [arrowDelay, arrowDelay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
              {/* Node */}
              <div
                style={{
                  opacity,
                  transform: `translateX(${x}px)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  width: 200,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    backgroundColor: `${step.color}15`,
                    border: `2px solid ${step.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 34,
                    color: step.color,
                  }}
                >
                  {step.symbol}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 20,
                      fontWeight: 700,
                      color: WHITE_90,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 14,
                      color: WHITE_60,
                      marginTop: 4,
                    }}
                  >
                    {step.sub}
                  </div>
                </div>
              </div>

              {/* Arrow between nodes */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    opacity: arrowOpacity,
                    fontFamily: mono,
                    fontSize: 28,
                    color: WHITE_60,
                    marginLeft: 16,
                    marginRight: 16,
                    marginBottom: 40,
                  }}
                >
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
