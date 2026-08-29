"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Repeat, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export function VideoControls({ videoRef, className }: VideoControlsProps) {
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 p-3.5 glass-panel-glow rounded-2xl text-neutral-200",
        className
      )}
    >
      {/* Precision Scrubber Bar */}
      <div className="relative group/bar flex items-center h-4 cursor-pointer">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="w-full z-10 opacity-0 cursor-pointer absolute inset-0"
        />
        {/* Track Background */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden transition-[height] duration-150 ease-out group-hover/bar:h-2">
          {/* Active Fill with subtle glow */}
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Control Buttons and Time Display */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          {/* Play/Pause Button with Emil tactile press */}
          <button
            onClick={togglePlay}
            className="p-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl btn-press"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="p-2 hover:bg-white/5 text-neutral-400 hover:text-neutral-200 rounded-xl btn-press"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Time Code */}
          <span className="text-[11px] text-neutral-400 pl-1 font-mono tracking-tight">
            {formatTime(currentTime)} <span className="text-neutral-600">/</span> {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
            <Gauge className="w-3 h-3 text-neutral-400" />
            <select
              value={playbackRate}
              onChange={(e) => changeRate(parseFloat(e.target.value))}
              className="bg-transparent text-neutral-300 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          {/* Loop */}
          <button
            onClick={toggleLoop}
            className={cn(
              "p-2 rounded-xl border btn-press",
              isLooping
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            )}
            title="Toggle Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-white/5 text-neutral-400 hover:text-neutral-200 rounded-xl btn-press"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
