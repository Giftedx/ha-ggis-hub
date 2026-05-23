export interface FixedStepConfig {
  /** Tick duration in milliseconds. */
  readonly tickMs: number;
  /** Hard cap on ticks advanced in a single pump call. Protects against
   *  long pauses (tab hidden) or slow devices. */
  readonly maxTicksPerPump: number;
}

export interface FixedStepState {
  readonly tick: number;
  readonly accumulatorMs: number;
}

export const INITIAL_FIXED_STEP_STATE: FixedStepState = { tick: 0, accumulatorMs: 0 };

/** Pure step: returns how many ticks to advance and the new state. */
export function pumpFixedStep(
  config: FixedStepConfig,
  state: FixedStepState,
  deltaMs: number
): { readonly ticksToAdvance: number; readonly state: FixedStepState } {
  if (deltaMs < 0) {
    return { ticksToAdvance: 0, state };
  }
  const totalAccum = state.accumulatorMs + deltaMs;
  const uncappedTicks = Math.floor(totalAccum / config.tickMs);
  const ticksToAdvance = Math.min(uncappedTicks, config.maxTicksPerPump);
  const carriedAccum = totalAccum - ticksToAdvance * config.tickMs;
  return {
    ticksToAdvance,
    state: {
      tick: state.tick + ticksToAdvance,
      accumulatorMs: carriedAccum
    }
  };
}
