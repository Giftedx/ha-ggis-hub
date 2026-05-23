import { describe, expect, it } from 'vitest';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep, type FixedStepConfig } from './fixed-step';

const CONFIG: FixedStepConfig = { tickMs: 16.6667, maxTicksPerPump: 8 };

describe('pumpFixedStep', () => {
  it('advances zero ticks for a delta below one tick', () => {
    const result = pumpFixedStep(CONFIG, INITIAL_FIXED_STEP_STATE, 10);
    expect(result.ticksToAdvance).toBe(0);
    expect(result.state.accumulatorMs).toBeCloseTo(10);
  });

  it('advances one tick per tickMs of accumulated delta', () => {
    const result = pumpFixedStep(CONFIG, INITIAL_FIXED_STEP_STATE, 33.3334);
    expect(result.ticksToAdvance).toBe(2);
    expect(result.state.tick).toBe(2);
    expect(result.state.accumulatorMs).toBeCloseTo(0, 3);
  });

  it('caps ticks per pump to protect against long pauses', () => {
    const result = pumpFixedStep(CONFIG, INITIAL_FIXED_STEP_STATE, 10_000);
    expect(result.ticksToAdvance).toBe(8);
    // Remaining accumulator should reflect everything past the cap.
    expect(result.state.accumulatorMs).toBeGreaterThan(0);
  });

  it('treats negative deltas as zero', () => {
    const result = pumpFixedStep(CONFIG, INITIAL_FIXED_STEP_STATE, -5);
    expect(result.ticksToAdvance).toBe(0);
    expect(result.state).toEqual(INITIAL_FIXED_STEP_STATE);
  });

  it('preserves accumulator carry across pump calls', () => {
    const first = pumpFixedStep(CONFIG, INITIAL_FIXED_STEP_STATE, 20);
    const second = pumpFixedStep(CONFIG, first.state, 20);
    expect(first.ticksToAdvance + second.ticksToAdvance).toBe(2);
  });
});
