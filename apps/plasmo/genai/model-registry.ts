import { Storage } from "@plasmohq/storage"

const storage = new Storage()

// Add WebGPU type declarations
declare global {
  interface Navigator {
    gpu: {
      requestAdapter(): Promise<GPUAdapter | null>
    }
  }

  interface GPUAdapter {
    features: Set<string>
  }
}

class ModelRegistry {
  static async checkWebGPU() {
    let fp16_supported = false
    try {
      const navigator = self.navigator

      if (!navigator.gpu) {
        throw Error("WebGPU not supported.")
      }
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) {
        throw new Error("WebGPU is not supported (no adapter found)")
      }
      fp16_supported = adapter.features.has("shader-f16")
      await storage.set("fp16_supported", fp16_supported)
    } catch (e) {
      fp16_supported = false
      await storage.set("fp16_supported", false)
    }
    return fp16_supported
  }

  static async fp16Supported(): Promise<boolean> {
    return await this.checkWebGPU()
  }
}

export { ModelRegistry }
