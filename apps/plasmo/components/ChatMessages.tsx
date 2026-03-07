import { MathJax } from "better-react-mathjax"
import DOMPurify from "dompurify"
import { Brain } from "lucide-react"
import { marked } from "marked"

import ChatCopyButton from "~/components/ChatCopyButton"
import ChatDownloadButton from "~/components/ChatDownloadButton"
import { cn } from "~/lib/utils"
import type { Message } from "~/src/types"

const render = (text: string) => {
  // Unwrap LaTeX fenced code blocks (```latex ... ```) so MathJax can render them
  text = text.replace(/```latex\s*\n([\s\S]*?)```/g, "$1")

  // Protect LaTeX blocks from marked's backslash escaping.
  const placeholders: string[] = []
  const ph = (s: string) => {
    placeholders.push(s)
    return `%%MATH_${placeholders.length - 1}%%`
  }

  // Display math: $$...$$, \[...\], \begin{...}...\end{...}
  text = text.replace(/\$\$[\s\S]*?\$\$/g, (m) => ph(m))
  text = text.replace(/\\\[[\s\S]*?\\\]/g, (m) => ph(m))
  text = text.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, (m) => ph(m))
  // Inline math: $...$, \(...\)
  text = text.replace(/\\\(.*?\\\)/g, (m) => ph(m))
  text = text.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (m) => ph(m))

  const result = DOMPurify.sanitize(
    marked.parse(text, {
      async: false,
      breaks: true
    })
  )

  // Restore LaTeX blocks
  return result.replace(/%%MATH_(\d+)%%/g, (_, i) => placeholders[Number(i)])
}

function ChatMessages({
  messages,
  messagesEndRef
}: {
  messages: Message[]
  messagesEndRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}>
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxWidth: "80%"
          }}>
          <div
            className="flex items-end gap-2"
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
            }}>
            <div
              className={cn(
                "text-sm relative group",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
              style={{
                padding: "12px 16px",
                borderRadius:
                  msg.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                wordWrap: "break-word",
                width: "fit-content",
                maxWidth: "100%",
                boxShadow:
                  msg.role === "user" ? "none" : "0 1px 2px rgba(0,0,0,0.1)"
              }}>
              <div
                style={{
                  overflowWrap: "anywhere"
                }}>
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Image for GenAI"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      marginBottom: "8px"
                    }}
                  />
                )}
                {msg.context && (
                  <div className="rounded-md p-2 bg-blue-100 mb-2">
                    <div className="flex flex-row text-center">
                      <Brain className="mb-2 h-5 w-5 mr-1" />
                      Reasoning
                    </div>
                    <MathJax dynamic={true}>
                      <span
                        className="markdown"
                        dangerouslySetInnerHTML={{
                          __html: render(msg.context)
                        }}
                      />
                    </MathJax>
                  </div>
                )}
                <MathJax dynamic={true}>
                  <span
                    className="markdown"
                    dangerouslySetInnerHTML={{
                      __html: render(
                        msg.context
                          ? msg.content.substring(msg.context.length)
                          : msg.content
                      )
                    }}
                  />
                </MathJax>
              </div>
            </div>
            {msg.role === "assistant" &&
              (msg.image ? (
                <ChatDownloadButton image={msg.image} />
              ) : (
                <ChatCopyButton text={msg.content} />
              ))}
          </div>
          {msg.metadata && (
            <div
              className="text-xs"
              style={{
                color: "#666",
                textAlign: msg.role === "user" ? "right" : "left",
                padding: "0 4px"
              }}>
              {msg.metadata}
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatMessages
