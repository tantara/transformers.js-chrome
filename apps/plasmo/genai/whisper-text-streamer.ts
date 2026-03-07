import { TextStreamer } from "@huggingface/transformers"

class MyWhisperTextStreamer extends TextStreamer {
  /**
   * @param {import('../tokenizers.js').WhisperTokenizer} tokenizer
   * @param {Object} options
   * @param {boolean} [options.skip_prompt=false] Whether to skip the prompt tokens
   * @param {function(string): void} [options.callback_function=null] Function to call when a piece of text is ready to display
   * @param {function(bigint[]): void} [options.token_callback_function=null] Function to call when a new token is generated
   * @param {function(number): void} [options.on_chunk_start=null] Function to call when a new chunk starts
   * @param {function(number): void} [options.on_chunk_end=null] Function to call when a chunk ends
   * @param {function(): void} [options.on_finalize=null] Function to call when the stream is finalized
   * @param {number} [options.time_precision=0.02] Precision of the timestamps
   * @param {boolean} [options.skip_special_tokens=true] Whether to skip special tokens when decoding
   * @param {Object} [options.decode_kwargs={}] Additional keyword arguments to pass to the tokenizer's decode method
   */
  timestamp_begin: number
  time_precision: number
  waiting_for_timestamp: boolean
  on_chunk_start: (time: number) => void
  on_chunk_end: (time: number) => void
  on_finalize: () => void

  constructor(
    tokenizer,
    {
      skip_prompt = false,
      callback_function = null,
      token_callback_function = null,
      on_chunk_start = null,
      on_chunk_end = null,
      on_finalize = null,
      time_precision = 0.02,
      skip_special_tokens = true,
      decode_kwargs = {}
    } = {}
  ) {
    super(tokenizer, {
      skip_prompt,
      callback_function,
      token_callback_function,
      decode_kwargs: { skip_special_tokens, ...decode_kwargs }
    })
    this.timestamp_begin = tokenizer.timestamp_begin

    this.on_chunk_start = on_chunk_start
    this.on_chunk_end = on_chunk_end
    this.on_finalize = on_finalize

    this.time_precision = time_precision

    this.waiting_for_timestamp = false
  }

  /**
   * @param {bigint[][]} value
   */
  put(value) {
    if (value.length > 1) {
      throw Error("WhisperTextStreamer only supports batch size of 1")
    }
    const tokens = value[0]

    // Check if the token is a timestamp
    if (tokens.length === 1) {
      const offset = Number(tokens[0]) - this.timestamp_begin
      if (offset >= 0) {
        const time = offset * this.time_precision
        if (this.waiting_for_timestamp) {
          this.on_chunk_end?.(time)
        } else {
          this.on_chunk_start?.(time)
        }
        this.waiting_for_timestamp = !this.waiting_for_timestamp // Toggle
        value = [[]] // Skip timestamp
        return
      }
    }
    super.put(value)
  }

  end() {
    super.end()
    this.on_finalize?.()
  }
}

export default MyWhisperTextStreamer
