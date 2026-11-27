"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { DEFAULT_SOURCE } from "@/engine/defaults";
import { useDecodedImage } from "@/hooks/useDecodedImage";
import { useFullscreen } from "@/hooks/useFullscreen";
import { usePasteImage } from "@/hooks/usePasteImage";
import { useStudioHotkeys } from "@/hooks/useStudioHotkeys";
import { stopWebcam } from "@/state/media-actions";
import { StudioPanel } from "./panel/StudioPanel";
import { Stage } from "./studio/Stage";
import { StudioHeader } from "./studio/StudioHeader";

const loadExportModal = () => import("./ExportModal").then((m) => m.ExportModal);
const ExportModal = dynamic(loadExportModal, { ssr: false });

export function DitherStudio() {
  preload(DEFAULT_SOURCE.mediaUrl, { as: "image", type: "image/webp" });

  const stageRef = useRef<HTMLDivElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [hasOpenedExport, setHasOpenedExport] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef);

  const openExport = useCallback(() => {
    setHasOpenedExport(true);
    setIsExportOpen(true);
  }, []);
  const closeExport = useCallback(() => setIsExportOpen(false), []);
  const prefetchExport = useCallback(() => {
    void loadExportModal();
  }, []);

  useDecodedImage();
  usePasteImage();
  useStudioHotkeys({ isExportOpen, openExport, closeExport, toggleFullscreen });
  useEffect(() => stopWebcam, []);

  return (
    <div className="bg-background text-foreground flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden font-sans select-none sm:flex-row">
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <StudioHeader
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          openExport={openExport}
          prefetchExport={prefetchExport}
        />
        <Stage stageRef={stageRef} />
      </main>

      <StudioPanel />

      {hasOpenedExport && <ExportModal isOpen={isExportOpen} onClose={closeExport} />}
    </div>
  );
}
