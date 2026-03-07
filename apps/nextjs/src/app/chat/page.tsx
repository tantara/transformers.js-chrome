import type { Metadata } from "next";

import { Navbar } from "../_components/navbar";
import { ChatDemo } from "../_components/chat-demo";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Chat with open source LLMs running entirely in your browser via WebGPU.",
};

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ocean-foam">
      <Navbar />
      <main className="flex-1 pt-16">
        <ChatDemo />
      </main>
    </div>
  );
}
