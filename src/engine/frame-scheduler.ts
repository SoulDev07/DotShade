/**
 * Coalesces draw requests into at most one rAF, and drives the three render policies:
 *  - dirty-only (still images): draws once per `invalidate()`
 *  - continuous (procedural animation): draws every frame
 *  - video: draws when a new video frame is presented (requestVideoFrameCallback),
 *    so a paused video costs nothing.
 */
export class FrameScheduler {
  private rafId = 0;
  private continuous = false;
  private disposed = false;
  private lastTs = 0;

  private video: HTMLVideoElement | null = null;
  private videoCallbackId = 0;
  private usesVideoCallback = false;

  constructor(
    /** Called once per scheduled frame. `dt` is seconds since the previous continuous frame. */
    private readonly onFrame: (dt: number) => void,
    /** Called when a new video frame is available, before the redraw. */
    private readonly onVideoFrame: () => void,
  ) {}

  /** True when the video can't signal new frames and must be polled every rAF. */
  get isPollingVideo(): boolean {
    return this.video !== null && !this.usesVideoCallback;
  }

  invalidate() {
    if (this.disposed) return;
    this.schedule();
  }

  setContinuous(on: boolean) {
    if (this.continuous === on) return;
    this.continuous = on;
    this.lastTs = 0;
    if (on) this.schedule();
  }

  watchVideo(video: HTMLVideoElement | null) {
    this.unwatchVideo();
    if (!video) return;
    this.video = video;
    if ("requestVideoFrameCallback" in video) {
      this.usesVideoCallback = true;
      const tick = () => {
        if (this.disposed || this.video !== video) return;
        this.onVideoFrame();
        this.invalidate();
        this.videoCallbackId = video.requestVideoFrameCallback(tick);
      };
      this.videoCallbackId = video.requestVideoFrameCallback(tick);
    } else {
      this.usesVideoCallback = false;
      this.setContinuous(true);
    }
  }

  private unwatchVideo() {
    if (this.video && this.usesVideoCallback && this.videoCallbackId) {
      this.video.cancelVideoFrameCallback?.(this.videoCallbackId);
    }
    this.video = null;
    this.videoCallbackId = 0;
    this.usesVideoCallback = false;
  }

  private schedule() {
    if (this.rafId || this.disposed) return;
    this.rafId = requestAnimationFrame((ts) => {
      this.rafId = 0;
      if (this.disposed) return;
      const dt = this.lastTs ? (ts - this.lastTs) / 1000 : 0;
      this.lastTs = this.continuous ? ts : 0;
      this.onFrame(dt);
      if (this.continuous) this.schedule();
    });
  }

  dispose() {
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.unwatchVideo();
  }
}
