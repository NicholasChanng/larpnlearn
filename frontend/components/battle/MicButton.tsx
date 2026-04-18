"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Mic button — Track-2 wires up actual MediaRecorder upload via
 * api.battles.answer({ audio_blob_b64 }).
 *
 * For the skeleton this is a UI-only scaffold: clicking toggles a recording
 * state and fires onTranscript(stub) when released. Real transcription lands
 * when Track-5 finishes Whisper.
 */
export function MicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
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
        // Stub — encode then hand off via onTranscript. Real path uploads
        // base64 blob with the answer and waits for Whisper transcription.
        const buf = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        onTranscript(`[audio ${Math.round(b64.length / 1024)} KB — Whisper pending]`);
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
