import {
  env,
  AutoProcessor,
  AutoModelForImageTextToText,
  TextStreamer,
  InterruptableStoppingCriteria,
  RawImage,
} from "@huggingface/transformers";

env.allowLocalModels = false;

const MODEL_ID = "onnx-community/Qwen3.5-0.8B-ONNX";
const DEFAULT_CONFIG = {
  do_sample: true,
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  min_p: 0.0,
  repetition_penalty: 1.0,
  max_new_tokens: 2048,
};

let generationConfig = { ...DEFAULT_CONFIG };

let fp16Supported = false;
async function check() {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
    fp16Supported = adapter.features.has("shader-f16");
    self.postMessage({ status: "check-complete", data: { fp16Supported } });
  } catch (e: any) {
    self.postMessage({ status: "error", data: e.toString() });
  }
}

class LLMPipeline {
  static processor: any = null;
  static model: any = null;
  static processorPromise: Promise<any> | null = null;
  static modelPromise: Promise<any> | null = null;

  static async getInstance(progressCallback: ((data: any) => void) | null = null) {
    this.processorPromise ??= AutoProcessor.from_pretrained(MODEL_ID, {
      progress_callback: progressCallback,
    });

    this.modelPromise ??= AutoModelForImageTextToText.from_pretrained(MODEL_ID, {
      dtype: "q4f16",
      device: "webgpu",
      use_external_data_format: true,
      progress_callback: progressCallback,
    });

    const [processor, model] = await Promise.all([this.processorPromise, this.modelPromise]);
    this.processor = processor;
    this.model = model;
    return { processor, model };
  }
}

const stoppingCriteria = new InterruptableStoppingCriteria();

async function load() {
  self.postMessage({ status: "loading", data: "Loading model..." });

  await LLMPipeline.getInstance((x: any) => {
    self.postMessage(x);
  });

  self.postMessage({ status: "ready" });
}

async function generate(messages: any[]) {
  const { processor, model } = await LLMPipeline.getInstance();

  const hasImages = messages.some((m: any) =>
    Array.isArray(m.content)
      ? m.content.some((c: any) => c.type === "image")
      : false
  );

  if (hasImages) {
    return generateWithVision(processor, model, messages);
  }
  return generateTextOnly(processor, model, messages);
}

async function generateTextOnly(processor: any, model: any, messages: any[]) {
  // Convert to structured format for processor
  const conversation = messages.map((m: any) => ({
    role: m.role,
    content: Array.isArray(m.content) ? m.content : [{ type: "text", text: m.content }],
  }));

  const text = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
  });
  const inputs = await processor(text);

  let startTime: number | null = null;
  let numTokens = 0;
  let tps = 0;
  let firstTokenLatency = 0;

  const tokenCallbackFunction = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime!)) * 1000;
    }
  };

  const callbackFunction = (output: string) => {
    if (firstTokenLatency === 0 && startTime) {
      firstTokenLatency = performance.now() - startTime;
    }
    self.postMessage({
      status: "update",
      output,
      tps,
      numTokens,
      firstTokenLatency,
    });
  };

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: callbackFunction,
    token_callback_function: tokenCallbackFunction,
  });

  self.postMessage({ status: "start" });

  const outputs = await model.generate({
    ...inputs,
    ...generationConfig,
    streamer,
    stopping_criteria: stoppingCriteria,
    return_dict_in_generate: true,
  });

  const decoded = processor.batch_decode(
    outputs.sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  );

  self.postMessage({
    status: "complete",
    output: decoded,
    tps,
    numTokens,
  });
}

async function generateWithVision(processor: any, model: any, messages: any[]) {
  // Build conversation with structured content blocks
  const conversation = messages.map((m: any) => {
    if (!Array.isArray(m.content)) {
      return { role: m.role, content: [{ type: "text", text: m.content }] };
    }
    return {
      role: m.role,
      content: m.content.map((c: any) => {
        if (c.type === "image") return { type: "image" };
        return { type: "text", text: c.text };
      }),
    };
  });

  const text = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
  });

  // Load images
  const imageUrls = messages
    .flatMap((m: any) => (Array.isArray(m.content) ? m.content : []))
    .filter((c: any) => c.type === "image" && c.image)
    .map((c: any) => c.image);

  const loadedImages = await Promise.all(imageUrls.map((url: string) => RawImage.read(url)));
  const image = loadedImages.length === 1 ? loadedImages[0] : loadedImages;

  const inputs = await processor(text, image);

  let startTime: number | null = null;
  let numTokens = 0;
  let tps = 0;
  let firstTokenLatency = 0;

  const tokenCallbackFunction = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime!)) * 1000;
    }
  };

  const callbackFunction = (output: string) => {
    if (firstTokenLatency === 0 && startTime) {
      firstTokenLatency = performance.now() - startTime;
    }
    self.postMessage({
      status: "update",
      output,
      tps,
      numTokens,
      firstTokenLatency,
    });
  };

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: callbackFunction,
    token_callback_function: tokenCallbackFunction,
  });

  self.postMessage({ status: "start" });

  const outputs = await model.generate({
    ...inputs,
    ...generationConfig,
    streamer,
    stopping_criteria: stoppingCriteria,
    return_dict_in_generate: true,
  });

  const decoded = processor.batch_decode(
    outputs.sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  );

  self.postMessage({
    status: "complete",
    output: decoded,
    tps,
    numTokens,
  });
}

self.addEventListener("message", async (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case "check":
      check();
      break;
    case "load":
      load();
      break;
    case "generate":
      stoppingCriteria.reset();
      generate(data);
      break;
    case "interrupt":
      stoppingCriteria.interrupt();
      break;
    case "reset":
      stoppingCriteria.reset();
      break;
    case "update-config":
      generationConfig = { ...DEFAULT_CONFIG, ...data };
      break;
  }
});
