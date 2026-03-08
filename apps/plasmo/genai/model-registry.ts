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
    requestDevice(): Promise<GPUDevice>
  }

  interface GPUDevice {
    destroy(): void
  }
}

class ModelRegistry {
  static _webgpuAvailable: boolean | null = null

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
      // Verify WebGPU actually works by requesting a device
      const device = await adapter.requestDevice()
      device.destroy()
      this._webgpuAvailable = true
      fp16_supported = adapter.features.has("shader-f16")
      await storage.set("fp16_supported", fp16_supported)
    } catch (e) {
      this._webgpuAvailable = false
      fp16_supported = false
      await storage.set("fp16_supported", false)
    }
    return fp16_supported
  }

  static async fp16Supported(): Promise<boolean> {
    return await this.checkWebGPU()
  }

  /** Returns true if WebGPU is available in this browser context */
  static async webgpuAvailable(): Promise<boolean> {
    if (this._webgpuAvailable === null) {
      await this.checkWebGPU()
    }
    return this._webgpuAvailable
  }
}

export { ModelRegistry }
