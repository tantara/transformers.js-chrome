import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  FormEvent,
  KeyboardEvent,
  UIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import tinyWhaleLogo from "../../nextjs/public/logo.svg";
import "./App.css";

type ChatRole = "system" | "user" | "assistant";
type Effort = "low" | "medium" | "high";

type ChatMessage = {
  role: Exclude<ChatRole, "system">;
  rawContent: string;
  content: string;
  reasoning?: string;
  reasoningEffort?: Effort;
};

type ModelInfo = {
  repo: string;
  url: string;
  filename: string;
  path: string;
  downloaded: boolean;
};

type ChatResponse = {
  message: {
    role: ChatRole;
    content: string;
  };
  model: ModelInfo;
};

type ProgressEventPayload = {
  stage: string;
  message: string;
  current?: number | null;
  total?: number | null;
  progress?: number | null;
  done?: boolean;
};

type DialogState =
  | { kind: "info"; model: ModelInfo }
  | { kind: "delete"; model: ModelInfo }
  | null;

const DEFAULT_SYSTEM_PROMPT =
  "You are a concise desktop assistant. Answer directly and keep responses useful.";
const DEFAULT_MODEL_URL = "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF";
const STORAGE_KEY = "tinywhale.models.v1";
const THINK_BLOCK_PATTERN = /<think>([\s\S]*?)<\/think>/gi;
const WEBSITE_URL = "https://tiny-whale.vercel.app";
const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/private-ai-assistant-runn/jojlpeliekadmokfnikappfadbjiaghp";

type MarkdownChildrenProps = {
  children?: ReactNode;
};

function reasoningEffort(reasoning: string): Effort {
  const words = reasoning.trim().split(/\s+/).filter(Boolean).length;
  if (words < 60) return "low";
  if (words < 180) return "medium";
  return "high";
}

function parseAssistantMessage(
  rawContent: string
): Pick<ChatMessage, "content" | "reasoning" | "reasoningEffort"> {
  const matches = [...rawContent.matchAll(THINK_BLOCK_PATTERN)];
  const reasoning = matches
    .map((match) => match[1].trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();

  let content = rawContent.replace(THINK_BLOCK_PATTERN, "").trim();

  if (!content && rawContent.includes("<think>")) {
    content = rawContent.replace(/<\/?think>/gi, "").trim();
  }

  return {
    content: content || "No final answer returned.",
    reasoning: reasoning || undefined,
    reasoningEffort: reasoning ? reasoningEffort(reasoning) : undefined
  };
}

function toConversationMessage(
  role: Exclude<ChatRole, "system">,
  rawContent: string
): ChatMessage {
  if (role === "assistant") {
    return {
      role,
      rawContent,
      ...parseAssistantMessage(rawContent)
    };
  }

  return {
    role,
    rawContent,
    content: rawContent
  };
}

function formatBytes(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function progressLabel(activity: ProgressEventPayload) {
  if (activity.current == null || activity.total == null || activity.total === 0) {
    return activity.message;
  }

  return `${activity.message} ${formatBytes(activity.current)} / ${formatBytes(activity.total)}`;
}

function modelMetaLabel(model: ModelInfo) {
  return model.downloaded ? "Downloaded" : "Remote only";
}

function openExternalUrl(url: string) {
  return openUrl(url).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

const markdownComponents: Components = {
  h1: ({ children }: MarkdownChildrenProps) => <h1>{children}</h1>,
  h2: ({ children }: MarkdownChildrenProps) => <h2>{children}</h2>,
  h3: ({ children }: MarkdownChildrenProps) => <h3>{children}</h3>,
  p: ({ children }: MarkdownChildrenProps) => <p>{children}</p>,
  ul: ({ children }: MarkdownChildrenProps) => <ul>{children}</ul>,
  ol: ({ children }: MarkdownChildrenProps) => <ol>{children}</ol>,
  li: ({ children }: MarkdownChildrenProps) => <li>{children}</li>,
  strong: ({ children }: MarkdownChildrenProps) => <strong>{children}</strong>,
  em: ({ children }: MarkdownChildrenProps) => <em>{children}</em>,
  pre: ({ children }: MarkdownChildrenProps) => <pre>{children}</pre>,
  blockquote: ({ children }: MarkdownChildrenProps) => <blockquote>{children}</blockquote>,
  table: ({ children }: MarkdownChildrenProps) => (
    <div className="markdown-table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        if (href) {
          void openExternalUrl(href);
        }
      }}>
      {children}
    </a>
  ),
  code: ({ children, className }: { children?: ReactNode; className?: string }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }

    return <code>{children}</code>;
  }
};

