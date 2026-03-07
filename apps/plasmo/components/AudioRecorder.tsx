import { useEffect, useRef, useState } from "react"

import { formatAudioTimestamp } from "../lib/AudioUtils"
import { webmFixDuration } from "../lib/BlobFix"
import { Button } from "./ui/button"

function getMimeType() {
  const types = [
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/aac"
  ]
  for (let i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) {
      return types[i]
    }
  }
  return undefined
}

export default function AudioRecorder(props: {
  onRecordingComplete: (blob: Blob) => void
}) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = async () => {
    // Reset recording (if any)
    setRecordedBlob(null)

    let startTime = Date.now()

    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true
        })
      }

      const mimeType = getMimeType()
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
        if (mediaRecorder.state === "inactive") {
          const duration = Date.now() - startTime

          // Received a stop event
          let blob = new Blob(chunksRef.current, { type: mimeType })

          if (mimeType === "audio/webm") {
            blob = await webmFixDuration(blob, duration, blob.type)
          }

          setRecordedBlob(blob)
          props.onRecordingComplete(blob)

          chunksRef.current = []
        }
      })
      mediaRecorder.start()
      setRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop() // set state to inactive
      setDuration(0)
      setRecording(false)
    }
  }

  useEffect(() => {
    let stream: MediaStream | null = null

    if (recording) {
      const timer = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1)
      }, 1000)

      return () => {
        clearInterval(timer)
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [recording])

  const handleToggleRecording = () => {
    if (recording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="flex flex-col justify-center items-center">
      <Button
        type="button"
        variant={recording ? "destructive" : "default"}
        onClick={handleToggleRecording}>
        {recording
          ? `Stop Recording (${formatAudioTimestamp(duration)})`
          : "Start Recording"}
      </Button>

      {recordedBlob && (
        <audio className="w-full" ref={audioRef} controls>
          <source
            src={URL.createObjectURL(recordedBlob)}
            type={recordedBlob.type}
          />
        </audio>
      )}
    </div>
  )
}
