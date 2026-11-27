import { useHotkeys } from "react-hotkeys-hook";
import { randomizeStudio, resetStudio, toggleOriginal } from "@/state/media-actions";
import { useStudioStore } from "@/state/studio-store";

interface StudioHotkeyOptions {
  isExportOpen: boolean;
  openExport: () => void;
  closeExport: () => void;
  toggleFullscreen: () => void;
}

const clampZoom = (z: number) => Math.min(3, Math.max(0.5, Number(z.toFixed(2))));

export function useStudioHotkeys({
  isExportOpen,
  openExport,
  closeExport,
  toggleFullscreen,
}: StudioHotkeyOptions) {
  useHotkeys("escape", (e) => {
    e.preventDefault();
    const { isViewingOriginal, isSplitView, setViewingOriginal, setSplitView } =
      useStudioStore.getState();
    if (isExportOpen) closeExport();
    else if (isViewingOriginal) setViewingOriginal(false);
    else if (isSplitView) setSplitView(false);
  });

  useHotkeys("mod+s", (e) => {
    e.preventDefault();
    openExport();
  });

  useHotkeys("s", (e) => {
    e.preventDefault();
    useStudioStore.getState().setSplitView((prev) => !prev);
  });

  useHotkeys("r", resetStudio);
  useHotkeys("x", randomizeStudio);
  useHotkeys("f", toggleFullscreen);
  useHotkeys(["o", "\\"], (e) => {
    e.preventDefault();
    toggleOriginal();
  });
  useHotkeys(["+", "="], () => useStudioStore.getState().setZoom((z) => clampZoom(z + 0.15)));
  useHotkeys(["-", "_"], () => useStudioStore.getState().setZoom((z) => clampZoom(z - 0.15)));
  useHotkeys("0", () => useStudioStore.getState().setZoom(1));
}
