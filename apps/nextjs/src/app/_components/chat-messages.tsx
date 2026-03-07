"use client";

import { useState } from "react";
import Markdown from "react-markdown";

interface ContentBlock {
  type: "text" | "image";
  text?: string;
  image?: string;
}

interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

function CopyButton({ text, isUser }: { text: string; isUser: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`absolute -bottom-6 ${isUser ? "right-1" : "left-1"} text-ocean-text-muted/50 hover:text-ocean-text-muted`}
      aria-label="Copy message"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  );
}

const markdownComponents = {
  h1: ({ children }: any) => <h1 className="mb-3 mt-4 text-xl font-bold first:mt-0">{children}</h1>,
  h2: ({ children }: any) => <h2 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h2>,
  h3: ({ children }: any) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  code: ({ children, className }: any) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-ocean-abyss/10 p-3 font-mono text-xs dark:bg-white/10">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-ocean-abyss/10 px-1 py-0.5 font-mono text-xs dark:bg-white/10">
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => <pre className="mb-2 last:mb-0">{children}</pre>,
  blockquote: ({ children }: any) => (
    <blockquote className="mb-2 border-l-2 border-ocean-mid/40 pl-3 italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-ocean-mid/30" />,
  table: ({ children }: any) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="border-b border-ocean-mid/30">{children}</thead>,
  th: ({ children }: any) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }: any) => <td className="border-t border-ocean-mid/20 px-2 py-1">{children}</td>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-ocean-deep underline hover:no-underline">
      {children}
    </a>
  ),
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const textContent = message.content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");

  return (
    <div className={`group relative flex ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3 py-2.5 sm:max-w-[85%] sm:px-4 sm:py-3 ${
          isUser ? "bg-ocean-deep text-white dark:text-ocean-abyss" : "bg-ocean-shallow"
        }`}
      >
        {message.content.map((block, i) => {
          if (block.type === "image" && block.image) {
            return (
              <img
                key={i}
                src={block.image}
                alt="Uploaded"
                className="mb-2 max-h-60 max-w-full rounded-lg"
              />
            );
          }
          if (block.type === "text") {
            const text = block.text ?? "";
            if (text === "" && !isUser) {
              return (
                <div key={i} className="flex gap-1 py-1">
                  <div className="bg-ocean-mid h-2 w-2 animate-pulse rounded-full" />
                  <div className="bg-ocean-mid h-2 w-2 animate-pulse rounded-full [animation-delay:200ms]" />
                  <div className="bg-ocean-mid h-2 w-2 animate-pulse rounded-full [animation-delay:400ms]" />
                </div>
              );
            }
            if (isUser) {
              return (
                <p key={i} className="whitespace-pre-wrap break-words text-sm">
                  {text}
                </p>
              );
            }
            return (
              <div key={i} className="max-w-none break-words text-sm">
                <Markdown components={markdownComponents}>
                  {text}
                </Markdown>
              </div>
            );
          }
          return null;
        })}
      </div>
      {textContent && <CopyButton text={textContent} isUser={isUser} />}
    </div>
  );
}

export function ChatMessages({ messages }: { messages: Message[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-1 py-4">
      {messages.map((message, i) => (
        <MessageBubble key={i} message={message} />
      ))}
    </div>
  );
}
