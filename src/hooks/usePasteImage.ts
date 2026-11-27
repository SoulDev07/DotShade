import { useEffect } from "react";
import { loadImageFile } from "@/state/media-actions";

/** Pasting an image from the clipboard loads it into the studio. */
export function usePasteImage() {
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files[0];
      if (file?.type.startsWith("image/")) {
        loadImageFile(file, "Image pasted from clipboard!");
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);
}
