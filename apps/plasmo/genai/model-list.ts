import type { LLMModelConfig, ModelConfig, ModelTask } from "~/src/types"

import { ModelRegistry } from "./model-registry"

const IMAGE_GENERATION_COMMAND_PREFIX = "/image"

const llmModelList: LLMModelConfig[] = [
  {
    task: "llm",
    model_id: "onnx-community/Qwen3.5-0.8B-ONNX",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true,
    supports_vision: true,
    auto_model: "image-text-to-text"
  },
  {
    task: "llm",
    model_id: "onnx-community/Llama-3.2-1B-Instruct-q4f16",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "llm",
    model_id: "onnx-community/Llama-3.2-3B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "llm",
    model_id: "onnx-community/gemma-2-2b-jpn-it",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "llm",
    model_id: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "llm",
    model_id: "HuggingFaceTB/SmolLM2-1.7B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "llm",
    model_id: "onnx-community/Qwen2.5-0.5B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "llm",
    model_id: "onnx-community/Qwen2.5-1.5B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "llm",
    model_id: "onnx-community/Qwen2.5-Coder-3B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "llm",
    model_id: "onnx-community/Qwen2.5-Coder-1.5B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "llm",
    model_id: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false,
    supports_reasoning: true
  }
]

const mllmModelList = async (): Promise<LLMModelConfig[]> => {
  const fp16_supported = await ModelRegistry.fp16Supported()
  return [
    {
      task: "llm",
      model_id: "onnx-community/Janus-1.3B-ONNX",
      dtype: fp16_supported
        ? {
            prepare_inputs_embeds: "q4",
            language_model: "q4f16",
            lm_head: "fp16",
            gen_head: "fp16",
            gen_img_embeds: "fp16",
            image_decode: "fp32"
          }
        : {
            prepare_inputs_embeds: "fp32",
            language_model: "q4",
            lm_head: "fp32",
            gen_head: "fp32",
            gen_img_embeds: "fp32",
            image_decode: "fp32"
          },
      device: {
        prepare_inputs_embeds: "wasm",
        language_model: "webgpu",
        lm_head: "webgpu",
        gen_head: "webgpu",
        gen_img_embeds: "webgpu",
        image_decode: "webgpu"
      },
      supports_vision: true,
      supports_image_generation: true,
      auto_model: "multimodality"
    }
  ]
}

const sttModelList: ModelConfig[] = [
  {
    task: "speech-to-text",
    model_id: "onnx-community/whisper-base",
    dtype: {
      encoder_model: "fp32",
      decoder_model_merged: "q4"
    },
    device: "webgpu"
  }
]

const ttsModelList = async (): Promise<ModelConfig[]> => {
  const fp16_supported = await ModelRegistry.fp16Supported()
  return [
    {
      task: "text-to-speech",
      model_id: "onnx-community/OuteTTS-0.2-500M",
      dtype: fp16_supported ? "q4f16" : "q4",
      device: "webgpu",
      language: "en"
    }
  ]
}

const getModelList = async (task: ModelTask): Promise<ModelConfig[]> => {
  if (task === "llm") {
    const mllm = await mllmModelList()
    return [...llmModelList, ...mllm]
  } else if (task === "text-to-speech") {
    return await ttsModelList()
  }
  return sttModelList
}

export { getModelList, IMAGE_GENERATION_COMMAND_PREFIX }
