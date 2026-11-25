export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Animator {
  private rafId = 0;
  private start = 0;
  private duration = 400;
  private onFrame: ((t: number) => void) | null = null;

  play(duration: number, onFrame: (t: number) => void): void {
    this.cancel();
    this.duration = Math.max(1, duration);
    this.onFrame = onFrame;
    this.start = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private loop = (now: number): void => {
    const elapsed = now - this.start;
    const t = Math.max(0, Math.min(1, elapsed / this.duration));
    this.onFrame?.(easeOutCubic(t));
    if (t < 1) {
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.onFrame = null;
    }
  };

  cancel(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.onFrame = null;
  }
}
