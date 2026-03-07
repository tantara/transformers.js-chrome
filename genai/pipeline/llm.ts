import {
  AutoModelForCausalLM,
  AutoModelForImageTextToText,
  AutoProcessor,
  AutoTokenizer,
  env,
  MultiModalityCausalLM
} from "@huggingface/transformers"

import type { LLMModelConfig } from "~/src/types"

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false

// Multi-threading is not working in service workers.
// See https://github.com/whatwg/html/issues/8362
env.backends.onnx.wasm.numThreads = 1

// Let the bundled WASM file be used (avoid CDN version mismatch).
env.backends.onnx.wasm.wasmPaths = undefined

env.backends.onnx.wasm.proxy = false

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

    if (modelConfig.auto_model === "multimodality") {
      // Janus-style: AutoProcessor + MultiModalityCausalLM
      this.processor ??= AutoProcessor.from_pretrained(modelConfig.model_id, {
        progress_callback
      })
      this.model ??= MultiModalityCausalLM.from_pretrained(
        modelConfig.model_id,
        {
          dtype: modelConfig.dtype,
          device: modelConfig.device,
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
          dtype: modelConfig.dtype,
          device: modelConfig.device,
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
      dtype: modelConfig.dtype,
      device: modelConfig.device,
      use_external_data_format: modelConfig.use_external_data_format,
      progress_callback
    })

    const [tokenizer, model] = await Promise.all([this.tokenizer, this.model])
    self.console.error = originalConsoleError
    return { tokenizer, model, processor: null }
  }
}

export { LLMPipeline }
