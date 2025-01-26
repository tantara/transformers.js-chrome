import { Terminal } from "lucide-react"

import { IMAGE_GENERATION_COMMAND_PREFIX } from "~/genai/model-list"
import type { ModelTask } from "~/src/types"

import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

interface ChatExamplePrompt {
  display?: string
  prompt: string
  image?: string
}

const taskExamples = {
  "text-generation": [
    {
      prompt: "Give me some tips to improve my time management skills."
    },
    {
      prompt: "What is the difference between AI and ML?"
    },
    {
      prompt: "Write python code to compute the nth fibonacci number."
    }
  ],
  "multimodal-llm": [
    {
      display: "Generate an image of a cute baby fox.",
      prompt: `${IMAGE_GENERATION_COMMAND_PREFIX} A cute and adorable baby fox with big brown eyes, autumn leaves in the background enchanting, immortal, fluffy, shiny mane, Petals, fairyism, unreal engine 5 and Octane Render, highly detailed, photorealistic, cinematic, natural colors.`
    },
    {
      prompt: "Convert the formula into latex code.",
      image:
        "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/quadratic_formula.png"
    },
    {
      prompt: "What is the difference between AI and ML?"
    },
    {
      prompt: "Write python code to compute the nth fibonacci number."
    }
  ]
} as { [key in ModelTask]: ChatExamplePrompt[] }

function ChatExamples({
  task,
  onExampleClick
}: {
  task?: ModelTask
  onExampleClick: (example: ChatExamplePrompt) => void
}) {
  const examples = task ? taskExamples[task] : []
  const handleExampleClick = (example: ChatExamplePrompt) => {
    onExampleClick(example)
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        justifyContent: "flex-end"
      }}>
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Hello Local World!</AlertTitle>
        <AlertDescription>
          You can chat with large language models locally. No internet
          connection needed.
        </AlertDescription>
      </Alert>
      {examples.map((example, index) => (
        <div
          key={index}
          onClick={() => handleExampleClick(example)}
          className="text-sm bg-blue-100 rounded-md p-2 cursor-pointer hover:bg-blue-200">
          {example.display || example.prompt}
        </div>
      ))}
    </div>
  )
}

export default ChatExamples
