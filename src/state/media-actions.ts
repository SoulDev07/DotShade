import { toast } from "sonner";
import { useStudioStore } from "./studio-store";

/** Live webcam stream. Module-level so any component can start/stop the camera. */
let webcamStream: MediaStream | null = null;
let preWebcamSource: { mediaType: "image" | "video" | "procedural"; animated: boolean } | null =
  null;

export function getWebcamStream(): MediaStream | null {
  return webcamStream;
}

export function loadImageFile(file: File, message = "Uploaded image") {
  const url = URL.createObjectURL(file);
  useStudioStore.getState().setSource({ mediaType: "image", mediaUrl: url, animated: false });
  toast.success(message, { description: file.name });
}

export function loadVideoFile(file: File, message = "Uploaded video") {
  const url = URL.createObjectURL(file);
  useStudioStore.getState().setSource({ mediaType: "video", mediaUrl: url, animated: true });
  toast.success(message, { description: file.name });
}

/** Handles a dropped file: images and videos load, anything else is ignored. */
export function loadDroppedFile(file: File) {
  if (file.type.startsWith("image/")) loadImageFile(file, "Loaded image into workspace");
  else if (file.type.startsWith("video/")) loadVideoFile(file, "Loaded video into workspace");
}

export function stopWebcam() {
  webcamStream?.getTracks().forEach((track) => {
    track.stop();
  });
  webcamStream = null;
}

export async function toggleWebcam() {
  const store = useStudioStore.getState();
  if (store.isWebcamActive) {
    stopWebcam();
    store.setWebcamActive(false);
    const prev = preWebcamSource;
    preWebcamSource = null;
    if (prev) {
      store.setSource({
        mediaType: prev.mediaType,
        animated: prev.mediaType !== "image" && prev.animated,
      });
    }
    toast.info("Webcam disconnected");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    const current = useStudioStore.getState().source;
    preWebcamSource = { mediaType: current.mediaType, animated: current.animated };
    webcamStream = stream;
    store.setSource({ mediaType: "video", animated: true });
    store.setWebcamActive(true);
    toast.success("Live webcam connected!");
  } catch (err) {
    console.error("Failed to access webcam:", err);
    toast.error("Could not access webcam. Please check permissions.");
  }
}

/** Whether the original/split views make sense for the current source. */
export function canCompare(): boolean {
  const { source, isWebcamActive } = useStudioStore.getState();
  return source.mediaType !== "procedural" || isWebcamActive;
}

export function toggleOriginal() {
  if (!canCompare()) {
    toast.info("Original view is not applicable for procedural patterns");
    return;
  }
  const { isViewingOriginal, setViewingOriginal, setSplitView } = useStudioStore.getState();
  const next = !isViewingOriginal;
  if (next) setSplitView(false);
  setViewingOriginal(next);
}

export function resetStudio() {
  useStudioStore.getState().resetAll();
  toast.info("Settings reset to defaults");
}

export function randomizeStudio() {
  const { pattern, paletteName } = useStudioStore.getState().randomize();
  toast.success(`Randomized: ${pattern.toUpperCase()} • ${paletteName}`);
}
