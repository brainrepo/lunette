import { Composition } from "remotion";
import { LunetteDemo } from "./LunetteDemo";

// Scene durations: 105 + 195 + 270 + 180 + 120 = 870
// Minus 4 fade transitions × 15 frames = 60
// Total: 810 frames = 27 seconds at 30fps

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LunetteDemo"
      component={LunetteDemo}
      durationInFrames={810}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
