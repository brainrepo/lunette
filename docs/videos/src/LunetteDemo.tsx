import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Intro } from "./scenes/Intro";
import { McpScene } from "./scenes/McpScene";
import { FormatCards } from "./scenes/FormatCards";
import { PipeDemo } from "./scenes/PipeDemo";
import { Outro } from "./scenes/Outro";

const FADE = 15;

export const LunetteDemo: React.FC = () => {
  return (
    <TransitionSeries>
      {/* 1. Intro — "Lunette / Give Claude eyes" */}
      <TransitionSeries.Sequence durationInFrames={105}>
        <Intro />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />

      {/* 2. Hero — Claude conversation + MCP flow */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <McpScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />

      {/* 3. Format cards — what can you visualize */}
      <TransitionSeries.Sequence durationInFrames={270}>
        <FormatCards />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />

      {/* 4. Pipe demo — "also works from the terminal" */}
      <TransitionSeries.Sequence durationInFrames={180}>
        <PipeDemo />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />

      {/* 5. Outro — get started */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
