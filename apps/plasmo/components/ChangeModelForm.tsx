import { AudioLines, LetterText } from "lucide-react"
import { useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { DEFAULT_LLM_MODEL_CONFIG } from "~/genai/default-config"
import { getModelList } from "~/genai/model-list"
import type { ModelConfig, ModelTask } from "~/src/types"

import CapabilityIcons from "./CapabilityIcons"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "./ui/accordion"
import { Alert, AlertDescription } from "./ui/alert"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Label } from "./ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"

function ChangeModelForm() {
  const [config, setConfig] = useStorage<ModelConfig>(
    "model_config",
    DEFAULT_LLM_MODEL_CONFIG
  )
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([])
  const [modelTask, setModelTask] = useState(config.task)

  useEffect(() => {
    getModelList(modelTask).then((models) => {
      setAvailableModels(models)
    })
  }, [modelTask])

  const handleChange = async (model: ModelConfig) => {
    await setConfig(model)
    alert("Model changed. Please refresh the page to apply the changes.")
    chrome.runtime.reload()
  }

  return (
    <div className="flex flex-col max-w">
      <Card>
        <CardContent className="grid gap-6 mt-4">
          <RadioGroup
            defaultValue={modelTask}
            value={modelTask}
            className="grid grid-cols-3 gap-4"
            onValueChange={(value) => {
              setModelTask(value as ModelTask)
            }}>
            <div>
              <RadioGroupItem
                value="llm"
                id="llm"
                className="peer sr-only"
                aria-label="Language Model"
                checked={modelTask === "llm"}
              />
              <Label
                htmlFor="llm"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                <LetterText className="mb-3 h-6 w-6" />
                Language Model
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="speech-to-text"
                id="speech-to-text"
                className="peer sr-only"
                aria-label="Speech to Text"
                checked={modelTask === "speech-to-text"}
              />
              <Label
                htmlFor="speech-to-text"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ">
                <AudioLines className="mb-3 h-6 w-6" />
                Speech to Text
              </Label>
            </div>
          </RadioGroup>
          <Accordion type="single" collapsible defaultValue={config.model_id}>
            {availableModels.map((model) => (
              <AccordionItem value={model.model_id} key={model.model_id}>
                <AccordionTrigger>
                  <span className="flex items-center">
                    {model.model_id}
                    <CapabilityIcons config={model} />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {config.model_id == model.model_id && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        You're using this model {model.model_id}.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="text-sm text-gray-500 bg-gray-100 p-2 rounded-md my-2">
                    {JSON.stringify(model, null, 2)}
                  </div>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        window.open(
                          `https://huggingface.co/${model.model_id}`,
                          "_blank"
                        )
                      }}>
                      Model Card
                    </Button>
                    <Button
                      variant="default"
                      className="w-full"
                      disabled={config.model_id == model.model_id}
                      onClick={() => {
                        handleChange(model)
                      }}>
                      Use
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChangeModelForm
