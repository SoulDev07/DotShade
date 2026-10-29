"use client";

import React, { useState, useEffect } from "react";
import {
  PlayIcon,
  PauseIcon,
  ArrowCounterClockwiseIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  RepeatIcon,
  SpeedometerIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export const VideoControls = React.memo(function VideoControls({ videoRef, className }: VideoControlsProps) {
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
        "flex flex-col gap-2.5 p-3.5 bg-black border-2 border-white text-white shadow-[4px_4px_0px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      <div className="relative group/bar flex items-center h-6 cursor-pointer touch-pan-x">
        <input
          type="range"
          min={0}
          max={hasSeekableDuration ? duration : 1}
          step={0.01}
          value={hasSeekableDuration ? Math.min(currentTime, duration) : 0}
          onChange={handleSeek}
          disabled={!hasSeekableDuration}
          className="w-full z-10 opacity-0 cursor-pointer absolute inset-0 disabled:cursor-default"
        />
        <div className="w-full h-1.5 bg-neutral-900 border border-neutral-700 overflow-hidden">
          <div
            className="h-full pixel-progress transition-all duration-75 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs font-mono">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={togglePlay}
            className="p-1.5 bg-white text-black hover:bg-neutral-200 border border-white transition-colors btn-press font-bold"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-colors btn-press"
            title="Restart"
          >
            <ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] sm:text-[11px] text-neutral-300 pl-1 font-mono tracking-tight tabular-nums">
            {hasSeekableDuration ? (
              <>
                {formatTime(currentTime)} <span className="text-neutral-500">/</span>{" "}
                {formatTime(duration)}
              </>
            ) : (
              <span className="text-red-400 font-bold tracking-widest">● LIVE</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5">
            <SpeedometerIcon className="w-3 h-3 text-neutral-400" />
            <select
              value={playbackRate}
              onChange={(e) => changeRate(parseFloat(e.target.value))}
              className="bg-transparent text-white text-[10px] sm:text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          <button
            onClick={toggleLoop}
            className={cn(
              "p-1.5 border transition-colors btn-press",
              isLooping
                ? "bg-white text-black border-white"
                : "border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
            )}
            title="Toggle Loop"
          >
            <RepeatIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-colors btn-press"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <SpeakerSlashIcon className="w-3.5 h-3.5" /> : <SpeakerHighIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
});
