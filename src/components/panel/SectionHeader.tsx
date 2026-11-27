import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import type React from "react";
import { memo } from "react";

export interface SectionHeaderProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  icon: Icon,
  isOpen,
  onToggle,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="border-border btn-press group flex w-full items-center justify-between border-y bg-neutral-950 px-4 py-2.5 text-left transition-colors select-none hover:bg-neutral-900"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-white" />
        <span className="truncate font-mono text-xs font-bold tracking-wider text-white uppercase sm:text-[13px]">
          {title}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOpen ? (
          <CaretDownIcon className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-white" />
        ) : (
          <CaretRightIcon className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-white" />
        )}
      </div>
    </button>
  );
});
