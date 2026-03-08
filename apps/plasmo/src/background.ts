import {
  BaseStreamer,
  RawImage,
  TextStreamer
} from "@huggingface/transformers"
import type { GenerationConfig } from "@huggingface/transformers/types/generation/configuration_utils"

import { Storage } from "@plasmohq/storage"

import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_LLM_MODEL_CONFIG
} from "~/genai/default-config"
import { IMAGE_GENERATION_COMMAND_PREFIX } from "~/genai/model-list"
import { LLMPipeline } from "~/genai/pipeline/llm"
import {
  AutomaticSpeechRecognitionMergedPipeline
} from "~/genai/pipeline/speech-to-text"
import { InterruptableEOSStoppingCriteria } from "~/genai/stopping-criteria"
import MyWhisperTextStreamer from "~/genai/whisper-text-streamer"

import type {
  LLMModelConfig,
  ModelConfig,
  STTModelConfig,
  TTSModelConfig
} from "./types"

interface Message {
  role: string
  content: string
  image?: string
  blob?:
    | {
        audio: Float32Array
        audioLength: number
      }
    | {
        audioUrl: string
      }
}

// chrome.sidePanel is Chrome-only; Firefox uses sidebar_action (manifest-driven)
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))
}

const sendToSidePanel = (data) => {
  try {
    const result = chrome.runtime.sendMessage(data)
    // Chrome returns a Promise; Firefox MV2 returns undefined
    if (result?.catch) {
      result.catch((err) => console.log("Side panel may not be open:", err))
    }
  } catch (err) {
    console.log("Side panel may not be open:", err)
  }
}

const stopping_criteria = new InterruptableEOSStoppingCriteria([])

const getModelConfig = async (): Promise<ModelConfig> => {
  const storage = new Storage()
  const modelConfig = (await storage.get("model_config")) as ModelConfig | null
  return modelConfig ?? DEFAULT_LLM_MODEL_CONFIG
}

const getGenerationConfig = async (): Promise<GenerationConfig> => {
  const storage = new Storage()
  return (await storage.get("generation_config")) ?? DEFAULT_GENERATION_CONFIG
}

const progressCallback = (data) => {
  if (data.progress !== undefined) {
    sendToSidePanel({ status: data.status, data })
  }
}

class ProgressStreamer extends BaseStreamer {
  total: number
  on_progress: (data: any) => void
  count: number | null
  start_time: number | null

  constructor(total, on_progress) {
    super()
    this.total = total
    this.on_progress = on_progress
    this.count = null
    this.start_time = null
  }

  put(value) {
    if (this.count === null) {
      this.count = 0
      this.start_time = performance.now()
      return
    }
    const progress = ++this.count / this.total
    this.on_progress({
      count: this.count,
      total: this.total,
      progress,
      time: performance.now() - this.start_time
    })
  }

  end() {}
}

// Unified LLM generate function handling text, vision, reasoning, and image generation
const generate = async (
  modelConfig: LLMModelConfig,
  messages: Message[]
) => {
  const { tokenizer, model, processor } = await LLMPipeline.getInstance(
    modelConfig,
    progressCallback
  )

  sendToSidePanel({
    status: "assistant",
    data: { text: "Thinking..." }
  })

  // Image generation (Janus-style models with /image prefix)
  const lastMessage = messages.at(-1)
  if (
    modelConfig.supports_image_generation &&
    processor &&
    lastMessage.content.startsWith(IMAGE_GENERATION_COMMAND_PREFIX)
  ) {
    return await generateImage(model, processor, lastMessage)
  }

  // Janus-style vision (MultiModalityCausalLM with <image_placeholder>)
  if (modelConfig.auto_model === "multimodality" && processor) {
    return await generateWithJanus(model, processor, messages, modelConfig)
  }

  // Modern VLMs (Qwen3.5, etc.) — uses AutoProcessor with structured content
  if (modelConfig.auto_model === "image-text-to-text" && processor) {
    const hasImages = messages.some((m) => m.image)
    if (hasImages) {
      return await generateWithVision(model, processor, messages, modelConfig)
    }
    // Text-only with processor (use processor.apply_chat_template + processor)
    return await generateTextWithProcessor(model, processor, messages, modelConfig)
  }

  // Standard text-only generation (AutoTokenizer + AutoModelForCausalLM)
  return await generateText(tokenizer, model, messages, modelConfig)
}

