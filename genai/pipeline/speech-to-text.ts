import {
  AutoProcessor,
  AutoTokenizer,
  WhisperForConditionalGeneration
} from "@huggingface/transformers"

class AutomaticSpeechRecognitionPipeline {
  static model_id = "onnx-community/whisper-base"
  static tokenizer = null
  static processor = null
  static model = null

  static async getInstance(progress_callback = null) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback
    })
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback
    })

    this.model ??= WhisperForConditionalGeneration.from_pretrained(
      this.model_id,
      {
        dtype: {
          encoder_model: "fp32", // 'fp16' works too
          decoder_model_merged: "q4" // or 'fp32' ('fp16' is broken)
        },
        device: "webgpu",
        progress_callback
      }
    )

    return Promise.all([this.tokenizer, this.processor, this.model])
  }
}

export { AutomaticSpeechRecognitionPipeline }
