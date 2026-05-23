import initGeneratedHubWasm, * as generatedHubWasm from '../generated/hub-wasm/hub_wasm.js';
import type { GeneratedHubWasmModule } from './boundary';

export async function loadGeneratedHubWasm(): Promise<GeneratedHubWasmModule> {
  await initGeneratedHubWasm();
  // The generated namespace import bundles `default`, the `HubHandle` class,
  // `hub_core_api_version`, and the linear-memory export. The cast bridges
  // the wasm-bindgen-generated `.d.ts` shape to the boundary's structural
  // type — both surfaces describe the same runtime values.
  return generatedHubWasm as unknown as GeneratedHubWasmModule;
}
