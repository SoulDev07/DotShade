"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DesktopPanel } from "./DesktopPanel";
import { MobileSheet } from "./MobileSheet";

/** Renders either the desktop sidebar or the mobile bottom sheet, never both. */
export function StudioPanel() {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  return isDesktop ? <DesktopPanel /> : <MobileSheet />;
}
