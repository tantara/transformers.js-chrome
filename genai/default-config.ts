import type { GenerationConfig } from "@huggingface/transformers/types/generation/configuration_utils"

import type { LLMModelConfig } from "~/src/types"

const DEFAULT_GENERATION_CONFIG = {
  do_sample: true,
  top_k: 3,
  temperature: 0.2,
  top_p: 0.9,
  max_new_tokens: 512,
  repetition_penalty: 1.0
} as GenerationConfig

const DEFAULT_LLM_MODEL_CONFIG = {
  task: "text-generation",
  model_id: "onnx-community/Qwen3.5-0.8B-ONNX",
  dtype: "q4f16",
  device: "webgpu",
  use_external_data_format: true
} as LLMModelConfig

export { DEFAULT_GENERATION_CONFIG, DEFAULT_LLM_MODEL_CONFIG }
