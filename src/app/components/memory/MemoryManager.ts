import * as THREE from 'three';

export interface MemoryStats {
  totalObjects: number;
  activeObjects: number;
  pooledObjects: number;
  memoryUsageMB: number;
  webglMemoryMB: number;
  lastCleanup: number;
  gcTriggers: number;
}

export interface MemoryLimits {
  maxTotalObjects: number;
  maxMemoryMB: number;
  maxWebglMemoryMB: number;
  cleanupInterval: number;
  gcThreshold: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private stats: MemoryStats;
  private limits: MemoryLimits;
  private trackedObjects: Set<object> = new Set();
  private disposableObjects: Map<string, () => void> = new Map();
  private cleanupCallbacks: Array<() => void> = [];
  private memoryPressureCallbacks: Array<(pressure: number) => void> = [];
  private lastMemoryCheck: number = 0;
  private memoryCheckInterval: number = 1000; // Check every second

  private constructor() {
    this.stats = {
      totalObjects: 0,
      activeObjects: 0,
      pooledObjects: 0,
      memoryUsageMB: 0,
      webglMemoryMB: 0,
      lastCleanup: Date.now(),
      gcTriggers: 0
    };

    this.limits = {
      maxTotalObjects: 10000,
      maxMemoryMB: 512,
      maxWebglMemoryMB: 256,
      cleanupInterval: 30000, // 30 seconds
      gcThreshold: 400 // MB
    };

    this.startMemoryMonitoring();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Track an object for memory management
  public trackObject(obj: object, id?: string): void {
    this.trackedObjects.add(obj);
    this.stats.totalObjects++;
    
    if (obj instanceof THREE.Object3D) {
      this.stats.activeObjects++;
    }

    // Auto-cleanup for Three.js objects
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Group) {
      const cleanupId = id || `object_${Date.now()}_${Math.random()}`;
      this.disposableObjects.set(cleanupId, () => {
        this.disposeThreeObject(obj);
      });
    }
  }

  // Untrack an object
  public untrackObject(obj: object, id?: string): void {
    if (this.trackedObjects.has(obj)) {
      this.trackedObjects.delete(obj);
      this.stats.totalObjects--;
      
      if (obj instanceof THREE.Object3D) {
        this.stats.activeObjects--;
      }
    }

    if (id && this.disposableObjects.has(id)) {
      this.disposableObjects.delete(id);
    }
  }

  // Register a cleanup callback
  public registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  // Register memory pressure callback
  public registerMemoryPressureCallback(callback: (pressure: number) => void): void {
    this.memoryPressureCallbacks.push(callback);
  }

