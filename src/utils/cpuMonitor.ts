/**
 * Monitors UI render performance and client frame rate via requestAnimationFrame
 * to detect browser/device CPU thermal throttling or high load.
 */

export interface CpuHealthReport {
  avgFrameDurationMs: number;
  jankPercentage: number;
  isThrottlingDetected: boolean;
  thermalRisk: 'safe' | 'warm' | 'hot';
  recommendation: string | null;
}

export class CpuMonitor {
  private frameTimes: number[] = [];
  private lastTime = performance.now();
  private animationFrameId: number | null = null;
  private isRunning = false;

  public start(onReport?: (report: CpuHealthReport) => void) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const checkFrame = () => {
      const now = performance.now();
      const delta = now - this.lastTime;
      this.lastTime = now;

      this.frameTimes.push(delta);
      if (this.frameTimes.length > 120) {
        this.frameTimes.shift(); // Keep last 120 frames (~2 seconds)
      }

      if (this.frameTimes.length >= 60 && onReport && Math.random() < 0.05) {
        onReport(this.generateReport());
      }

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(checkFrame);
      }
    };

    this.animationFrameId = requestAnimationFrame(checkFrame);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.frameTimes = [];
  }

  public generateReport(): CpuHealthReport {
    if (this.frameTimes.length === 0) {
      return {
        avgFrameDurationMs: 16.6,
        jankPercentage: 0,
        isThrottlingDetected: false,
        thermalRisk: 'safe',
        recommendation: null,
      };
    }

    const sum = this.frameTimes.reduce((acc, t) => acc + t, 0);
    const avg = sum / this.frameTimes.length;

    // Frames taking longer than 33ms (~30fps threshold) count as jank in a 60fps target
    const jankFrames = this.frameTimes.filter((t) => t > 33.3).length;
    const jankPercentage = Math.round((jankFrames / this.frameTimes.length) * 100);

    const isThrottlingDetected = jankPercentage > 25 || avg > 28;

    let thermalRisk: 'safe' | 'warm' | 'hot' = 'safe';
    let recommendation: string | null = null;

    if (jankPercentage > 35 || avg > 35) {
      thermalRisk = 'hot';
      recommendation = 'Device CPU is experiencing high thermal load. Consider lowering stream resolution to 720p or framerate to 30 FPS.';
    } else if (jankPercentage > 15 || avg > 22) {
      thermalRisk = 'warm';
      recommendation = 'Moderate CPU usage detected. Enabling Hardware Decoding or 30 FPS preset is recommended for long sessions.';
    }

    return {
      avgFrameDurationMs: Math.round(avg * 10) / 10,
      jankPercentage,
      isThrottlingDetected,
      thermalRisk,
      recommendation,
    };
  }
}
