import type { HubBoundary } from '../wasm/boundary-v2';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

export interface HubRoomRenderer {
  render(snapshot: DecodedSnapshot): void;
}

export interface HubRoomInputSource {
  /** Returns the InputSnapshot raw u16 value packed into a number. */
  packedInput(): number;
}

export interface HubRoomControllerOptions {
  readonly boundary: HubBoundary;
  readonly renderer: HubRoomRenderer;
  readonly input: HubRoomInputSource;
}

export interface HubRoomController {
  tick(): void;
  render(): void;
  lastSnapshot(): DecodedSnapshot;
  destroy(): void;
}

export function createHubRoomController(options: HubRoomControllerOptions): HubRoomController {
  // Initial draw: pull the first snapshot by ticking with no input. The Sim
  // is constructed at the boundary's `init` and already published its
  // initial render snapshot; ticking with zero input here keeps the
  // accumulator-driven loop's invariants simple (every snapshot the
  // renderer sees was produced by a tick call).
  let last = options.boundary.tick(0);

  return {
    tick(): void {
      last = options.boundary.tick(options.input.packedInput());
      options.renderer.render(last);
    },
    render(): void {
      options.renderer.render(last);
    },
    lastSnapshot(): DecodedSnapshot {
      return last;
    },
    destroy(): void {
      options.boundary.destroy();
    }
  };
}
