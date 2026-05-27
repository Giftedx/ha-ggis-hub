import type { HubBoundary } from '../wasm/boundary';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

export interface HubRoomRenderer {
  render(snapshot: DecodedSnapshot): void;
}

export interface HubRoomControllerOptions {
  readonly boundary: HubBoundary;
  readonly renderer: HubRoomRenderer;
}

export interface HubRoomController {
  /** Advance one fixed simulation tick with the given packed input. */
  tick(packedInput: number): void;
  /** Re-render the most recent snapshot without advancing. */
  render(): void;
  lastSnapshot(): DecodedSnapshot;
  destroy(): void;
}

export function createHubRoomController(options: HubRoomControllerOptions): HubRoomController {
  // The boundary already published the seed-zero snapshot at handle
  // construction. Decoding it here without advancing the sim avoids a
  // hidden constructor tick that the input log would not account for.
  let last = options.boundary.snapshot();

  return {
    tick(packedInput: number): void {
      last = options.boundary.tick(packedInput);
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
    },
  };
}
