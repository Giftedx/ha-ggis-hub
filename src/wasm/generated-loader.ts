import initGeneratedHubWasm, * as generatedHubWasm from '../generated/hub-wasm/hub_wasm.js';
import type { GeneratedHubWasmModule } from './boundary';

export async function loadGeneratedHubWasm(): Promise<GeneratedHubWasmModule> {
  await initGeneratedHubWasm();
  return generatedHubWasm;
}
