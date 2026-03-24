import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { BG, CYAN, WHITE_60, GRADIENT } from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: jetbrains } = loadJetBrains("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo springs in
  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline fades in with delay
  const tagOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagY = interpolate(frame, [20, 45], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulses subtly
  const glowScale = interpolate(frame, [0, 90], [0.8, 1.1], {
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
      {/* Glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${CYAN}25, transparent 70%)`,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: inter,
            fontSize: 110,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.03em",
          }}
        >
          Lunette
        </div>

        {/* Accent line */}
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: CYAN,
            borderRadius: 2,
            margin: "16px auto",
            opacity: logoOpacity,
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: jetbrains,
            fontSize: 28,
            color: WHITE_60,
            letterSpacing: "0.04em",
          }}
        >
          Pipe anything. See it instantly.
        </div>
      </div>
    </AbsoluteFill>
  );
};
