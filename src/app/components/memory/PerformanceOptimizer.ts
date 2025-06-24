import { memoryManager } from './MemoryManager';
import { gameObjectPool } from './GameObjectPool';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  objectCount: number;
  renderCalls: number;
  lastUpdate: number;
}

export interface QualitySettings {
  maxEnemies: number;
  maxProjectiles: number;
  maxParticles: number;
  lodDistance: number;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  textureQuality: 'low' | 'medium' | 'high';
  effectsQuality: 'low' | 'medium' | 'high';
  targetFPS: number;
}

export interface PerformanceLimits {
  minFPS: number;
  maxMemoryMB: number;
  maxObjects: number;
  emergencyThreshold: number;
}

const DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  maxEnemies: 50,
  maxProjectiles: 100,
  maxParticles: 200,
  lodDistance: 100,
  shadowQuality: 'medium',
  textureQuality: 'medium',
  effectsQuality: 'medium',
  targetFPS: 60
};

const DEFAULT_PERFORMANCE_LIMITS: PerformanceLimits = {
  minFPS: 30,
  maxMemoryMB: 400,
  maxObjects: 500,
  emergencyThreshold: 0.9
};

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    objectCount: 0,
    renderCalls: 0,
    lastUpdate: Date.now()
  };
  
  private qualitySettings: QualitySettings = { ...DEFAULT_QUALITY_SETTINGS };
  private limits: PerformanceLimits = { ...DEFAULT_PERFORMANCE_LIMITS };
  
  // Performance tracking
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private lastFPSUpdate = Date.now();
  
  // Optimization state
  private isOptimizing = false;
  private lastOptimization = 0;
  private optimizationCooldown = 2000; // 2 seconds between optimizations
  private qualityLevel = 2; // 0=low, 1=medium, 2=high
  
  // Frame rate limiting
  private targetFrameTime = 1000 / 60; // 60 FPS
  private lastFrameTimestamp = 0;
  
  // Callbacks
  private qualityChangeCallbacks: Array<(settings: QualitySettings) => void> = [];
  private performanceWarningCallbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  private constructor() {
    this.startPerformanceMonitoring();
    
    // Register with memory manager
    memoryManager.registerMemoryPressureCallback((pressure) => {
      if (pressure > 0.8) {
        this.handleMemoryPressure(pressure);
      }
    });
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Start performance monitoring loop
  private startPerformanceMonitoring(): void {
    const monitor = () => {
      this.updateMetrics();
      this.checkPerformance();
      requestAnimationFrame(monitor);
    };
    
    requestAnimationFrame(monitor);
  }

  // Update performance metrics
  private updateMetrics(): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    // Update frame time
    this.metrics.frameTime = deltaTime;
    this.frameTimeHistory.push(deltaTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate FPS
    this.frameCount++;
    const timeSinceLastFPSUpdate = Date.now() - this.lastFPSUpdate;
    if (timeSinceLastFPSUpdate >= 1000) {
      this.metrics.fps = (this.frameCount * 1000) / timeSinceLastFPSUpdate;
      this.fpsHistory.push(this.metrics.fps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastFPSUpdate = Date.now();
    }
    
    // Update memory usage
    const memoryStats = memoryManager.getStats();
    this.metrics.memoryUsage = memoryStats.memoryUsageMB;
    
    // Update object count
    const poolStats = gameObjectPool.getStats();
    this.metrics.objectCount = poolStats.memory.totalObjects;
    
    this.metrics.lastUpdate = Date.now();
    this.lastFrameTime = now;
  }

  // Check performance and optimize if needed
  private checkPerformance(): void {
    const now = Date.now();
    
    // Don't optimize too frequently
    if (now - this.lastOptimization < this.optimizationCooldown) {
      return;
    }
    
    const avgFPS = this.getAverageFPS();
    const memoryPressure = memoryManager.getMemoryPressure();
    
    // Check if optimization is needed
    const needsOptimization = 
      avgFPS < this.limits.minFPS ||
      this.metrics.memoryUsage > this.limits.maxMemoryMB ||
      this.metrics.objectCount > this.limits.maxObjects ||
      memoryPressure > this.limits.emergencyThreshold;
    
    if (needsOptimization && !this.isOptimizing) {
      this.optimizePerformance();
    }
    
    // Check if we can increase quality
    else if (avgFPS > this.qualitySettings.targetFPS + 10 && 
             memoryPressure < 0.5 && 
             this.qualityLevel < 2) {
      this.increaseQuality();
    }
  }

  // Optimize performance by reducing quality
  private optimizePerformance(): void {
    this.isOptimizing = true;
    this.lastOptimization = Date.now();
    
    console.warn('PerformanceOptimizer: Performance issues detected, optimizing...');
    console.log('Current metrics:', this.metrics);
    
    const avgFPS = this.getAverageFPS();
    const memoryPressure = memoryManager.getMemoryPressure();
    
    // Determine optimization level based on severity
    if (avgFPS < 20 || memoryPressure > 0.9) {
      this.setQualityLevel(0); // Emergency: lowest quality
      this.emergencyCleanup();
    } else if (avgFPS < 40 || memoryPressure > 0.7) {
      this.setQualityLevel(1); // Medium quality
    } else {
      this.reduceQualityGradually();
    }
    
    // Notify callbacks
    this.performanceWarningCallbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('PerformanceOptimizer: Warning callback error:', error);
      }
    });
    
    setTimeout(() => {
      this.isOptimizing = false;
    }, 1000);
  }

  // Handle memory pressure
  private handleMemoryPressure(pressure: number): void {
    console.warn(`PerformanceOptimizer: Memory pressure detected: ${(pressure * 100).toFixed(1)}%`);
    
    if (pressure > 0.95) {
      this.emergencyCleanup();
      this.setQualityLevel(0);
    } else if (pressure > 0.8) {
      this.setQualityLevel(Math.min(this.qualityLevel, 1));
    }
  }

  // Emergency cleanup
  private emergencyCleanup(): void {
    console.error('PerformanceOptimizer: Emergency cleanup initiated');
    
    // Trigger game object pool emergency cleanup
    gameObjectPool.emergencyCleanup();
    
    // Force memory manager cleanup
    memoryManager.forceCleanup();
    
    // Set very conservative limits
    this.qualitySettings.maxEnemies = 20;
    this.qualitySettings.maxProjectiles = 30;
    this.qualitySettings.maxParticles = 50;
    
    this.notifyQualityChange();
  }

  // Set quality level (0=low, 1=medium, 2=high)
  private setQualityLevel(level: number): void {
    this.qualityLevel = Math.max(0, Math.min(2, level));
    
    switch (this.qualityLevel) {
      case 0: // Low quality
        this.qualitySettings = {
          maxEnemies: 25,
          maxProjectiles: 50,
          maxParticles: 100,
          lodDistance: 50,
          shadowQuality: 'off',
          textureQuality: 'low',
          effectsQuality: 'low',
          targetFPS: 30
        };
        break;
        
      case 1: // Medium quality
        this.qualitySettings = {
          maxEnemies: 40,
          maxProjectiles: 80,
          maxParticles: 150,
          lodDistance: 75,
          shadowQuality: 'low',
          textureQuality: 'medium',
          effectsQuality: 'medium',
          targetFPS: 45
        };
        break;
        
      case 2: // High quality
        this.qualitySettings = { ...DEFAULT_QUALITY_SETTINGS };
        break;
    }
    
    this.targetFrameTime = 1000 / this.qualitySettings.targetFPS;
    this.notifyQualityChange();
    
    console.log(`PerformanceOptimizer: Quality level set to ${level} (${['Low', 'Medium', 'High'][level]})`);
  }

  // Gradually reduce quality
  private reduceQualityGradually(): void {
    // Reduce limits by 20%
    this.qualitySettings.maxEnemies = Math.floor(this.qualitySettings.maxEnemies * 0.8);
    this.qualitySettings.maxProjectiles = Math.floor(this.qualitySettings.maxProjectiles * 0.8);
    this.qualitySettings.maxParticles = Math.floor(this.qualitySettings.maxParticles * 0.8);
    this.qualitySettings.lodDistance = Math.floor(this.qualitySettings.lodDistance * 0.9);
    
    // Ensure minimums
    this.qualitySettings.maxEnemies = Math.max(15, this.qualitySettings.maxEnemies);
    this.qualitySettings.maxProjectiles = Math.max(30, this.qualitySettings.maxProjectiles);
    this.qualitySettings.maxParticles = Math.max(50, this.qualitySettings.maxParticles);
    
    this.notifyQualityChange();
  }

  // Increase quality when performance allows
  private increaseQuality(): void {
    if (this.qualityLevel < 2) {
      this.setQualityLevel(this.qualityLevel + 1);
      console.log('PerformanceOptimizer: Increasing quality level due to good performance');
    }
  }

  // Get average FPS over recent history
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return this.metrics.fps;
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  // Get average frame time
  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return this.metrics.frameTime;
    
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  // Notify quality change callbacks
  private notifyQualityChange(): void {
    this.qualityChangeCallbacks.forEach(callback => {
      try {
        callback(this.qualitySettings);
      } catch (error) {
        console.error('PerformanceOptimizer: Quality change callback error:', error);
      }
    });
  }

  // Frame rate limiting
  public shouldSkipFrame(): boolean {
    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTimestamp;
    
    if (timeSinceLastFrame < this.targetFrameTime) {
      return true; // Skip this frame
    }
    
    this.lastFrameTimestamp = now;
    return false;
  }

  // Public API
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  public setQualitySettings(settings: Partial<QualitySettings>): void {
    this.qualitySettings = { ...this.qualitySettings, ...settings };
    this.targetFrameTime = 1000 / this.qualitySettings.targetFPS;
    this.notifyQualityChange();
  }

  public getLimits(): PerformanceLimits {
    return { ...this.limits };
  }

  public setLimits(limits: Partial<PerformanceLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  // Register callbacks
  public onQualityChange(callback: (settings: QualitySettings) => void): void {
    this.qualityChangeCallbacks.push(callback);
  }

  public onPerformanceWarning(callback: (metrics: PerformanceMetrics) => void): void {
    this.performanceWarningCallbacks.push(callback);
  }

  // Performance analysis
  public getPerformanceReport(): {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    fps: { current: number; average: number; target: number };
    memory: { usage: number; pressure: number; limit: number };
    objects: { count: number; limit: number };
    recommendations: string[];
  } {
    const avgFPS = this.getAverageFPS();
    const memoryPressure = memoryManager.getMemoryPressure();
    const recommendations: string[] = [];
    
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'excellent';
    
    // Determine status
    if (avgFPS < 20 || memoryPressure > 0.9) {
      status = 'critical';
      recommendations.push('Consider closing other applications');
      recommendations.push('Reduce game quality settings');
    } else if (avgFPS < 30 || memoryPressure > 0.7) {
      status = 'poor';
      recommendations.push('Lower graphics quality');
      recommendations.push('Reduce number of active objects');
    } else if (avgFPS < 45 || memoryPressure > 0.5) {
      status = 'fair';
      recommendations.push('Consider reducing effects quality');
    } else if (avgFPS < 55 || memoryPressure > 0.3) {
      status = 'good';
    }
    
    // Add specific recommendations
    if (this.metrics.objectCount > this.limits.maxObjects * 0.8) {
      recommendations.push('Too many active objects - some will be cleaned up');
    }
    
    if (this.metrics.memoryUsage > this.limits.maxMemoryMB * 0.8) {
      recommendations.push('High memory usage detected');
    }
    
    return {
      status,
      fps: {
        current: this.metrics.fps,
        average: avgFPS,
        target: this.qualitySettings.targetFPS
      },
      memory: {
        usage: this.metrics.memoryUsage,
        pressure: memoryPressure,
        limit: this.limits.maxMemoryMB
      },
      objects: {
        count: this.metrics.objectCount,
        limit: this.limits.maxObjects
      },
      recommendations
    };
  }

  // Force optimization
  public forceOptimization(): void {
    this.lastOptimization = 0; // Reset cooldown
    this.optimizePerformance();
  }

  // Reset to default settings
  public resetToDefaults(): void {
    this.qualitySettings = { ...DEFAULT_QUALITY_SETTINGS };
    this.limits = { ...DEFAULT_PERFORMANCE_LIMITS };
    this.qualityLevel = 2;
    this.targetFrameTime = 1000 / this.qualitySettings.targetFPS;
    this.notifyQualityChange();
  }

  // Dispose
  public dispose(): void {
    this.qualityChangeCallbacks.length = 0;
    this.performanceWarningCallbacks.length = 0;
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();