const generateText = async (tokenizer, model, messages: Message[], modelConfig: LLMModelConfig) => {
  const inputs = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  })

  // Reasoning support
  let END_THINKING_TOKEN_ID
  let state: string = ""
  if (modelConfig.supports_reasoning) {
    ;[, END_THINKING_TOKEN_ID] = tokenizer.encode("<think></think>", {
      add_special_tokens: false
    })
    state = "thinking"
  }

  let startTime
  let numTokens = 0
  let tps = 0
  let firstTokenLatency = 0

  const token_callback_function = (tokens) => {
    startTime ??= performance.now()
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000
    }
    if (END_THINKING_TOKEN_ID && tokens[0] == END_THINKING_TOKEN_ID) {
      state = "answering"
    }
  }

  let generatedText = ""
  const callback_function = (output) => {
    generatedText += output
    if (firstTokenLatency === 0) {
      firstTokenLatency = performance.now() - startTime
    }
    sendToSidePanel({
      status: "update",
      data: {
        output,
        tps,
        numTokens,
        firstTokenLatency,
        latency: performance.now() - startTime,
        state
      }
    })
  }

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    decode_kwargs: { skip_special_tokens: true },
    callback_function,
    token_callback_function
  })

  const generationConfig = await getGenerationConfig()
  const { sequences } = await model.generate({
    ...inputs,
    ...generationConfig,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true
  })

  const decoded = tokenizer.batch_decode(sequences, {
    skip_special_tokens: false
  })

  sendToSidePanel({
    status: "end",
    data: { output: decoded, cleanedOutput: generatedText }
  })

  return {
    output: decoded,
    cleanedOutput: generatedText,
    tps,
    numTokens,
    latency: performance.now() - startTime,
    firstTokenLatency
  }
}

const generateWithJanus = async (model, processor, messages: Message[], modelConfig: LLMModelConfig) => {
  const mapRole = (role: string) => {
    if (role === "user") return "User"
    if (role === "assistant") return "Assistant"
    return "System"
  }

  let mllmMessages = messages.map((message) => {
    if (message.image) {
      return {
        role: mapRole(message.role),
        content: "<image_placeholder>\n" + message.content,
        images: [message.image]
      }
    }
    return { role: mapRole(message.role), content: message.content }
  })

  if (mllmMessages.length === 1) {
    mllmMessages = [
      {
        role: "System",
        content: "You are a helpful assistant. Answer the user's questions in a concise manner."
      },
      ...mllmMessages
    ]
  }

  const inputs = await processor(mllmMessages)

  let startTime
  let numTokens = 0
  let tps = 0
  let firstTokenLatency = 0

  const token_callback_function = () => {
    startTime ??= performance.now()
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000
    }
  }

  let generatedText = ""
  const callback_function = (output) => {
    generatedText += output
    if (firstTokenLatency === 0) {
      firstTokenLatency = performance.now() - startTime
    }
    sendToSidePanel({
      status: "update",
      data: {
        output,
        tps,
        numTokens,
        firstTokenLatency,
        latency: performance.now() - startTime
      }
    })
  }

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    decode_kwargs: { skip_special_tokens: true },
    callback_function,
    token_callback_function
  })

  const generationConfig = await getGenerationConfig()
  const { sequences } = await model.generate({
    ...inputs,
    max_new_tokens: generationConfig.max_new_tokens,
    do_sample: false,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true
  })

  const decoded = processor.tokenizer.batch_decode(sequences, {
    skip_special_tokens: false
  })

  sendToSidePanel({
    status: "end",
    data: { output: decoded, cleanedOutput: generatedText }
  })

  return {
    output: decoded,
    cleanedOutput: generatedText,
    tps,
    numTokens,
    latency: performance.now() - startTime,
    firstTokenLatency
  }
}

// Modern VLMs (Qwen3.5, etc.) — vision path with RawImage + structured content
const generateWithVision = async (model, processor, messages: Message[], modelConfig: LLMModelConfig) => {
  // Build conversation with structured content blocks
  const conversation = messages.map((message) => {
    if (message.image) {
      return {
        role: message.role,
        content: [
          { type: "image" },
          { type: "text", text: message.content }
        ]
      }
    }
    return {
      role: message.role,
      content: [{ type: "text", text: message.content }]
    }
  })

  const text = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
  })

  // Load images
  const images = messages
    .filter((m) => m.image)
    .map((m) => RawImage.read(m.image))
  const loadedImages = await Promise.all(images)
  const image = loadedImages.length === 1 ? loadedImages[0] : loadedImages

  const inputs = await processor(text, image)

  let startTime
  let numTokens = 0
  let tps = 0
  let firstTokenLatency = 0

  let END_THINKING_TOKEN_ID
  let state: string = ""
  if (modelConfig.supports_reasoning) {
    ;[, END_THINKING_TOKEN_ID] = processor.tokenizer.encode("<think></think>", {
      add_special_tokens: false
    })
    state = "thinking"
  }

  const token_callback_function = (tokens) => {
    startTime ??= performance.now()
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000
    }
    if (END_THINKING_TOKEN_ID && tokens[0] == END_THINKING_TOKEN_ID) {
      state = "answering"
    }
  }

  let generatedText = ""
  const callback_function = (output) => {
    generatedText += output
    if (firstTokenLatency === 0) {
      firstTokenLatency = performance.now() - startTime
    }
    sendToSidePanel({
      status: "update",
      data: {
        output,
        tps,
        numTokens,
        firstTokenLatency,
        latency: performance.now() - startTime,
        state
      }
    })
  }

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    decode_kwargs: { skip_special_tokens: true },
    callback_function,
    token_callback_function
  })

  const generationConfig = await getGenerationConfig()
  const outputs = await model.generate({
    ...inputs,
    ...generationConfig,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true
  })

  const decoded = processor.batch_decode(
    outputs.sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  )

  sendToSidePanel({
    status: "end",
    data: { output: decoded, cleanedOutput: generatedText }
  })

  return {
    output: decoded,
    cleanedOutput: generatedText,
    tps,
    numTokens,
    latency: performance.now() - startTime,
    firstTokenLatency
  }
}

// Modern VLMs text-only path — uses processor.apply_chat_template instead of tokenizer
const generateTextWithProcessor = async (model, processor, messages: Message[], modelConfig: LLMModelConfig) => {
  const conversation = messages.map((message) => ({
    role: message.role,
    content: [{ type: "text", text: message.content }]
  }))

  const text = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
  })

  const inputs = await processor(text)

  let END_THINKING_TOKEN_ID
  let state: string = ""
  if (modelConfig.supports_reasoning) {
    ;[, END_THINKING_TOKEN_ID] = processor.tokenizer.encode("<think></think>", {
      add_special_tokens: false
    })
    state = "thinking"
  }

  let startTime
  let numTokens = 0
  let tps = 0
  let firstTokenLatency = 0

  const token_callback_function = (tokens) => {
    startTime ??= performance.now()
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000
    }
    if (END_THINKING_TOKEN_ID && tokens[0] == END_THINKING_TOKEN_ID) {
      state = "answering"
    }
  }

  let generatedText = ""
  const callback_function = (output) => {
    generatedText += output
    if (firstTokenLatency === 0) {
      firstTokenLatency = performance.now() - startTime
    }
    sendToSidePanel({
      status: "update",
      data: {
        output,
        tps,
        numTokens,
        firstTokenLatency,
        latency: performance.now() - startTime,
        state
      }
    })
  }

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    decode_kwargs: { skip_special_tokens: true },
    callback_function,
    token_callback_function
  })

  const generationConfig = await getGenerationConfig()
  const outputs = await model.generate({
    ...inputs,
    ...generationConfig,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true
  })

  const decoded = processor.batch_decode(
    outputs.sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  )

  sendToSidePanel({
    status: "end",
    data: { output: decoded, cleanedOutput: generatedText }
  })

  return {
    output: decoded,
    cleanedOutput: generatedText,
    tps,
    numTokens,
    latency: performance.now() - startTime,
    firstTokenLatency
  }
}

const generateImage = async (model, processor, message: Message) => {
  const text = message.content.replace(IMAGE_GENERATION_COMMAND_PREFIX, "")
  const conversation = [{ role: "User", content: text }]
  const inputs = await processor(conversation, {
    chat_template: "text_to_image"
  })

  const callback_function = (output) => {
    sendToSidePanel({ status: "image-update", data: { ...output } })
  }

  const num_image_tokens = processor.num_image_tokens
  const streamer = new ProgressStreamer(num_image_tokens, callback_function)

  const outputs = await model.generate_images({
    ...inputs,
    min_new_tokens: num_image_tokens,
    max_new_tokens: num_image_tokens,
    do_sample: true,
    streamer
  })

  const image = await outputs[0]
  const { data: uint8Array, width, height, channels } = image
  sendToSidePanel({
    status: "image-update",
    data: { uint8Array, width, height, channels }
  })

  return { output: null, cleanedOutput: null }
}

