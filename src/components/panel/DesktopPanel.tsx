import { BookmarkIcon, ImageIcon, PaletteIcon, SlidersIcon, SunIcon } from "@phosphor-icons/react";
import { memo, useState } from "react";
import { AdjustSection } from "./AdjustSection";
import { ColorSection } from "./ColorSection";
import { DitherSection } from "./DitherSection";
import { MediaSection } from "./MediaSection";
import { PresetsSection } from "./PresetsSection";
import { SectionHeader } from "./SectionHeader";

export const DesktopPanel = memo(function DesktopPanel() {
  const [openSections, setOpenSections] = useState({
    media: true,
    dither: true,
    color: true,
    presets: true,
    adjust: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className="bg-card border-border flex h-full shrink-0 flex-col overflow-hidden border-l select-none sm:w-[320px] md:w-[350px] lg:w-[380px] xl:w-[410px]"
      style={{ borderLeftWidth: "1px" }}
    >
      <div className="border-border flex h-11 shrink-0 items-center justify-between border-b bg-neutral-950 px-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2 w-2 bg-white" />
          <span className="font-mono text-xs font-bold tracking-wider text-white uppercase sm:text-[13px]">
            STUDIO CONTROLS
          </span>
        </div>
      </div>

      <div className="divide-border text-foreground/90 flex-1 divide-y overflow-y-auto text-xs">
        <section className="bg-card">
          <SectionHeader
            title="SOURCE MEDIA"
            icon={ImageIcon}
            isOpen={openSections.media}
            onToggle={() => toggleSection("media")}
          />
          {openSections.media && <MediaSection />}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="DITHER MATRIX & ENGINE"
            icon={SlidersIcon}
            isOpen={openSections.dither}
            onToggle={() => toggleSection("dither")}
          />
          {openSections.dither && <DitherSection />}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="COLOR & PALETTES"
            icon={PaletteIcon}
            isOpen={openSections.color}
            onToggle={() => toggleSection("color")}
          />
          {openSections.color && <ColorSection />}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="STYLE PRESETS"
            icon={BookmarkIcon}
            isOpen={openSections.presets}
            onToggle={() => toggleSection("presets")}
          />
          {openSections.presets && <PresetsSection />}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="FRAMING & ADJUSTMENTS"
            icon={SunIcon}
            isOpen={openSections.adjust}
            onToggle={() => toggleSection("adjust")}
          />
          {openSections.adjust && <AdjustSection />}
        </section>
      </div>
    </aside>
  );
});
