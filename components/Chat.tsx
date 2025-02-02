import { Label } from "@radix-ui/react-label"
import {
  ArrowUp,
  Braces,
  Brush,
  CircleStop,
  FileImage,
  FileText,
  LinkIcon,
  Mic,
  Upload
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"

import { useStorage } from "@plasmohq/storage/hook"

import ChatExamples from "~/components/ChatExamples"
import ChatHeader from "~/components/ChatHeader"
import ChatMessages from "~/components/ChatMessages"
import ChatProgress from "~/components/ChatProgress"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { DEFAULT_LLM_MODEL_CONFIG } from "~/genai/default-config"
import { IMAGE_GENERATION_COMMAND_PREFIX } from "~/genai/model-list"
import type { Message, ModelConfig, ProgressItem } from "~/src/types"

// import AudioRecorder from "./AudioRecorder"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu"
import { Textarea } from "./ui/textarea"

type AudioChunk = {
  text: string
  timestamp: [number, number]
}

function Chat() {
  const [inputText, setInputText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("")
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>("")
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [maxAudioSeconds, setMaxAudioSeconds] = useState(60)
  const [audioChunks, setAudioChunks] = useState<{
    text: string
    chunks: AudioChunk[]
  }>({
    text: "",
    chunks: []
  })

  const [modelConfig, setModelConfig] = useStorage<ModelConfig>(
    "model_config",
    DEFAULT_LLM_MODEL_CONFIG
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [enableDropzone, setEnableDropzone] = useState(false)
  const [openAudioUrlDialog, setOpenAudioUrlDialog] = useState(false)
  const [openImageUrlDialog, setOpenImageUrlDialog] = useState(false)

  const WHISPER_SAMPLING_RATE = 16_000
  const MAX_AUDIO_LENGTH = 60 // seconds
  // const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH

  const handleFileUpload = useCallback((files: File[]) => {
    const file = files[0]
    if (file && file.type.startsWith("image/")) {
      // Create an image element to load the file
      const img = new Image()
      img.onload = () => {
        // Max dimensions
        const MAX_WIDTH = 512
        const MAX_HEIGHT = 512

        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        // Create canvas and resize
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob and create URL
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          setPreviewImageUrl(url)
        }, file.type)
      }

      // Load image from file
      img.src = URL.createObjectURL(file)
    } else if (file && file.type.startsWith("audio/")) {
      // Create a new blob from the file with the same type
      const blob = new Blob([file], { type: file.type })
      setAudioBlob(blob)
      setPreviewAudioUrl(URL.createObjectURL(file))
    }
  }, [])

  useEffect(() => {
    setEnableDropzone(
      ["multimodal-llm", "speech-to-text"].includes(modelConfig.task)
    )
  }, [modelConfig.task])

  const {
    getRootProps,
    getInputProps,
    open: openDropzone,
    isDragActive
  } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "audio/*": [".mp3", ".wav", ".m4a"]
    },
    onDrop: handleFileUpload,
    maxFiles: 1,
    multiple: true,
    disabled: !enableDropzone,
    noClick: true
  })

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile()
            if (file) handleFileUpload([file])
          } else if (items[i].type.indexOf("audio") !== -1) {
            const file = items[i].getAsFile()
            if (file) handleFileUpload([file])
          }
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [handleFileUpload])

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.status === "initiate") {
        console.log("Model initiate:", message)
        setProgressItems((prev) => [...prev, message.data])

        setMessages((prev) =>
          prev.map((m) => {
            if (m.content === "Thinking...") {
              return { ...m, content: "Loading model..." }
            }
            return m
          })
        )
      } else if (message.status === "progress") {
        // Handle model progress
        setProgressItems((prev) =>
          prev.map((item) => {
            if (item.file === message.data.file) {
              return { ...item, ...message.data }
            }
            return item
          })
        )
      } else if (message.status === "done") {
        // Handle model done
        console.log("Model done:", message)
        setProgressItems((prev) => {
          const newItems = prev.filter(
            (item) => item.file !== message.data.file
          )
          if (newItems.length === 0) {
            setMessages((prev) =>
              prev.map((m) => {
                if (["Thinking...", "Loading model..."].includes(m.content)) {
                  return { ...m, content: "Thinking..." }
                }
                return m
              })
            )
          }
          return newItems
        })
      } else if (message.status === "assistant") {
        // console.log("Assistant:", message)
        setIsGenerating(true)
        setMessages((prev) =>
          prev.map((m) => {
            if (["Thinking...", "Loading model..."].includes(m.content)) {
              return { ...m, content: message.data.text }
            }
            return m
          })
        )
      } else if (message.status === "update") {
        setMessages((prev) => {
          const response = message.data
          const state = response.state ? `[${response.state}] ` : ""
          const metadata = `${state}${response.numTokens} tokens in ${response.latency.toFixed(0)} ms (${response.tps.toFixed(1)} tokens/sec)`
          const last = prev[prev.length - 1]
          const content = ["Thinking...", "Loading model..."].includes(
            last.content
          )
            ? response.output
            : last.content + response.output
          const context = response.state == "thinking" ? content : last.context
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              content: content,
              role: "assistant",
              metadata,
              context
            }
          ]
        })
      } else if (message.status === "append") {
        setMessages((prev) => [...prev, ...message.data.messages])
      } else if (message.status === "end") {
        setIsGenerating(false)
        if (message.data.chunks) {
          setAudioChunks({
            text: message.data.output,
            chunks: message.data.chunks
          })
          const secondToMinutes = (seconds: number) => {
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toFixed(0).padStart(2, "0")}`
          }
          const timestampMessages = message.data.chunks.map((chunk) => {
            return {
              role: "assistant",
              content: `[${secondToMinutes(chunk.timestamp[0])}] ${chunk.text}`,
              metadata: `${chunk.timestamp[0].toFixed(1)}s - ${chunk.timestamp[1].toFixed(1)}s`
            }
          })
          setMessages((prev) => [...prev, ...timestampMessages])
        }
      } else if (message.status === "image-update") {
        const { blob, progress, time, uint8Array, width, height, channels } =
          message.data

        // if (blob) {
        if (uint8Array) {
          // Create canvas and resize
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          // Create an ImageData object
          const imageData = ctx.createImageData(width, height)
          const data = imageData.data

          // Fill the ImageData object with RGB values
          for (
            let i = 0, j = 0;
            i < width * height * channels;
            i += channels, j += 4
          ) {
            data[j] = uint8Array[i] // R
            data[j + 1] = uint8Array[i + 1] // G
            data[j + 2] = uint8Array[i + 2] // B
            data[j + 3] = 255 // A (fully opaque)
          }

          // Put the ImageData onto the canvas
          ctx.putImageData(imageData, 0, 0)
          const url = canvas.toDataURL()

          setMessages((prev) => {
            const cloned = [...prev]
            const last = cloned.at(-1)
            cloned[cloned.length - 1] = {
              ...last,
              content: "Download image on the right!",
              image: url
            }
            return cloned
          })
          setIsGenerating(false)
        } else {
          // setImageProgress(progress)
          // setImageGenerationTime(time)
          setMessages((prev) => {
            const cloned = [...prev]
            const last = cloned.at(-1)
            cloned[cloned.length - 1] = {
              ...last,
              content: `Generating... ${(progress * 100).toFixed(1)}%`
            }
            return cloned
          })
        }
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(event.target.value)
    },
    []
  )

  const handleSubmitOnText = (text: string, image?: string) => {
    setIsLoading(true)

    const promptMessages = messages
      .map((m) => ({
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        ...(m.image ? { image: m.image } : {})
      }))
      .concat([
        {
          role: "user",
          content: text,
          metadata: "",
          ...(image ? { image } : {})
        }
      ])
    const message = {
      action: "generate",
      messages: promptMessages
    }

    const pendingMessages = promptMessages.concat([
      { role: "assistant", content: "Thinking...", metadata: "" }
    ])
    setMessages(pendingMessages)
    setInputText("")
    setPreviewImageUrl("")

    chrome.runtime.sendMessage(message, (response) => {
      setIsLoading(false)
    })
  }

  const handleSubmit = useCallback(
    (prefix: string = "") => {
      if (!inputText.trim()) return
      if (isLoading) return

      const prompt = prefix + inputText
      handleSubmitOnText(prompt, previewImageUrl)
    },
    [inputText]
  )

  const parseAudio = async (
    blob: Blob | string
  ): Promise<{
    audio: Float32Array
  }> => {
    // If input is a URL string, fetch it first
    if (typeof blob === "string") {
      const response = await fetch(blob)
      blob = await response.blob()
    }

    const fileReader = new FileReader()
    const MAX_SAMPLES =
      WHISPER_SAMPLING_RATE * (maxAudioSeconds ?? MAX_AUDIO_LENGTH)

    return new Promise((resolve, reject) => {
      fileReader.onloadend = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer
          const audioContext = new AudioContext()
          const decoded = await audioContext.decodeAudioData(arrayBuffer)
          let audio = decoded.getChannelData(0)

          // Resample audio if the sample rate doesn't match WHISPER_SAMPLING_RATE
          if (decoded.sampleRate !== WHISPER_SAMPLING_RATE) {
            const offlineCtx = new OfflineAudioContext(
              1, // mono
              Math.ceil(
                (audio.length * WHISPER_SAMPLING_RATE) / decoded.sampleRate
              ),
              WHISPER_SAMPLING_RATE
            )

            const source = offlineCtx.createBufferSource()
            source.buffer = decoded
            source.connect(offlineCtx.destination)
            source.start()

            const resampled = await offlineCtx.startRendering()
            audio = resampled.getChannelData(0)
          }

          if (audio.length > MAX_SAMPLES) {
            audio = audio.slice(0, MAX_SAMPLES)
          }

          resolve({ audio })
        } catch (error) {
          reject(error)
        }
      }

      fileReader.onerror = () => reject(fileReader.error)
      fileReader.readAsArrayBuffer(blob)
    })
  }

  const handleTranscribe = useCallback(async () => {
    if (!previewAudioUrl && !audioBlob) return
    const { audio }: { audio: Float32Array } = await parseAudio(
      audioBlob ?? previewAudioUrl
    )
    const blob = { audio, audioLength: audio.length }

    setMessages([
      {
        role: "user",
        content: "Transcribe this audio"
      },
      { role: "assistant", content: "Thinking..." }
    ])

    const message = {
      action: "generate",
      messages: [
        {
          role: "user",
          content: "",
          blob
        }
      ]
    }

    setIsLoading(true)
    chrome.runtime.sendMessage(message, (response) => {
      setIsLoading(false)
    })
  }, [previewAudioUrl, audioBlob, maxAudioSeconds, messages])

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleInterrupt = useCallback(() => {
    const message = {
      action: "interrupt"
    }
    chrome.runtime.sendMessage(message)
    setIsGenerating(false)
  }, [])

  const handleImageUrl = useCallback((url: string) => {
    if (url) setPreviewImageUrl(url)
  }, [])

  const handleAudioUrl = useCallback((url: string) => {
    if (url) setPreviewAudioUrl(url)
  }, [])

  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handleExportTxt = useCallback(() => {
    const text = audioChunks.text
    const filename = `private-llm-transcription-${Date.now()}.txt`
    const blob = new Blob([text], { type: "text/plain" })
    downloadFile(blob, filename)
  }, [audioChunks])

  const handleExportJson = useCallback(() => {
    const json = audioChunks.chunks
    const filename = `private-llm-transcription-${Date.now()}.json`
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json"
    })
    downloadFile(blob, filename)
  }, [audioChunks])

  const onRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob)
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#F0F2F5"
      }}>
      {/* Fixed Header */}
      <ChatHeader
        modelName={modelConfig.model_id}
        onNewChat={() => {
          setMessages([])
          setInputText("")
        }}
        hasChat={messages.length > 0}
      />

      {/* Fixed Progress Bar */}
      {progressItems.length > 0 && (
        <ChatProgress
          progressItems={progressItems}
          // offset={modelConfig.task === "speech-to-text" ? 24 : 16}
          offset={modelConfig.task === "speech-to-text" ? 230 : 64}
        />
      )}

      {/* Scrollable Messages Container */}
      {messages.length > 0 ? (
        <ChatMessages messages={messages} messagesEndRef={messagesEndRef} />
      ) : (
        <ChatExamples
          task={modelConfig.task}
          onExampleClick={(example) => {
            if (example.image) {
              handleImageUrl(example.image)
            }
            setInputText(example.prompt)
            handleSubmitOnText(example.prompt, example.image)
          }}
        />
      )}

      {/* Fixed Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #DDD",
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          boxShadow: "0 -1px 2px rgba(0,0,0,0.1)"
        }}>
        {previewImageUrl && (
          <div
            style={{
              position: "relative",
              maxHeight: "200px",
              overflow: "hidden"
            }}>
            <img
              src={previewImageUrl}
              alt="Preview"
              style={{
                maxHeight: "200px",
                objectFit: "contain"
              }}
            />
            <button
              onClick={() => setPreviewImageUrl("")}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "rgba(0,0,0,0.5)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer"
              }}>
              ×
            </button>
          </div>
        )}

        <div
          {...getRootProps({ className: "dropzone" })}
          style={{
            border: isDragActive ? "2px dashed #2196f3" : "none",
            background: isDragActive
              ? "rgba(33, 150, 243, 0.1)"
              : "transparent",
            padding: isDragActive ? "8px" : "0"
          }}>
          {modelConfig.task == "speech-to-text" && (
            <div style={{ display: "flex", gap: 8 }} className="flex-col">
              <input {...getInputProps()} />
              <div className="w-full flex flex-row gap-2">
                <Dialog
                  open={openAudioUrlDialog}
                  onOpenChange={setOpenAudioUrlDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <LinkIcon className="w-4 h-4" /> From URL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>From URL</DialogTitle>
                      <DialogDescription asChild>
                        <div>
                          <p>
                            Enter the URL of the audio file you want to
                            transcribe.
                          </p>
                          <div className="grid w-full gap-1.5 mb-2">
                            <Label htmlFor="audio-url">Audio URL:</Label>
                            <Textarea
                              id="audio-url"
                              rows={3}
                              placeholder="Audio URL"
                              defaultValue="https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/ted_60_16k.wav"
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => {
                              const url = (
                                document.getElementById(
                                  "audio-url"
                                ) as HTMLInputElement | null
                              )?.value
                              if (url) {
                                setAudioBlob(null)
                                handleAudioUrl(url)
                                setOpenAudioUrlDialog(false)
                              }
                            }}>
                            Transcribe
                          </Button>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                <Button className="w-full" onClick={openDropzone}>
                  <Upload className="w-4 h-4" /> From file
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Mic className="w-4 h-4" /> Record
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>From Recording</DialogTitle>
                      <DialogDescription asChild>
                        <div>
                          <p>Record audio using your microphone.</p>
                          {/* Reference:
                            https://stackoverflow.com/questions/50991321/chrome-extension-getusermedia-throws-notallowederror-failed-due-to-shutdown
                            https://stackoverflow.com/questions/78649316/accessing-the-microphone-from-a-chrome-extension-sidepanel
                            */}
                          <Button
                            className="w-full"
                            onClick={() =>
                              alert(
                                "Recording is not supported yet in Chrome extension."
                              )
                            }>
                            Start Recording
                          </Button>
                          {/* <AudioRecorder
                            onRecordingComplete={onRecordingComplete}
                          /> */}
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              {previewAudioUrl && (
                <div className="w-full flex flex-col gap-2">
                  <div className="w-full flex flex-row gap-2">
                    <audio src={previewAudioUrl} controls className="w-full" />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="max-audio-second">Max Audio Second</Label>
                    <Input
                      id="max-audio-second"
                      type="number"
                      placeholder="Audio length to transcribe"
                      defaultValue={maxAudioSeconds}
                      onChange={(e) => {
                        console.log("on change?", e.target.value)
                        setMaxAudioSeconds(Number(e.target.value))
                      }}
                    />
                  </div>
                  <div className="w-full flex flex-row gap-2">
                    <Button
                      className="w-full"
                      onClick={handleTranscribe}
                      disabled={isLoading}>
                      Transcribe
                    </Button>
                  </div>
                  {audioChunks.chunks.length > 0 && (
                    <div className="w-full flex flex-row gap-2">
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={handleExportTxt}>
                        <FileText className="w-4 h-4" />
                        Export TXT
                      </Button>
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={handleExportJson}>
                        <Braces className="w-4 h-4" />
                        Export JSON
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {modelConfig.task !== "speech-to-text" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input {...getInputProps()} />
              {enableDropzone && (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <FileImage className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    <DropdownMenuLabel>Upload Image</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onSelect={(e) => {
                        openDropzone()
                        // e.preventDefault()
                      }}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload from computer
                    </DropdownMenuItem>

                    <Dialog
                      open={openImageUrlDialog}
                      onOpenChange={setOpenImageUrlDialog}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault()
                            setOpenImageUrlDialog(true)
                          }}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          From URL
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>From URL</DialogTitle>
                          <DialogDescription asChild>
                            <div>
                              <p>
                                Enter the URL of the image file you want to
                                process.
                              </p>
                              <div className="grid w-full gap-1.5 mb-2">
                                <Label htmlFor="audio-url">Image URL:</Label>
                                <Textarea
                                  id="image-url"
                                  rows={3}
                                  placeholder="Image URL"
                                  defaultValue="https://www.nps.gov/grca/planyourvisit/images/mather-point-2021.jpg"
                                />
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => {
                                  const url = (
                                    document.getElementById(
                                      "image-url"
                                    ) as HTMLInputElement | null
                                  )?.value
                                  if (url) {
                                    handleImageUrl(url)
                                    setOpenImageUrlDialog(false)
                                  }
                                }}>
                                Load
                              </Button>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>

                    {/* <DropdownMenuItem
                onClick={() => alert("Paste an image using Ctrl+V / Cmd+V")}>
                <Copy className="w-4 h-4 mr-2" />
                Paste image (Ctrl+V)
                  </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Input
                type="email"
                placeholder="Type a message..."
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />

              {!isGenerating && (
                <Button
                  size="icon"
                  onClick={() => {
                    // handleImageSubmit()
                    handleSubmit()
                  }}
                  disabled={isLoading || (!inputText && !previewImageUrl)}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
              )}
              {!isGenerating && enableDropzone && (
                <Button
                  size="icon"
                  onClick={() => {
                    // handleImageSubmit()
                    handleSubmit(`${IMAGE_GENERATION_COMMAND_PREFIX} `)
                  }}
                  disabled={
                    isLoading || previewImageUrl.length > 0 || !inputText
                  }>
                  <Brush className="w-4 h-4" />
                </Button>
              )}
              {isGenerating && (
                <Button size="icon" onClick={handleInterrupt}>
                  <CircleStop className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat
