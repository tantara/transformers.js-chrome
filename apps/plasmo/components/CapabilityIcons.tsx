import { Brain, Eye, ImagePlus } from "lucide-react"

import type { LLMModelConfig, ModelConfig } from "~/src/types"

import { Badge } from "./ui/badge"

function CapabilityIcons({ config }: { config: ModelConfig }) {
  if (config.task !== "llm") return null
  const llm = config as LLMModelConfig

  const caps: { icon: React.ReactNode; label: string }[] = []
  if (llm.supports_vision) {
    caps.push({ icon: <Eye className="h-3 w-3" />, label: "Vision" })
  }
  if (llm.supports_reasoning) {
    caps.push({ icon: <Brain className="h-3 w-3" />, label: "Reasoning" })
  }
  if (llm.supports_image_generation) {
    caps.push({ icon: <ImagePlus className="h-3 w-3" />, label: "Image Gen" })
  }

  if (caps.length === 0) return null

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {caps.map((cap) => (
        <Badge
          key={cap.label}
          variant="secondary"
          className="gap-0.5 px-1.5 py-0 text-[10px] font-medium">
          {cap.icon}
          {cap.label}
        </Badge>
      ))}
    </span>
  )
}

export default CapabilityIcons
