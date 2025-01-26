import { BaseStreamer, TextStreamer } from "@huggingface/transformers"
import type { GenerationConfig } from "@huggingface/transformers/types/generation/configuration_utils"

import { Storage } from "@plasmohq/storage"

import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_LLM_MODEL_CONFIG
} from "~/genai/default-config"
import { IMAGE_GENERATION_COMMAND_PREFIX } from "~/genai/model-list"
import { ImageGenerationPipeline } from "~/genai/pipeline/multimodal-llm"
import { TextGenerationPipeline } from "~/genai/pipeline/text-generation"
import { InterruptableEOSStoppingCriteria } from "~/genai/stopping-criteria"

import type {
  LLMModelConfig,
  MLLMModelConfig,
  ModelConfig,
  ModelTask,
  STTModelConfig
} from "./types"

interface Message {
  role: string
  content: string
  image?: string
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

const sendToSidePanel = (data) => {
  chrome.runtime
    .sendMessage(data)
    .catch((err) => console.log("Side panel may not be open:", err))
}

const stopping_criteria = new InterruptableEOSStoppingCriteria([
  // tokenizer.eos_token_id
])

const getModelConfig = async (task?: ModelTask): Promise<ModelConfig> => {
  const storage = new Storage()
  const modelConfig = (await storage.get("model_config")) as ModelConfig | null
  if (modelConfig) {
    if (task && modelConfig.task !== task) {
      return DEFAULT_LLM_MODEL_CONFIG
    }
    return modelConfig
  } else {
    return DEFAULT_LLM_MODEL_CONFIG
  }
}

const getGenerationConfig = async (): Promise<GenerationConfig> => {
  const storage = new Storage()
  return (await storage.get("generation_config")) ?? DEFAULT_GENERATION_CONFIG
}

// Create generic generate function, which will be reused for the different types of events.
const generate = async (modelConfig: LLMModelConfig, messages: Message[]) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let progress = 0
  let [tokenizer, model] = await TextGenerationPipeline.getInstance(
    modelConfig,
    (data) => {
      // You can track the progress of the pipeline creation here.
      // e.g., you can send `data` back to the UI to indicate a progress bar
      if (progress != Math.floor(data.progress)) {
        progress = Math.floor(data.progress)
        // console.log("progress callback", data)
        sendToSidePanel({
          status: data.status,
          data
        })
      }
    }
  )

  sendToSidePanel({
    status: "assistant",
    data: {
      text: "Thinking..."
    }
  })

  // Actually run the model on the input text
  const inputs = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true
  })

  let startTime
  let numTokens: number = 0
  let tps: number = 0
  let firstTokenLatency: number = 0
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

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    decode_kwargs: {
      skip_special_tokens: true
    },
    callback_function,
    token_callback_function
  })

  /*
  {
    do_sample: true,
    top_k: 3,
    temperature: 0.7,
    top_p: 0.9,

    max_new_tokens: 256,
    repetition_penalty: 1.15
  }
  */
  const generationConfig = getGenerationConfig()
  const { past_key_values, sequences } = await model.generate({
    ...inputs,
    ...generationConfig,

    streamer,
    stopping_criteria,
    return_dict_in_generate: true
  })

  const decoded = tokenizer.batch_decode(sequences, {
    skip_special_tokens: false
  })

  // Send the output back to the main thread
  const latency = performance.now() - startTime

  // Actually run the model on the input text
  // console.log("generatedText", generatedText)

  sendToSidePanel({
    status: "end",
    data: {
      output: decoded,
      cleanedOutput: generatedText
    }
  })

  return {
    output: decoded,
    cleanedOutput: generatedText,
    tps,
    numTokens,
    latency,
    firstTokenLatency
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
      // Ignore the first batch of tokens (prompt)
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

  end() {
    /* no nothing */
  }
}

// Create generic generate function, which will be reused for the different types of events.
const understandImage = async (
  modelConfig: MLLMModelConfig,
  messages: Message[]
) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let progress = 0
  let [processor, model] = await ImageGenerationPipeline.getInstance(
    modelConfig,
    (data) => {
      // You can track the progress of the pipeline creation here.
      // e.g., you can send `data` back to the UI to indicate a progress bar
      if (progress != Math.floor(data.progress)) {
        progress = Math.floor(data.progress)
        // console.log("progress callback", data)
        sendToSidePanel({
          status: data.status,
          data
        })
      }
    }
  )

  // console.log("model loaded")

  sendToSidePanel({
    status: "assistant",
    data: {
      text: "Thinking..."
    }
  })

  // For this demo, we only respond to the last message
  const message = messages.at(-1)

  // Determine if the user wants to generate an image or text
  if (message.content.startsWith(IMAGE_GENERATION_COMMAND_PREFIX)) {
    const text = message.content.replace(IMAGE_GENERATION_COMMAND_PREFIX, "")

    const conversation = [
      {
        role: "User", // uses title case
        content: text
      }
    ]
    const inputs = await processor(conversation, {
      chat_template: "text_to_image"
    })

    const callback_function = (output) => {
      sendToSidePanel({
        status: "image-update",
        data: {
          ...output
        }
      })
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
    // Send the output back to the main thread
    sendToSidePanel({
      status: "image-update",
      data: {
        uint8Array,
        width,
        height,
        channels
      }
    })
  } else {
    const startProcessingTime = performance.now()
    const mapRole = (role: string) => {
      if (role === "user") {
        return "User"
      } else if (role === "assistant") {
        return "Assistant"
      }
      return "System"
    }
    let mllmMessages: Message[] = messages.map((message) => ({
      role: mapRole(message.role),
      ...message
    }))
    mllmMessages = messages.map((message) => {
      if (message.image) {
        return {
          role: mapRole(message.role),
          content: "<image_placeholder>\n" + message.content,
          images: [message.image]
        }
      } else {
        return {
          role: mapRole(message.role),
          content: message.content
        }
      }
    })
    if (mllmMessages.length == 1) {
      mllmMessages = [
        {
          role: "System",
          content:
            "You are a helpful assistant. Answer the user's questions in a concise manner."
        },
        ...mllmMessages
      ]
    }

    const inputs = await processor(mllmMessages)
    // console.log("processingTime", performance.now() - startProcessingTime)
    // console.log("inputs", inputs)

    let startTime
    let numTokens: number = 0
    let tps: number = 0
    let firstTokenLatency: number = 0
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
      // skip_special_tokens: true,
      decode_kwargs: {
        skip_special_tokens: true
      },
      callback_function,
      token_callback_function
    })

    /*
  {
    do_sample: true,
    top_k: 3,
    temperature: 0.7,
    top_p: 0.9,

    max_new_tokens: 256,
    repetition_penalty: 1.15
  }
  */
    const generationConfig = await getGenerationConfig()
    const { past_key_values, sequences } = await model.generate({
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

    // Send the output back to the main thread
    const latency = performance.now() - startTime

    // Actually run the model on the input text
    // console.log("generatedText", generatedText)

    sendToSidePanel({
      status: "end",
      data: {
        output: decoded,
        cleanedOutput: generatedText
      }
    })

    return {
      output: decoded,
      cleanedOutput: generatedText,
      tps,
      numTokens,
      latency,
      firstTokenLatency
    }
  }
}

const transcribe = async (modelConfig: STTModelConfig, messages: Message[]) => {
  return {
    output: "transcribed text",
    cleanedOutput: "transcribed text"
  }
}

////////////////////// 1. Context Menus //////////////////////
// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
chrome.runtime.onInstalled.addListener(function () {
  // Register a context menu item that will only show up for selection text.
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

// Perform inference when the user clicks a context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Ignore context menu clicks that are not for classifications (or when there is no input)
  if (
    info.menuItemId !== "rewrite-selection" &&
    info.menuItemId !== "summarize-selection"
  )
    return
  if (!info.selectionText) return

  // Perform classification on the selected text
  const action =
    info.menuItemId === "rewrite-selection" ? "Rewrite" : "Summarize"
  const messages: Message[] = [
    { role: "user", content: `${action}: ${info.selectionText}` }
  ]
  // open the side panel
  await chrome.sidePanel.open({ windowId: tab.windowId })
  // wait for the side panel to open
  await new Promise((resolve) => setTimeout(resolve, 500))
  sendToSidePanel({
    status: "append",
    data: {
      messages: messages.concat({ role: "assistant", content: "Thinking..." })
    }
  })
  const modelConfig = (await getModelConfig(
    "text-generation"
  )) as LLMModelConfig
  const result = await generate(modelConfig, messages)

  // Do something with the result
  chrome.scripting.executeScript({
    target: { tabId: tab.id }, // Run in the tab that the user clicked in
    args: [result], // The arguments to pass to the function
    // function: (result) => {
    func: (result) => {
      // The function to run in the context of the web page
      document.execCommand("insertText", false, result.cleanedOutput)
    }
  })
})
//////////////////////////////////////////////////////////////

////////////////////// 2. Message Events /////////////////////
// Listen for messages from the UI, process it, and send the result back.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Run model prediction asynchronously
  if (message.action == "generate") {
    ;(async function () {
      const modelConfig = await getModelConfig()
      let result = null

      // Perform generation
      if (modelConfig.task === "text-generation") {
        result = await generate(modelConfig, message.messages)
      } else if (modelConfig.task == "multimodal-llm") {
        result = await understandImage(modelConfig, message.messages)
      } else if (modelConfig.task == "speech-to-text") {
        result = await transcribe(modelConfig, message.messages)
      } else {
        sendResponse({ error: "Unsupported task" })
      }

      // Send response back to UI
      if (result) {
        sendResponse(result)
      } else {
        sendResponse({ error: "No result" })
      }
    })()
  } else if (message.action == "interrupt") {
    stopping_criteria.interrupt()
  }

  // return true to indicate we will send a response asynchronously
  // see https://stackoverflow.com/a/46628145 for more information
  return true
})
//////////////////////////////////////////////////////////////
