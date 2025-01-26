import { AutoProcessor, MultiModalityCausalLM } from "@huggingface/transformers"

import type { MLLMModelConfig } from "~/src/types"

class ImageGenerationPipeline {
  static model = null
  static tokenizer = null
  static processor = null

  static async getInstance(
    modelConfig: MLLMModelConfig,
    progress_callback = null
  ) {
    console.log("modelConfig", modelConfig)
    const modelId = modelConfig.model_id

    this.processor ??= AutoProcessor.from_pretrained(modelId, {
      progress_callback
    })

    this.model ??= MultiModalityCausalLM.from_pretrained(modelId, {
      // {
      //     prepare_inputs_embeds: "q4",
      //     language_model: "q4f16",
      //     lm_head: "fp16",
      //     gen_head: "fp16",
      //     gen_img_embeds: "fp16",
      //     image_decode: "fp32"
      //   }
      dtype: modelConfig.dtype,
      // {
      //     prepare_inputs_embeds: "wasm", // TODO use "webgpu" when bug is fixed
      //     language_model: "webgpu",
      //     lm_head: "webgpu",
      //     gen_head: "webgpu",
      //     gen_img_embeds: "webgpu",
      //     image_decode: "webgpu"
      //   },
      device: modelConfig.device,
      progress_callback
    })

    return Promise.all([this.processor, this.model])
  }
}

export { ImageGenerationPipeline }
