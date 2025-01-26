import {
  DATA_TYPES,
  DEVICE_TYPES
} from "@huggingface/transformers/src/utils/dtypes"

type ModelTask = "text-generation" | "multimodal-llm" | "speech-to-text"

interface Message {
  role: "user" | "assistant"
  content: string
  metadata?: string
  image?: string
}

interface ProgressItem {
  file: string
  progress: number
  total: number
}

interface BaseModelConfig {
  task: ModelTask
  model_id: string
}

interface LLMModelConfig extends BaseModelConfig {
  task: "text-generation"
  model_id: string
  dtype: DATA_TYPES
  device: DEVICE_TYPES
  use_external_data_format: boolean
}

interface MLLMModelConfig extends BaseModelConfig {
  task: "multimodal-llm"
  model_id: string
  dtype: {
    prepare_inputs_embeds: DATA_TYPES
    language_model: DATA_TYPES
    lm_head: DATA_TYPES
    gen_head: DATA_TYPES
    gen_img_embeds: DATA_TYPES
    image_decode: DATA_TYPES
  }
  device: {
    prepare_inputs_embeds: DEVICE_TYPES
    language_model: DEVICE_TYPES
    lm_head: DEVICE_TYPES
    gen_head: DEVICE_TYPES
    gen_img_embeds: DEVICE_TYPES
    image_decode: DEVICE_TYPES
  }
  // use_external_data_format: boolean
}

interface STTModelConfig extends BaseModelConfig {
  task: "speech-to-text"
  model_id: string
  dtype: {
    encoder_model: DATA_TYPES
    decoder_model_merged: DATA_TYPES
  }
  device: DEVICE_TYPES
}

type ModelConfig = LLMModelConfig | MLLMModelConfig | STTModelConfig

export type {
  Message,
  ProgressItem,
  ModelConfig,
  ModelTask,
  LLMModelConfig,
  MLLMModelConfig,
  STTModelConfig
}
