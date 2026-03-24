import { Composition } from "remotion";
import { LunetteDemo } from "./LunetteDemo";

// Scene durations: 105 + 210 + 270 + 180 + 120 = 885
// Minus 4 fade transitions × 15 frames = 60
// Total: 825 frames ≈ 27.5 seconds at 30fps

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LunetteDemo"
      component={LunetteDemo}
      durationInFrames={825}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
