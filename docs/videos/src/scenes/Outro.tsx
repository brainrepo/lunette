import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { BG, CYAN, WHITE_90, WHITE_60, WHITE_35, WHITE_10, GRADIENT } from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadJetBrains("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [20, 0]);

  const cmdOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
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
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${CYAN}15, transparent 70%)`,
        }}
      />

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: inter,
          fontSize: 52,
          fontWeight: 700,
          color: WHITE_90,
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        Get started
      </div>

      {/* Command */}
      <div
        style={{
          marginTop: 32,
          opacity: cmdOpacity,
          backgroundColor: WHITE_10,
          border: `1px solid ${WHITE_10}`,
          borderRadius: 12,
          padding: "14px 28px",
        }}
      >
        <span style={{ fontFamily: mono, fontSize: 22, color: WHITE_60 }}>
          npm run tauri build
        </span>
      </div>

      {/* CTA / link */}
      <div
        style={{
          marginTop: 40,
          opacity: ctaOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 20,
            color: CYAN,
            letterSpacing: "0.02em",
          }}
        >
          github.com/brainrepo/lunette
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 16,
            color: WHITE_35,
            marginTop: 12,
          }}
        >
          Open source · macOS · Linux · Windows
        </div>
      </div>
    </AbsoluteFill>
  );
};
