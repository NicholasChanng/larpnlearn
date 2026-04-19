"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MicButtonProps {
  onTranscript?: (text: string) => void;
  onAudio?: (base64: string) => void;
}

export function MicButton({ onTranscript, onAudio }: MicButtonProps) {
  const [recording, setRecording] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        onAudio?.(b64);
        onTranscript?.(`[audio recorded — ${Math.round(b64.length / 1024)} KB]`);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setBlocked(true);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  if (blocked) {
    return (
      <Button variant="outline" disabled className="opacity-60">
        <Mic size={16} className="mr-1" /> Mic blocked
      </Button>
    );
  }

  return (
    <Button
      variant={recording ? "default" : "outline"}
      onClick={recording ? stop : start}
      className={recording ? "animate-pulse bg-red-600 text-white hover:bg-red-700" : ""}
    >
      {recording ? (
        <>
          <Square size={14} className="mr-1 fill-white" /> Stop
        </>
      ) : (
        <>
          <Mic size={16} className="mr-1" /> Speak answer
        </>
      )}
    </Button>
  );
}
