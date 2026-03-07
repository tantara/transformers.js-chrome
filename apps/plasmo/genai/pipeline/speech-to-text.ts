import {
  AutoProcessor,
  AutoTokenizer,
  pipeline,
  WhisperForConditionalGeneration
} from "@huggingface/transformers"

import type { STTModelConfig } from "~/src/types"

class AutomaticSpeechRecognitionPipeline {
  static tokenizer = null
  static processor = null
  static model = null

  static async getInstance(
    modelConfig: STTModelConfig,
    progress_callback = null
  ) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(modelConfig.model_id, {
      progress_callback
    })
    this.processor ??= AutoProcessor.from_pretrained(modelConfig.model_id, {
      progress_callback
    })

    this.model ??= WhisperForConditionalGeneration.from_pretrained(
      modelConfig.model_id,
      {
        dtype: modelConfig.dtype,
        device: modelConfig.device,
        progress_callback
      }
    )

    return Promise.all([this.tokenizer, this.processor, this.model])
  }
}

class AutomaticSpeechRecognitionMergedPipeline {
  static pipe = null

  static async getInstance(
    modelConfig: STTModelConfig,
    progress_callback = null
  ) {
    this.pipe ??= pipeline(
      "automatic-speech-recognition",
      modelConfig.model_id,
      {
        dtype: modelConfig.dtype,
        device: modelConfig.device,
        progress_callback
      }
    )

    return Promise.all([this.pipe])
  }
}

export {
  AutomaticSpeechRecognitionPipeline,
  AutomaticSpeechRecognitionMergedPipeline
}
