import type {
  ModelConfig,
  ModelTask,
  ReasoningModelConfig,
  TTSModelConfig
} from "~/src/types"

import { ModelRegistry } from "./model-registry"

const llmModelList: ModelConfig[] = [
  {
    task: "text-generation",
    model_id: "onnx-community/Llama-3.2-1B-Instruct-q4f16",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "text-generation",
    model_id: "onnx-community/Llama-3.2-3B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "text-generation",
    model_id: "onnx-community/gemma-2-2b-jpn-it",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "text-generation",
    model_id: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "text-generation",
    model_id: "HuggingFaceTB/SmolLM2-1.7B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "text-generation",
    model_id: "onnx-community/Qwen2.5-0.5B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "text-generation",
    model_id: "onnx-community/Qwen2.5-1.5B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  },
  {
    task: "text-generation",
    model_id: "onnx-community/Qwen2.5-Coder-3B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: true
  },
  {
    task: "text-generation",
    model_id: "onnx-community/Qwen2.5-Coder-1.5B-Instruct",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  }
]

const IMAGE_GENERATION_COMMAND_PREFIX = "/image"

const mllmModelList = async (): Promise<ModelConfig[]> => {
  const fp16_supported = await ModelRegistry.fp16Supported()
  return [
    {
      task: "multimodal-llm",
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
        prepare_inputs_embeds: "wasm", // TODO use "webgpu" when bug is fixed
        language_model: "webgpu",
        lm_head: "webgpu",
        gen_head: "webgpu",
        gen_img_embeds: "webgpu",
        image_decode: "webgpu"
      }
    }
  ]
}

const sttModelList: ModelConfig[] = [
  {
    task: "speech-to-text",
    model_id: "onnx-community/whisper-base",
    dtype: {
      encoder_model: "fp32", // 'fp16' works too
      decoder_model_merged: "q4" // or 'fp32' ('fp16' is broken)
    },
    device: "webgpu"
  }
]

const reasoningModelList: ModelConfig[] = [
  {
    task: "reasoning",
    model_id: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
    dtype: "q4f16",
    device: "webgpu",
    use_external_data_format: false
  }
]

const ttsModelList = async (): Promise<ModelConfig[]> => {
  const fp16_supported = await ModelRegistry.fp16Supported()
  return [
    {
      task: "text-to-speech",
      model_id: "onnx-community/OuteTTS-0.2-500M",
      dtype: fp16_supported ? "q4f16" : "q4", // Supported dtypes: fp32, fp16, q8, q4, q4f16
      device: "webgpu", // Supported devices: webgpu, wasm
      language: "en" // Supported languages in v0.2: en, zh, ja, ko
    }
  ]
}

const modelList = {
  "text-generation": llmModelList,
  // "multimodal-llm": mllmModelList,
  "speech-to-text": sttModelList,
  reasoning: reasoningModelList
} as { [key in ModelTask]: ModelConfig[] }

const getModelList = async (task: ModelTask) => {
  if (task === "multimodal-llm") {
    return await mllmModelList()
  } else if (task === "text-to-speech") {
    return await ttsModelList()
  }
  return modelList[task]
}

export { getModelList, IMAGE_GENERATION_COMMAND_PREFIX }
