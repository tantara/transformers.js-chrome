import { Check, Download } from "lucide-react"
import { useState } from "react"

function ChatDownloadButton({ image }: { image: string }) {
  const [copied, setCopied] = useState(false)

  const handleDownload = async (image: string) => {
    try {
      setCopied(true)

      // Create a temporary anchor element
      const link = document.createElement("a")
      link.href = image
      // Extract filename from URL or use a default name
      const filename = `private-llm-${Date.now()}.png`
      link.download = filename

      // Programmatically click the link to trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => setCopied(false), 1000)
    } catch (error) {
      console.error("Download failed:", error)
      setCopied(false)
    }
  }

  return (
    <button
      onClick={() => handleDownload(image)}
      title="Download message"
      disabled={copied}>
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  )
}

export default ChatDownloadButton
