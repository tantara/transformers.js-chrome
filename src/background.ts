import { TextStreamer, type Message } from "@huggingface/transformers"
import type { GenerationConfig } from "@huggingface/transformers/types/generation/configuration_utils"

import { Storage } from "@plasmohq/storage"

import { DEFAULT_GENERATION_CONFIG } from "~/llm/default-config"
import { TextGenerationPipeline } from "~/llm/pipeline"
import { InterruptableEOSStoppingCriteria } from "~/llm/stopping-criteria"

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

// Create generic generate function, which will be reused for the different types of events.
const generate = async (messages: Message[]) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let progress = 0
  let [tokenizer, model] = await TextGenerationPipeline.getInstance((data) => {
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
  })

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
  const storage = new Storage()
  const generationConfig: GenerationConfig =
    (await storage.get("generation_config")) ?? DEFAULT_GENERATION_CONFIG
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
  const result = await generate(messages)

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
  console.log("message", message)
  if (message.action == "generate") {
    // Run model prediction asynchronously
    ;(async function () {
      // Perform generation
      let result = await generate(message.messages)

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
