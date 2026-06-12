import initGeneratedHubWasm, * as generatedHubWasm from '../generated/hub-wasm/hub_wasm.js';
import type { GeneratedHubWasmModule } from './boundary';

export async function loadGeneratedHubWasm(): Promise<GeneratedHubWasmModule> {
  await initGeneratedHubWasm();
  // The generated namespace bundles `default`, `HubHandle`, `hub_core_api_version`,
  // and `replay_run` — the same surface described by GeneratedHubWasmModule.
  return generatedHubWasm;
}
