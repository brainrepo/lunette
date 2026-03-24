import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { BG, CYAN, PINK, GREEN, PURPLE, WHITE_90, WHITE_60, WHITE_10, GRADIENT } from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadJetBrains("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const FORMATS = [
  { name: "Mermaid", desc: "Diagrams & flowcharts", color: CYAN, symbol: "◆", example: "graph TD; A→B" },
  { name: "Markdown", desc: "Documentation & notes", color: GREEN, symbol: "¶", example: "# Title\n**bold** text" },
  { name: "JSON", desc: "Data & API responses", color: PURPLE, symbol: "{}", example: '{"key": "value"}' },
  { name: "LaTeX", desc: "Math & equations", color: PINK, symbol: "∑", example: "E = mc²" },
  { name: "Excalidraw", desc: "Sketches & whiteboards", color: "#f59f00", symbol: "✎", example: "Hand-drawn style" },
];

const FormatCard: React.FC<{
  format: (typeof FORMATS)[number];
  index: number;
}> = ({ format, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const staggerDelay = index * 12;
  const entrance = spring({
    frame: frame - staggerDelay,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const scale = interpolate(entrance, [0, 1], [0.7, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const y = interpolate(entrance, [0, 1], [40, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        width: 320,
        padding: "28px 24px",
        backgroundColor: `${format.color}08`,
        border: `1.5px solid ${format.color}25`,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Symbol + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: `${format.color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontFamily: mono,
            color: format.color,
          }}
        >
          {format.symbol}
        </div>
        <div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 22,
              fontWeight: 700,
              color: WHITE_90,
            }}
          >
            {format.name}
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 15,
              color: WHITE_60,
              marginTop: 2,
            }}
          >
            {format.desc}
          </div>
        </div>
      </div>

      {/* Example code */}
      <div
        style={{
          fontFamily: mono,
          fontSize: 13,
          color: format.color,
          backgroundColor: "rgba(255,255,255,0.03)",
          border: `1px solid ${WHITE_10}`,
          borderRadius: 8,
          padding: "8px 12px",
          opacity: 0.7,
          whiteSpace: "pre",
        }}
      >
        {format.example}
      </div>
    </div>
  );
};

export const FormatCards: React.FC = () => {
  const frame = useCurrentFrame();

  // Title entrance
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        backgroundImage: GRADIENT,
        alignItems: "center",
      }}
    >
      {/* Title */}
      <div
        style={{
          marginTop: 70,
          opacity: titleOpacity,
          fontFamily: inter,
          fontSize: 38,
          fontWeight: 700,
          color: WHITE_90,
          letterSpacing: "-0.01em",
        }}
      >
        What can you visualize?
      </div>

      {/* Top row: 3 cards */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 60,
          justifyContent: "center",
        }}
      >
        {FORMATS.slice(0, 3).map((fmt, i) => (
          <FormatCard key={fmt.name} format={fmt} index={i} />
        ))}
      </div>

      {/* Bottom row: 2 cards */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 24,
          justifyContent: "center",
        }}
      >
        {FORMATS.slice(3).map((fmt, i) => (
          <FormatCard key={fmt.name} format={fmt} index={i + 3} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
