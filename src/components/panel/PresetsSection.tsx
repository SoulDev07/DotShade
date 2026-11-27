import { CheckIcon, DiceFiveIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { memo, useMemo, useState } from "react";
import { getPresetSwatches, PRESET_CATEGORIES, PRESETS } from "@/engine/presets";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/state/studio-store";

export const PresetsSection = memo(function PresetsSection() {
  const activePresetId = useStudioStore((st) => st.activePresetId);
  const applyPreset = useStudioStore((st) => st.applyPreset);

  const [presetCategory, setPresetCategory] = useState<string>("all");
  const [presetSearch, setPresetSearch] = useState<string>("");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of PRESETS) counts[p.category] = (counts[p.category] ?? 0) + 1;
    return counts;
  }, []);

  const filteredPresets = useMemo(() => {
    const query = presetSearch.trim().toLowerCase();
    return PRESETS.filter((preset) => {
      if (presetCategory !== "all" && preset.category !== presetCategory) return false;
      return (
        !query ||
        preset.name.toLowerCase().includes(query) ||
        preset.desc.toLowerCase().includes(query) ||
        preset.category.toLowerCase().includes(query)
      );
    });
  }, [presetCategory, presetSearch]);

  return (
    <div className="space-y-3.5 bg-black/40 p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            placeholder="Search presets (Game Boy, 1-Bit...)"
            className="border-border w-full border bg-black py-2 pr-8 pl-9 font-mono text-xs text-white transition-colors placeholder:text-neutral-500 focus:border-white focus:outline-none"
          />
          {presetSearch && (
            <button
              type="button"
              onClick={() => setPresetSearch("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white"
              title="Clear search"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            applyPreset(PRESETS[Math.floor(Math.random() * PRESETS.length)].id);
          }}
          className="bg-secondary/60 border-border btn-press flex shrink-0 items-center gap-1.5 border px-2.5 py-2 font-mono text-xs font-bold text-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-800 hover:text-white"
          title="Apply random curated preset"
        >
          <DiceFiveIcon className="text-primary h-3.5 w-3.5" />
          <span className="hidden sm:inline">RANDOM</span>
        </button>
      </div>

      <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1">
        {PRESET_CATEGORIES.map((cat) => {
          const isSelected = presetCategory === cat.id;
          const count = cat.id === "all" ? PRESETS.length : categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setPresetCategory(cat.id)}
              className={cn(
                "btn-press flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs whitespace-nowrap transition-all",
                isSelected
                  ? "border border-white bg-white font-bold text-black"
                  : "bg-secondary/40 hover:bg-secondary/70 border-border border text-neutral-300 hover:text-white",
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  "px-1 text-[10px] font-bold",
                  isSelected ? "text-black/80" : "text-neutral-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 sm:max-h-72">
        {filteredPresets.map((preset) => {
          const isCurrent = activePresetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "btn-press group relative flex w-full flex-col gap-1.5 border p-2.5 text-left transition-all",
                isCurrent
                  ? "border-2 border-white bg-neutral-900 shadow-sm"
                  : "bg-secondary/30 hover:bg-secondary/70 border-border hover:border-neutral-400",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "truncate font-mono text-xs font-bold transition-colors",
                      isCurrent ? "text-white" : "text-foreground group-hover:text-white",
                    )}
                  >
                    {preset.name}
                  </span>
                  <span className="bg-secondary border-border shrink-0 border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-neutral-300 uppercase">
                    {preset.category}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isCurrent && <CheckIcon className="h-4 w-4 shrink-0 font-bold text-white" />}
                  <div className="border-border flex h-3 w-16 overflow-hidden border">
                    {getPresetSwatches(preset).map((c, i) => (
                      <div key={i} className="h-full flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <span className="line-clamp-1 font-mono text-[11px] text-neutral-400">
                {preset.desc}
              </span>
            </button>
          );
        })}

        {filteredPresets.length === 0 && (
          <div className="border-border space-y-1.5 border border-dashed p-4 text-center font-mono text-xs text-neutral-400">
            <p>No presets found matching "{presetSearch}"</p>
            <button
              type="button"
              onClick={() => {
                setPresetSearch("");
                setPresetCategory("all");
              }}
              className="text-xs font-bold text-white hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
