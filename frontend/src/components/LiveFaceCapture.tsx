import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";

import { faceCheckIn } from "@/api/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { RosterEntry } from "@/types";

const CAPTURE_INTERVAL_MS = 3000;

/** Stateless face check-in: the browser captures its own webcam frame every
 * few seconds and POSTs it to a plain match endpoint -- there is no
 * server-side camera or background thread (the deployed backend has no
 * attached camera), unlike an on-prem design. */
export function LiveFaceCapture({
  sessionId,
  roster,
  onRecognized,
}: {
  sessionId: string;
  roster: RosterEntry[];
  onRecognized: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rosterRef = useRef(roster);
  rosterRef.current = roster;

  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        toast.error("Could not access the camera");
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sessionId]);

  function captureAndSend() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    setBusy(true);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setBusy(false);
          return;
        }
        try {
          const event = await faceCheckIn(sessionId, blob);
          const entry = rosterRef.current.find((r) => r.student_id === event.student_id);
          const alreadyPresent = entry?.event != null;
          if (entry && !alreadyPresent) {
            setLastMessage(`${entry.full_name} marked present`);
            toast.success(`${entry.full_name} marked present`);
            onRecognized();
          }
        } catch {
          // Expected on most frames (no face in view yet, or no confident
          // match) -- only genuine recognitions are worth surfacing.
        } finally {
          setBusy(false);
        }
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Face check-in</CardTitle>
        <Button size="sm" variant={active ? "destructive" : "primary"} onClick={() => setActive((a) => !a)}>
          {active ? <CameraOff className="size-3.5" /> : <Camera className="size-3.5" />}
          {active ? "Stop camera" : "Start camera"}
        </Button>
      </CardHeader>
      <div className="p-4">
        {active ? (
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} autoPlay playsInline muted className="w-full" />
            {busy && (
              <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                Scanning…
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink-faint">
            Start the camera to automatically check in enrolled students as they appear on screen.
          </p>
        )}
        <canvas ref={canvasRef} className="hidden" />
        {lastMessage && <p className="mt-2 text-xs font-medium text-good">{lastMessage}</p>}
      </div>
    </Card>
  );
}
