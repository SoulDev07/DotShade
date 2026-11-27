import { useEffect } from "react";
import { toast } from "sonner";
import { setCpuSource } from "@/engine/cpu-dither-client";
import { decodeImageUrl } from "@/lib/decode-image";
import { useStudioStore } from "@/state/studio-store";

/**
 * Decodes the current image source exactly once and publishes `{ bitmap, width, height }`
 * to the store. The GPU mounts, the CPU worker and palette extraction all share that bitmap.
 */
export function useDecodedImage() {
  const mediaType = useStudioStore((s) => s.source.mediaType);
  const mediaUrl = useStudioStore((s) => s.source.mediaUrl);

  useEffect(() => {
    const { setDecodedImage, setMediaDimensions } = useStudioStore.getState();
    if (mediaType !== "image" || !mediaUrl) {
      const previous = useStudioStore.getState().decodedImage;
      setDecodedImage(null);
      setCpuSource(null);
      previous?.bitmap.close();
      return;
    }

    let cancelled = false;
    decodeImageUrl(mediaUrl)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        const previous = useStudioStore.getState().decodedImage;
        setDecodedImage({ url: mediaUrl, bitmap, width: bitmap.width, height: bitmap.height });
        setCpuSource(bitmap);
        setMediaDimensions({ width: bitmap.width, height: bitmap.height });
        // Closed after publishing, so consumers swap to the new bitmap first.
        previous?.bitmap.close();
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Image decode failed:", err);
        toast.error("Could not decode image.");
      });

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaUrl]);
}