const transcribe = async (modelConfig: STTModelConfig, messages: Message[]) => {
  const audioBlob = messages[0].blob as
    | { audio: Float32Array; audioLength: number }
    | { audioUrl: string }
  let audio: Float32Array | string | undefined = undefined

  if ("audio" in audioBlob) {
    const audioDict = audioBlob.audio
    const audioLength = audioBlob.audioLength
    audio = new Float32Array(audioLength)
    for (let i = 0; i < audioLength; i++) {
      audio[i] = audioDict[i]
    }
  } else if ("audioUrl" in audioBlob) {
    audio = audioBlob.audioUrl
  } else {
    sendToSidePanel({ status: "error", data: "No audio" })
    return null
  }

  const [transcriber] =
    await AutomaticSpeechRecognitionMergedPipeline.getInstance(
      modelConfig,
      (data) => {
        sendToSidePanel({ status: data.status, data })
      }
    )

  let startTime
  let numTokens = 0
  let tps = 0
  let firstTokenLatency = 0

  const token_callback_function = () => {
    startTime ??= performance.now()
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000
    }
  }

  function callback_function(item) {
    sendToSidePanel({
      status: "update",
      data: {
        output: item,
        tps,
        numTokens,
        firstTokenLatency,
        latency: performance.now() - startTime
      }
    })
  }

  const streamer = new MyWhisperTextStreamer(transcriber.tokenizer, {
    skip_prompt: true,
    decode_kwargs: { skip_special_tokens: true },
    callback_function,
    token_callback_function
  })

  let output = await transcriber(audio, {
    top_k: 0,
    do_sample: false,
    chunk_length_s: 30,
    stride_length_s: 5,
    language: "en",
    task: "transcribe",
    return_timestamps: true,
    force_full_sequences: false,
    streamer
  }).catch((error) => {
    console.log("error", error)
    sendToSidePanel({ status: "error", data: error })
    return null
  })

  sendToSidePanel({
    status: "end",
    data: {
      output: output.text.trim(),
      cleanedOutput: output.text.trim(),
      chunks: output.chunks
    }
  })

  return { output: "transcribed text", cleanedOutput: "transcribed text" }
}

////////////////////// 1. Context Menus //////////////////////
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "rewrite-selection",
    title: 'Rewrite "%s"',
    contexts: ["selection"]
  })
  chrome.contextMenus.create({
    id: "summarize-selection",
    title: 'Summarize "%s"',
    contexts: ["selection"]
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (
    info.menuItemId !== "rewrite-selection" &&
    info.menuItemId !== "summarize-selection"
  )
    return
  if (!info.selectionText) return

  const action =
    info.menuItemId === "rewrite-selection" ? "Rewrite" : "Summarize"
  const messages: Message[] = [
    { role: "user", content: `${action}: ${info.selectionText}` }
  ]
  // Open side panel (Chrome) or sidebar (Firefox)
  if (chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ windowId: tab.windowId })
  } else if (typeof browser !== "undefined" && browser.sidebarAction?.open) {
    await browser.sidebarAction.open()
  }
  await new Promise((resolve) => setTimeout(resolve, 500))
  sendToSidePanel({
    status: "append",
    data: {
      messages: messages.concat({ role: "assistant", content: "Thinking..." })
    }
  })
  const modelConfig = (await getModelConfig()) as LLMModelConfig
  let result
  try {
    result = await generate(modelConfig, messages)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[generate] context menu error:", msg)
    sendToSidePanel({
      status: "error",
      data: { message: msg.includes("Not enough memory") ? "Not enough GPU memory to run this model. Try a smaller model." : msg }
    })
    return
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [result],
    func: (result) => {
      document.execCommand("insertText", false, result.cleanedOutput)
    }
  })
})

////////////////////// 2. Message Events /////////////////////
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action == "generate") {
    ;(async function () {
      const modelConfig = await getModelConfig()
      let result = null

      try {
        if (modelConfig.task === "llm") {
          result = await generate(modelConfig as LLMModelConfig, message.messages)
        } else if (modelConfig.task == "speech-to-text") {
          result = await transcribe(modelConfig as STTModelConfig, message.messages)
        } else {
          sendResponse({ error: "Unsupported task" })
          return
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error("[generate] error:", msg)
        const userMsg = msg.includes("Not enough memory") ? "Not enough GPU memory to run this model. Try a smaller model." : msg
        sendToSidePanel({ status: "error", data: { message: userMsg } })
        sendResponse({ error: userMsg })
        return
      }

      if (result) {
        sendResponse(result)
      } else {
        sendResponse({ error: "No result" })
      }
    })()
  } else if (message.action == "interrupt") {
    stopping_criteria.interrupt()
  }

  return true
})