  // Force cleanup of all tracked objects
  public forceCleanup(): void {
    console.log('MemoryManager: Force cleanup initiated');
    
    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('MemoryManager: Cleanup callback error:', error);
      }
    });

    // Dispose tracked Three.js objects
    this.disposableObjects.forEach((disposer, id) => {
      try {
        disposer();
      } catch (error) {
        console.error(`MemoryManager: Error disposing object ${id}:`, error);
      }
    });

    // Clear collections
    this.trackedObjects.clear();
    this.disposableObjects.clear();
    
    // Reset stats
    this.stats.totalObjects = 0;
    this.stats.activeObjects = 0;
    this.stats.lastCleanup = Date.now();

    // Force garbage collection if available
    this.triggerGarbageCollection();
  }

  // Dispose a Three.js object properly
  private disposeThreeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Dispose geometry
        if (child.geometry) {
          child.geometry.dispose();
        }

        // Dispose materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    // Remove from parent
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  }

  // Dispose a Three.js material properly
  private disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    });

    // Dispose the material itself
    material.dispose();
  }

  // Get current memory statistics
  public getStats(): MemoryStats {
    return { ...this.stats };
  }

  // Get memory limits
  public getLimits(): MemoryLimits {
    return { ...this.limits };
  }

  // Update memory limits
  public setLimits(newLimits: Partial<MemoryLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
  }

  // Check if we're approaching memory limits
  public getMemoryPressure(): number {
    const objectPressure = this.stats.totalObjects / this.limits.maxTotalObjects;
    const memoryPressure = this.stats.memoryUsageMB / this.limits.maxMemoryMB;
    const webglPressure = this.stats.webglMemoryMB / this.limits.maxWebglMemoryMB;
    
    return Math.max(objectPressure, memoryPressure, webglPressure);
  }

  // Start memory monitoring loop
  private startMemoryMonitoring(): void {
    const monitor = () => {
      const now = Date.now();
      
      if (now - this.lastMemoryCheck >= this.memoryCheckInterval) {
        this.updateMemoryStats();
        this.checkMemoryPressure();
        this.lastMemoryCheck = now;
      }

      // Check if cleanup is needed
      if (now - this.stats.lastCleanup >= this.limits.cleanupInterval) {
        this.performRoutineCleanup();
      }

      // Continue monitoring
      requestAnimationFrame(monitor);
    };

    monitor();
  }

  // Update memory statistics
  private updateMemoryStats(): void {
    // Estimate memory usage (rough approximation)
    const perfMemory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
    if (perfMemory) {
      this.stats.memoryUsageMB = perfMemory.usedJSHeapSize / (1024 * 1024);
    }

    // Estimate WebGL memory usage
    const renderer = this.getWebGLRenderer();
    if (renderer) {
      const info = renderer.info;
      this.stats.webglMemoryMB = (info.memory.geometries * 0.1 + info.memory.textures * 0.5); // Rough estimate
    }
  }

  // Get WebGL renderer instance (if available)
  private getWebGLRenderer(): THREE.WebGLRenderer | null {
    // Try to find renderer in global scope or DOM
    const canvas = document.querySelector('canvas');
    const canvasWithRenderer = canvas as HTMLCanvasElement & { __renderer?: THREE.WebGLRenderer };
    if (canvasWithRenderer && canvasWithRenderer.__renderer) {
      return canvasWithRenderer.__renderer;
    }
    return null;
  }

  // Check memory pressure and trigger callbacks
  private checkMemoryPressure(): void {
    const pressure = this.getMemoryPressure();
    
    if (pressure > 0.8) {
      console.warn(`MemoryManager: High memory pressure detected: ${(pressure * 100).toFixed(1)}%`);
      
      // Notify pressure callbacks
      this.memoryPressureCallbacks.forEach(callback => {
        try {
          callback(pressure);
        } catch (error) {
          console.error('MemoryManager: Memory pressure callback error:', error);
        }
      });

      // Force cleanup if pressure is critical
      if (pressure > 0.95) {
        console.error('MemoryManager: Critical memory pressure - forcing cleanup');
        this.forceCleanup();
      }
    }
  }

  // Perform routine cleanup
  private performRoutineCleanup(): void {
    console.log('MemoryManager: Performing routine cleanup');
    
    // Execute cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('MemoryManager: Routine cleanup callback error:', error);
      }
    });

    this.stats.lastCleanup = Date.now();

    // Trigger GC if memory usage is high
    if (this.stats.memoryUsageMB > this.limits.gcThreshold) {
      this.triggerGarbageCollection();
    }
  }

  // Trigger garbage collection if available
  private triggerGarbageCollection(): void {
    const windowWithGc = window as Window & { gc?: () => void };
    if (windowWithGc.gc) {
      try {
        windowWithGc.gc();
        this.stats.gcTriggers++;
        console.log('MemoryManager: Garbage collection triggered');
      } catch (error) {
        console.warn('MemoryManager: Failed to trigger GC:', error);
      }
    }
  }

  // Create a memory-safe object pool
  public createObjectPool<T extends object>(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 100
  ): {
    get: () => T;
    release: (obj: T) => void;
    dispose: () => void;
    getStats: () => { total: number; available: number; inUse: number };
  } {
    const pool: T[] = [];
    const inUse = new Set<T>();

    return {
      get: (): T => {
        let obj = pool.pop();
        if (!obj) {
          obj = factory();
          this.trackObject(obj);
        }
        inUse.add(obj);
        return obj;
      },

      release: (obj: T): void => {
        if (inUse.has(obj)) {
          inUse.delete(obj);
          reset(obj);
          if (pool.length < maxSize) {
            pool.push(obj);
          } else {
            // Pool is full, dispose the object
            this.untrackObject(obj);
          }
        }
      },

      dispose: (): void => {
        pool.forEach(obj => this.untrackObject(obj));
        inUse.forEach(obj => this.untrackObject(obj));
        pool.length = 0;
        inUse.clear();
      },

      getStats: () => ({
        total: pool.length + inUse.size,
        available: pool.length,
        inUse: inUse.size
      })
    };
  }

  // Dispose the memory manager
  public dispose(): void {
    this.forceCleanup();
    this.cleanupCallbacks.length = 0;
    this.memoryPressureCallbacks.length = 0;
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();