function readStoredModels() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as { models: ModelInfo[]; activeRepo: string | null };
  } catch {
    return null;
  }
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [modelUrlInput, setModelUrlInput] = useState(DEFAULT_MODEL_URL);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Select a model to load.");
  const [activity, setActivity] = useState<ProgressEventPayload | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const hasPaintedMessagesRef = useRef(false);

  const activeModel = useMemo(
    () => models.find((model) => model.repo === activeRepo) ?? null,
    [models, activeRepo]
  );

  const canSend = input.trim().length > 0 && !isBusy && !!activeModel;

  const requestMessages = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.rawContent
      })),
    [messages]
  );
  const lastMessageKey = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      return "empty";
    }

    return `${messages.length}:${lastMessage.role}:${lastMessage.rawContent}`;
  }, [messages]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen<ProgressEventPayload>("model-progress", (event) => {
      setActivity(event.payload.done ? null : event.payload);
      setStatus(progressLabel(event.payload));
    }).then((dispose) => {
      unlisten = dispose;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const restore = async () => {
      const stored = readStoredModels();

      if (stored?.models?.length) {
        setModels(stored.models);
        setActiveRepo(stored.activeRepo ?? stored.models[0].repo);
        setIsInitializing(false);
        return;
      }

      try {
        const model = await invoke<ModelInfo>("default_model");
        setModels([model]);
        setActiveRepo(model.repo);
      } catch (error) {
        setStatus(String(error));
      } finally {
        setIsInitializing(false);
      }
    };

    void restore();
  }, []);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        models,
        activeRepo
      })
    );
  }, [activeRepo, isInitializing, models]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const container = messagesRef.current;
      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior: hasPaintedMessagesRef.current ? "smooth" : "auto"
      });
      hasPaintedMessagesRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [lastMessageKey, !!activity]);

  const upsertModel = (nextModel: ModelInfo) => {
    setModels((current) => {
      const index = current.findIndex((model) => model.repo === nextModel.repo);
      if (index === -1) {
        return [...current, nextModel];
      }

      const cloned = [...current];
      cloned[index] = nextModel;
      return cloned;
    });
    setActiveRepo(nextModel.repo);
  };

  const handleAddModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    setStatus("Resolving model URL...");

    try {
      const model = await invoke<ModelInfo>("resolve_model", {
        url: modelUrlInput
      });
      upsertModel(model);
      setStatus(`Model added: ${model.repo}`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenModelUrl = async (url: string) => {
    await openExternalUrl(url);
  };

  const handleInfo = async (model: ModelInfo) => {
    setIsBusy(true);
    setStatus("Refreshing model metadata...");

    try {
      const refreshed = await invoke<ModelInfo>("resolve_model", {
        url: model.url
      });
      upsertModel(refreshed);
      setDialog({ kind: "info", model: refreshed });
      setStatus(`Model info: ${refreshed.repo}`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!dialog || dialog.kind !== "delete") {
      return;
    }

    const target = dialog.model;
    setIsBusy(true);
    setStatus("Removing model...");

    try {
      await invoke<ModelInfo>("delete_model", {
        model: target
      });

      setModels((current) => current.filter((model) => model.repo !== target.repo));
      setActiveRepo((current) => {
        if (current !== target.repo) {
          return current;
        }

        const fallback = models.find((model) => model.repo !== target.repo);
        return fallback?.repo ?? null;
      });
      setStatus(`Model removed: ${target.repo}`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setDialog(null);
      setIsBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!canSend || !activeModel) {
      return;
    }

    const userMessage = toConversationMessage("user", input.trim());

    setInput("");
    setIsBusy(true);
    setActivity({
      stage: "checking-cache",
      message: "Checking local model cache..."
    });
    setStatus("Checking local model cache...");
    setMessages((current) => [
      ...current,
      userMessage,
      toConversationMessage("assistant", "...")
    ]);

    try {
      const response = await invoke<ChatResponse>("chat", {
        request: {
          messages: [
            {
              role: "system",
              content: DEFAULT_SYSTEM_PROMPT
            },
            ...requestMessages,
            {
              role: userMessage.role,
              content: userMessage.rawContent
            }
          ],
          model: activeModel
        }
      });

      upsertModel(response.model);
      setStatus(`Ready: ${response.model.repo}`);
      setMessages((current) => [
        ...current.slice(0, -1),
        toConversationMessage("assistant", response.message.content)
      ]);
    } catch (error) {
      const message = String(error);
      setStatus(message);
      setMessages((current) => [
        ...current.slice(0, -1),
        toConversationMessage("assistant", `Error: ${message}`)
      ]);
    } finally {
      setActivity(null);
      setIsBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!canSend) {
      return;
    }

    void sendMessage();
  };

  const handleMessagesScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= 48;
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-top">
            <div className="hero-brand">
              <img className="hero-logo" src={tinyWhaleLogo} alt="TinyWhale logo" />
              <p className="eyebrow">TinyWhale</p>
            </div>
            <div className="hero-actions" aria-label="TinyWhale links">
              <button
                type="button"
                className="secondary-button hero-link"
                onClick={() => void handleOpenModelUrl(WEBSITE_URL)}>
                Website
              </button>
              <button
                type="button"
                className="secondary-button hero-link"
                onClick={() => void handleOpenModelUrl(CHROME_EXTENSION_URL)}>
                Chrome Extension
              </button>
            </div>
          </div>
          <h1>
            AI that runs on your device. <span>No cloud required.</span>
          </h1>
          <p className="hero-text">
            Chat with open source models in TinyWhale. Everything runs locally on your machine.
          </p>
        </div>
      </section>

      <section className="layout">
        <aside className="sidebar">
          <div className="panel">
            <p className="panel-label">Status</p>
            <p className="status-text">{status}</p>
          </div>

          <div className="panel">
            <p className="panel-label">Models</p>
            <form className="model-form" onSubmit={handleAddModel}>
              <label htmlFor="model-url">Hugging Face URL</label>
              <input
                id="model-url"
                value={modelUrlInput}
                onChange={(event) => setModelUrlInput(event.currentTarget.value)}
                placeholder={DEFAULT_MODEL_URL}
                disabled={isBusy}
              />
              <button className="secondary-button wide-button" type="submit" disabled={isBusy}>
                Add Model
              </button>
            </form>
            <p className="hint-text">
              GGUF only. Example: <code>{DEFAULT_MODEL_URL}</code>
            </p>

            <div className="model-list">
              {models.map((model) => (
                <article
                  key={model.repo}
                  className={`model-card ${activeModel?.repo === model.repo ? "active" : ""}`}
                  onClick={() => setActiveRepo(model.repo)}>
                  <div className="model-card-header">
                    <div>
                      <p className="model-title">{model.repo}</p>
                      <p className="model-file">{model.filename}</p>
                    </div>
                    {activeModel?.repo === model.repo ? (
                      <span className="active-pill">Active</span>
                    ) : null}
                  </div>
                  <p className="model-meta">{modelMetaLabel(model)}</p>
                  <div className="model-actions">
                    <button
                      type="button"
                      className="chip-button link-chip"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleOpenModelUrl(model.url);
                      }}>
                      Open
                    </button>
                    <button
                      type="button"
                      className="chip-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleInfo(model);
                      }}>
                      Info
                    </button>
                    <button
                      type="button"
                      className="chip-button danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDialog({ kind: "delete", model });
                      }}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-panel-header">
            <div>
              <p className="panel-label">Chat</p>
              <p className="chat-model-title">
                {activeModel ? activeModel.repo : "No active model"}
              </p>
              <p className="chat-model-meta">{activeModel ? activeModel.filename : ""}</p>
            </div>
            {activeModel ? (
              <button
                type="button"
                className="chip-button link-chip"
                onClick={() => void handleOpenModelUrl(activeModel.url)}>
                Open on Hugging Face
              </button>
            ) : null}
          </div>

          <div className="messages" ref={messagesRef} onScroll={handleMessagesScroll}>
            {messages.length === 0 && !activity ? (
              <div className="empty-state">
                <p>
                  {activeModel
                    ? `Active model: ${activeModel.repo}`
                    : "Add a GGUF model URL to start chatting."}
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <article
                    key={`${message.role}-${index}`}
                    className={`message-card ${message.role}`}>
                    <p className="message-role">{message.role}</p>
                    <div
                      className={`message-content markdown-content ${
                        message.role === "user" ? "user-markdown" : "assistant-markdown"
                      }`}>
                      <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </Markdown>
                    </div>
                    {message.reasoning ? (
                      <details className="reasoning-block">
                        <summary>
                          Reasoning effort:{" "}
                          <span className={`effort-badge ${message.reasoningEffort}`}>
                            {message.reasoningEffort}
                          </span>
                        </summary>
                        <pre>{message.reasoning}</pre>
                      </details>
                    ) : null}
                  </article>
                ))}

                {activity ? (
                  <article className="message-card system">
                    <p className="message-role">system</p>
                    <p className="message-content">{progressLabel(activity)}</p>
                    <p className="activity-stage">{activity.stage.replace(/-/g, " ")}</p>
                    {activity.progress != null ? (
                      <div className="progress-track" aria-hidden="true">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.max(2, Math.min(100, activity.progress * 100))}%`
                          }}
                        />
                      </div>
                    ) : (
                      <div className="progress-track indeterminate" aria-hidden="true">
                        <div className="progress-fill" />
                      </div>
                    )}
                  </article>
                ) : null}
              </>
            )}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={
                activeModel ? `Ask ${activeModel.repo} something...` : "Add a model first..."
              }
              rows={4}
              disabled={isBusy || !activeModel}
            />
            <button className="primary-button" type="submit" disabled={!canSend}>
              {isBusy ? "Thinking..." : "Send"}
            </button>
          </form>
        </section>
      </section>

      {dialog ? (
        <div className="dialog-backdrop" onClick={() => setDialog(null)}>
          <div
            className="dialog-card"
            onClick={(event) => {
              event.stopPropagation();
            }}>
            {dialog.kind === "info" ? (
              <>
                <p className="panel-label">Model Info</p>
                <p className="dialog-title">{dialog.model.repo}</p>
                <p className="dialog-copy">
                  Absolute path:{" "}
                  <code>{dialog.model.path || "Not downloaded yet."}</code>
                </p>
                <div className="dialog-actions">
                  <button
                    className="secondary-button"
                    onClick={() => void handleOpenModelUrl(dialog.model.url)}>
                    Open on Hugging Face
                  </button>
                  <button className="primary-button" onClick={() => setDialog(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="panel-label">Delete Model</p>
                <p className="dialog-title">{dialog.model.repo}</p>
                <p className="dialog-copy">
                  This unloads the model if it is active and removes the local GGUF cache for
                  <code> {dialog.model.filename}</code>.
                </p>
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button className="primary-button danger-button" onClick={() => void confirmDelete()}>
                    Confirm Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
