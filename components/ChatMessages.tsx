import { MathJax } from "better-react-mathjax"
import DOMPurify from "dompurify"
import { marked } from "marked"

import ChatCopyButton from "~/components/ChatCopyButton"
import ChatDownloadButton from "~/components/ChatDownloadButton"
import { cn } from "~/lib/utils"
import type { Message } from "~/src/types"

function ChatMessages({
  messages,
  messagesEndRef
}: {
  messages: Message[]
  messagesEndRef: React.RefObject<HTMLDivElement>
}) {
  const render = (text: string) => {
    return DOMPurify.sanitize(marked.parse(text, { async: false }))
  }

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
              <p
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
                {/* x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} */}
                {/* <MathJax>
                  {"$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"}
                </MathJax> */}
                <MathJax>
                  <span
                    className="markdown"
                    dangerouslySetInnerHTML={{
                      __html: render(msg.content)
                    }}
                  />
                </MathJax>
              </p>
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
