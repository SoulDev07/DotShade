import { type RefObject, useCallback, useEffect, useState } from "react";

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen?.().catch(() => setIsFullscreen(false));
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [ref]);

  return { isFullscreen, toggleFullscreen: toggle };
}
