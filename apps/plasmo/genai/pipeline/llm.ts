import {
  AutoModelForCausalLM,
  AutoModelForImageTextToText,
  AutoProcessor,
  AutoTokenizer,
  env,
  MultiModalityCausalLM
} from "@huggingface/transformers"

import type { LLMModelConfig } from "~/src/types"

import { ModelRegistry } from "~/genai/model-registry"

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false

// Multi-threading is not working in service workers.
// See https://github.com/whatwg/html/issues/8362
env.backends.onnx.wasm.numThreads = 1

// Let the bundled WASM file be used (avoid CDN version mismatch).
env.backends.onnx.wasm.wasmPaths = undefined

env.backends.onnx.wasm.proxy = false

/** Strip f16 from dtype values (q4f16 → q4, fp16 → fp32) */
const stripF16 = (d: string) =>
  d === "q4f16" ? "q4" : d === "fp16" ? "fp32" : d

const stripF16Dtype = (dtype: LLMModelConfig["dtype"]): LLMModelConfig["dtype"] =>
  typeof dtype === "string"
    ? stripF16(dtype)
    : Object.fromEntries(
        Object.entries(dtype).map(([k, v]) => [k, stripF16(v as string)])
      ) as LLMModelConfig["dtype"]

/** Replace "webgpu" → "wasm" in device */
const toWasmDevice = (device: LLMModelConfig["device"]): LLMModelConfig["device"] =>
  typeof device === "string"
    ? "wasm"
    : Object.fromEntries(
        Object.entries(device).map(([k, v]) => [k, v === "webgpu" ? "wasm" : v])
      ) as LLMModelConfig["device"]

/**
 * Resolve device and dtype for the current browser.
 * - WebGPU + fp16 supported → use as-is
 * - WebGPU available but no fp16 (e.g. Firefox) → keep WebGPU, strip f16 dtypes
 * - No WebGPU → fall back to WASM + strip f16 dtypes
 */
async function resolveDeviceAndDtype(
  device: LLMModelConfig["device"],
  dtype: LLMModelConfig["dtype"]
): Promise<{ device: LLMModelConfig["device"]; dtype: LLMModelConfig["dtype"] }> {
  const hasWebGPU = await ModelRegistry.webgpuAvailable()
  const hasFp16 = await ModelRegistry.fp16Supported()

  if (hasWebGPU && hasFp16) return { device, dtype }
  if (hasWebGPU) return { device, dtype: stripF16Dtype(dtype) }
  return { device: toWasmDevice(device), dtype: stripF16Dtype(dtype) }
}

class LLMPipeline {
  static model = null
  static tokenizer = null
  static processor = null
  static currentModelId: string = null

  static async getInstance(
    modelConfig: LLMModelConfig,
    progress_callback = null
  ) {
    // Reset if model changed
    if (this.currentModelId && this.currentModelId !== modelConfig.model_id) {
      this.model = null
      this.tokenizer = null
      this.processor = null
    }
    this.currentModelId = modelConfig.model_id

    const originalConsoleError = self.console.error
    self.console.error = () => {}

    const { device, dtype } = await resolveDeviceAndDtype(
      modelConfig.device,
      modelConfig.dtype
    )

    if (modelConfig.auto_model === "multimodality") {
      // Janus-style: AutoProcessor + MultiModalityCausalLM
      this.processor ??= AutoProcessor.from_pretrained(modelConfig.model_id, {
        progress_callback
      })
      this.model ??= MultiModalityCausalLM.from_pretrained(
        modelConfig.model_id,
        {
          dtype,
          device,
          progress_callback
        }
      )
      const [processor, model] = await Promise.all([
        this.processor,
        this.model
      ])
      self.console.error = originalConsoleError
      return { tokenizer: processor.tokenizer, model, processor }
    }

    if (modelConfig.auto_model === "image-text-to-text") {
      // Modern VLMs (Qwen3.5, etc.): AutoProcessor + AutoModelForImageTextToText
      this.processor ??= AutoProcessor.from_pretrained(modelConfig.model_id, {
        progress_callback
      })
      this.model ??= AutoModelForImageTextToText.from_pretrained(
        modelConfig.model_id,
        {
          dtype,
          device,
          use_external_data_format: modelConfig.use_external_data_format,
          progress_callback
        }
      )
      const [processor, model] = await Promise.all([
        this.processor,
        this.model
      ])
      self.console.error = originalConsoleError
      return { tokenizer: processor.tokenizer, model, processor }
    }

    // Text-only LLM: AutoTokenizer + AutoModelForCausalLM
    this.tokenizer ??= AutoTokenizer.from_pretrained(modelConfig.model_id, {
      progress_callback
    })

    this.model ??= AutoModelForCausalLM.from_pretrained(modelConfig.model_id, {
      dtype,
      device,
      use_external_data_format: modelConfig.use_external_data_format,
      progress_callback
    })

    const [tokenizer, model] = await Promise.all([this.tokenizer, this.model])
    self.console.error = originalConsoleError
    return { tokenizer, model, processor: null }
  }
}

export { LLMPipeline }
