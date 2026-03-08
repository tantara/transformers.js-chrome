import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { initLlama, releaseAllLlama } from "llama.rn";
import type { LlamaContext, NativeCompletionResult } from "llama.rn";

// TODO: Replace with actual model path
const MODEL_PATH = "/path/to/your/model.gguf";

const SYSTEM_PROMPT =
  "You are a helpful, harmless, and honest AI assistant. Be concise and helpful in your responses.";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timings?: NativeCompletionResult["timings"];
}

const randId = () => Math.random().toString(36).slice(2, 11);

export default function ChatScreen() {
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    return () => {
      releaseAllLlama();
    };
  }, []);

  const loadModel = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadProgress(0);

      const ctx = await initLlama(
        {
          model: MODEL_PATH,
          n_ctx: 2048,
          n_gpu_layers: Platform.OS === "ios" ? 99 : 0,
        },
        (progress) => {
          setLoadProgress(progress);
        },
      );

      setContext(ctx);
      setMessages([
        {
          id: randId(),
          role: "assistant",
          content: "Model loaded! How can I help you?",
        },
      ]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", `Failed to load model: ${message}`);
    } finally {
      setIsLoading(false);
      setLoadProgress(0);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!context || !input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: randId(),
      role: "user",
      content: input.trim(),
    };

    const assistantMessage: Message = {
      id: randId(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsGenerating(true);

    try {
      const conversationMessages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages
          .filter((m) => m.role !== "system")
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMessage.content },
      ];

      const result = await context.completion(
        {
          messages: conversationMessages,
          n_predict: 512,
          temperature: 0.7,
          top_p: 0.9,
          stop: ["<|end|>", "<|eot_id|>", "</s>"],
        },
        (data) => {
          const { content = "" } = data;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: content.replace(/^\s+/, "") }
                : m,
            ),
          );
        },
      );

      const finalContent = result.interrupted ? result.text : result.content;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: finalContent, timings: result.timings }
            : m,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: `Error: ${message}` }
            : m,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [context, input, isGenerating, messages]);

  const stopGeneration = useCallback(async () => {
    if (context) {
      await context.stopCompletion();
    }
  }, [context]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        className={`mb-2 max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? "self-end bg-primary" : "self-start bg-card"
        }`}
      >
        <Text
          className={`text-base ${
            isUser ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {item.content || "..."}
        </Text>
        {item.timings && (
          <Text className="mt-1 text-xs text-muted-foreground">
            {item.timings.predicted_per_second?.toFixed(1)} tok/s
          </Text>
        )}
      </View>
    );
  };

  if (!context) {
    return (
      <SafeAreaView className="bg-background flex-1">
        <Stack.Screen options={{ title: "Chat" }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-2xl font-bold text-foreground">
            On-Device AI Chat
          </Text>
          <Text className="mb-8 text-center text-muted-foreground">
            Run LLMs locally using llama.rn
          </Text>

          {isLoading ? (
            <View className="items-center">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-foreground">
                Loading model... {loadProgress}%
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                className="rounded-xl bg-primary px-8 py-4"
                onPress={loadModel}
              >
                <Text className="text-lg font-semibold text-primary-foreground">
                  Load Model
                </Text>
              </Pressable>
              <Text className="mt-4 text-center text-xs text-muted-foreground">
                Model path: {MODEL_PATH}
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Chat",
          headerRight: () =>
            isGenerating ? (
              <Pressable onPress={stopGeneration} className="mr-2">
                <Text className="font-semibold text-destructive">Stop</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View className="flex-row items-end gap-2 border-t border-border px-4 py-3">
          <TextInput
            className="min-h-[40px] flex-1 rounded-2xl border border-input bg-card px-4 py-2 text-base text-foreground"
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#7cc8e8"
            multiline
            editable={!isGenerating}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <Pressable
            className={`h-10 w-10 items-center justify-center rounded-full ${
              input.trim() && !isGenerating ? "bg-primary" : "bg-muted"
            }`}
            onPress={sendMessage}
            disabled={!input.trim() || isGenerating}
          >
            <Text className="text-lg text-primary-foreground">↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
