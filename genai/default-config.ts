import type { GenerationConfig } from "@huggingface/transformers/types/generation/configuration_utils"

import type { LLMModelConfig } from "~/src/types"

const DEFAULT_GENERATION_CONFIG = {
  do_sample: true,
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  min_p: 0.0,
  repetition_penalty: 1.0,
  max_new_tokens: 2048
} as GenerationConfig

const DEFAULT_LLM_MODEL_CONFIG = {
  task: "llm",
  model_id: "onnx-community/Qwen3.5-0.8B-ONNX",
  dtype: "q4f16",
  device: "webgpu",
  use_external_data_format: true,
  supports_vision: true,
  auto_model: "image-text-to-text"
} as LLMModelConfig

export { DEFAULT_GENERATION_CONFIG, DEFAULT_LLM_MODEL_CONFIG }
