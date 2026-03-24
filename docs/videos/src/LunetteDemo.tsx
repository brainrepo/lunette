import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Intro } from "./scenes/Intro";
import { PipeDemo } from "./scenes/PipeDemo";
import { FormatCards } from "./scenes/FormatCards";
import { McpScene } from "./scenes/McpScene";
import { Outro } from "./scenes/Outro";

const FADE_DURATION = 15;

export const LunetteDemo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={105}>
        <Intro />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />

      <TransitionSeries.Sequence durationInFrames={195}>
        <PipeDemo />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />

      <TransitionSeries.Sequence durationInFrames={270}>
        <FormatCards />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />

      <TransitionSeries.Sequence durationInFrames={180}>
        <McpScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />

      <TransitionSeries.Sequence durationInFrames={120}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
