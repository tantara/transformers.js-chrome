"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

import { ChatMessages } from "./chat-messages";
import { GenerationSettings } from "./generation-settings";
import { ImagePreview } from "./image-preview";
import { Progress } from "./progress";

interface ContentBlock {
  type: "text" | "image";
  text?: string;
  image?: string;
}

interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

interface GenerationConfig {
  do_sample: boolean;
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
  repetition_penalty: number;
  max_new_tokens: number;
}

const DEFAULT_CONFIG: GenerationConfig = {
  do_sample: true,
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  min_p: 0.0,
  repetition_penalty: 1.0,
  max_new_tokens: 2048,
};

const STICKY_SCROLL_THRESHOLD = 120;

export function ChatDemo() {
  const worker = useRef<Worker | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"loading" | "ready" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);
  const [firstTokenLatency, setFirstTokenLatency] = useState<number | null>(
    null,
  );

  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);

  const onEnter = useCallback((message: string, imgs: string[]) => {
    const content: ContentBlock[] = [
      ...imgs.map((image) => ({ type: "image" as const, image })),
      { type: "text" as const, text: message },
    ];
    setMessages((prev) => [...prev, { role: "user", content }]);
    setTps(null);
    setNumTokens(null);
    setFirstTokenLatency(null);
    setIsRunning(true);
    setInput("");
    setImages([]);
  }, []);

  const onInterrupt = useCallback(() => {
    worker.current?.postMessage({ type: "interrupt" });
  }, []);

  const onReset = useCallback(() => {
    worker.current?.postMessage({ type: "reset" });
    setMessages([]);
    setTps(null);
    setNumTokens(null);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }, [input]);

  // Initialize worker
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(
        new URL("../_workers/llm-worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current.postMessage({ type: "check" });
    }

    const onMessageReceived = (e: MessageEvent) => {
      switch (e.data.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;
        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;
        case "progress":
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === e.data.file ? { ...item, ...e.data } : item,
            ),
          );
          break;
        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file),
          );
          break;
        case "ready":
          setStatus("ready");
          break;
        case "start":
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: [{ type: "text", text: "" }] },
          ]);
          break;
        case "update": {
          const { output, tps, numTokens, firstTokenLatency } = e.data;
          setTps(tps);
          setNumTokens(numTokens);
          if (firstTokenLatency) setFirstTokenLatency(firstTokenLatency);
          setMessages((prev) => {
            const cloned = [...prev];
            const last = cloned.at(-1);
            if (!last) return prev;
            cloned[cloned.length - 1] = {
              ...last,
              content: [
                {
                  type: "text",
                  text: (last.content[0]?.text ?? "") + output,
                },
              ],
            };
            return cloned;
          });
          break;
        }
        case "complete":
          setIsRunning(false);
          break;
        case "error":
          setError(e.data.data);
          setIsRunning(false);
          break;
      }
    };

    worker.current.addEventListener("message", onMessageReceived);
    return () => {
      worker.current?.removeEventListener("message", onMessageReceived);
    };
  }, []);

  // Send messages to worker
  useEffect(() => {
    if (messages.filter((x) => x.role === "user").length === 0) return;
    if (messages.at(-1)?.role === "assistant") return;
    setTps(null);
    worker.current?.postMessage({ type: "generate", data: messages });
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const el = chatContainerRef.current;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight <
      STICKY_SCROLL_THRESHOLD
    ) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isRunning]);

  // Sync config to worker
  useEffect(() => {
    worker.current?.postMessage({ type: "update-config", data: config });
  }, [config]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const readers = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e2) => resolve(e2.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    );
    const results = await Promise.all(readers);
    setImages((prev) => [...prev, ...results]);
    e.target.value = "";
  };

  const validInput = input.trim().length > 0;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* Loading / Not started */}
      {status === null && messages.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="max-w-lg px-4 text-center">
            <h2 className="mb-2 text-xl font-bold text-ocean-text sm:text-2xl">In-Browser AI Chat</h2>
            <p className="text-ocean-text-muted mb-4 text-sm sm:text-base">
              Chat with open source large language models running entirely in
              your browser via WebGPU. No data leaves your device.
            </p>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}
            <Button
              size="lg"
              className="bg-ocean-deep text-white hover:bg-ocean-deep/90"
              onClick={() => {
                worker.current?.postMessage({ type: "load" });
                setStatus("loading");
              }}
              disabled={status !== null}
            >
              Load Model
            </Button>
          </div>
        </div>
      )}

      {/* Loading progress */}
      {status === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md space-y-2 p-4">
            <p className="text-ocean-text-muted mb-2 text-center text-sm">
              {loadingMessage}
            </p>
            {progressItems.map(({ file, progress, total }, i) => (
              <Progress
                key={i}
                text={file}
                percentage={progress}
                total={total}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      {status === "ready" && (
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4">
          <div className="mx-auto max-w-4xl">
            <ChatMessages messages={messages} />
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center py-16">
                <p className="text-ocean-text-muted text-center">
                  Start a conversation. You can also upload images for vision
                  tasks.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TPS metrics */}
      {status === "ready" && tps !== null && tps > 0 && (
        <div className="text-ocean-text-muted flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-3 py-1 text-xs">
          {!isRunning && numTokens && tps && (
            <span>
              {numTokens} tokens in {(numTokens / tps).toFixed(2)}s
            </span>
          )}
          <span className="text-ocean-text font-medium">
            {tps.toFixed(2)} tok/s
          </span>
          {firstTokenLatency && (
            <span>TTFT: {(firstTokenLatency / 1000).toFixed(2)}s</span>
          )}
          {!isRunning && (
            <button
              onClick={onReset}
              className="text-ocean-text-muted hover:text-ocean-text ml-2 underline"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-ocean-mid/20 p-3 sm:p-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="border-ocean-mid/30 text-ocean-text-muted hover:bg-ocean-shallow text-xs"
            >
              {showSettings ? "Hide Settings" : "Settings"}
            </Button>
          </div>

          {showSettings && (
            <div className="mb-3">
              <GenerationSettings config={config} onChange={setConfig} />
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <ImagePreview
                  key={i}
                  src={src}
                  onRemove={() =>
                    setImages((prev) => prev.filter((_, j) => j !== i))
                  }
                />
              ))}
            </div>
          )}

          <div className="bg-ocean-shallow/50 flex items-end gap-2 rounded-lg border border-ocean-mid/20 p-2">
            <label
              className={cn(
                "hover:bg-ocean-light/50 cursor-pointer rounded-md p-2 transition-colors",
                status !== "ready" && "pointer-events-none opacity-50",
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <input
                ref={imageUploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleImageUpload}
                disabled={status !== "ready"}
              />
            </label>

            <textarea
              ref={textareaRef}
              className="placeholder:text-ocean-text-muted/60 text-ocean-text max-h-[200px] min-h-[24px] flex-1 resize-none border-0 bg-transparent py-2 text-sm outline-none"
              placeholder={
                status === "ready"
                  ? "Type a message..."
                  : "Load the model first..."
              }
              rows={1}
              value={input}
              disabled={status !== "ready"}
              onKeyDown={(e) => {
                if (
                  validInput &&
                  !isRunning &&
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  onEnter(input, images);
                }
              }}
              onChange={(e) => setInput(e.target.value)}
            />

            {isRunning ? (
              <Button
                variant="outline"
                size="icon"
                onClick={onInterrupt}
                className="shrink-0 border-ocean-mid/30 text-ocean-text hover:bg-ocean-shallow"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-4"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => validInput && onEnter(input, images)}
                disabled={!validInput || status !== "ready"}
                className="shrink-0 bg-ocean-deep text-white hover:bg-ocean-deep/90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="m5 12 7-7 7 7" />
                  <path d="M12 19V5" />
                </svg>
              </Button>
            )}
          </div>

          <p className="text-ocean-text-muted/60 mt-2 text-center text-xs">
            Generated content may be inaccurate or false. Everything runs
            locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
