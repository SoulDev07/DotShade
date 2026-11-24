"use client";

import {
  ArrowCounterClockwiseIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  SpeedometerIcon,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export const VideoControls = React.memo(function VideoControls({
  videoRef,
  className,
}: VideoControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsLooping(video.loop);
      setIsMuted(video.muted);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    if (video.readyState >= 1) {
      onLoadedMetadata();
    }
    if (!video.paused) {
      setIsPlaying(true);
    }

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [videoRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const toggleLoop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changeRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Live sources (webcam/MediaStream) report duration = Infinity.
  const hasSeekableDuration = Number.isFinite(duration) && duration > 0;
  const progressPercent = hasSeekableDuration
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 border-2 border-white bg-black p-3.5 text-white shadow-[4px_4px_0px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      <div className="group/bar relative flex h-6 cursor-pointer touch-pan-x items-center">
        <input
          type="range"
          min={0}
          max={hasSeekableDuration ? duration : 1}
          step={0.01}
          value={hasSeekableDuration ? Math.min(currentTime, duration) : 0}
          onChange={handleSeek}
          disabled={!hasSeekableDuration}
          className="absolute inset-0 z-10 w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
        <div className="h-1.5 w-full overflow-hidden border border-neutral-700 bg-neutral-900">
          <div
            className="pixel-progress h-full transition-all duration-75 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 font-mono text-xs sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            className="btn-press border border-white bg-white p-1.5 font-bold text-black transition-colors hover:bg-neutral-200"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <PauseIcon className="h-3.5 w-3.5" />
            ) : (
              <PlayIcon className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="btn-press border border-neutral-700 bg-neutral-900 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            title="Restart"
          >
            <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
          </button>

          <span className="pl-1 font-mono text-[10px] tracking-tight text-neutral-300 tabular-nums sm:text-[11px]">
            {hasSeekableDuration ? (
              <>
                {formatTime(currentTime)} <span className="text-neutral-500">/</span>{" "}
                {formatTime(duration)}
              </>
            ) : (
              <span className="font-bold tracking-widest text-red-400">● LIVE</span>
            )}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center gap-1 border border-neutral-700 bg-neutral-900 px-1.5 py-0.5">
            <SpeedometerIcon className="h-3 w-3 text-neutral-400" />
            <select
              value={playbackRate}
              onChange={(e) => changeRate(parseFloat(e.target.value))}
              className="cursor-pointer bg-transparent font-mono text-[10px] text-white focus:outline-none sm:text-[11px]"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleLoop}
            className={cn(
              "btn-press border p-1.5 transition-colors",
              isLooping
                ? "border-white bg-white text-black"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white",
            )}
            title="Toggle Loop"
          >
            <RepeatIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="btn-press border border-neutral-700 bg-neutral-900 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <SpeakerSlashIcon className="h-3.5 w-3.5" />
            ) : (
              <SpeakerHighIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
