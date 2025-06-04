import { TerrainGenerator, ChunkCoord, ChunkData } from './TerrainGenerator';
import { LODLevel } from './LODManager';
import * as THREE from 'three';

export interface LoadedChunk {
  data: ChunkData;
  lastAccessed: number;
  renderObjects: THREE.Object3D[]; // Three.js objects for this chunk
  lodLevel: LODLevel; // Current LOD level for this chunk
  objectTypes: string[]; // Track object types for proper cleanup
}

export class ChunkManager {
  private generator: TerrainGenerator;
  private loadedChunks: Map<string, LoadedChunk>;
  private chunkSize: number;
  private renderRadius: number; // How many chunks to keep loaded around player
  private maxCachedChunks: number;
  private currentPlayerChunk: ChunkCoord;

  constructor(
    seed: number = 12345, 
    chunkSize: number = 50, 
    renderRadius: number = 2,
    maxCachedChunks: number = 25
  ) {
    this.generator = new TerrainGenerator(seed, chunkSize);
    this.loadedChunks = new Map();
    this.chunkSize = chunkSize;
    this.renderRadius = renderRadius;
    this.maxCachedChunks = maxCachedChunks;
    this.currentPlayerChunk = { x: 0, z: 0 };
  }

  // Convert world position to chunk coordinates
  worldToChunk(worldX: number, worldZ: number): ChunkCoord {
    return {
      x: Math.floor(worldX / this.chunkSize),
      z: Math.floor(worldZ / this.chunkSize)
    };
  }

  // Convert chunk coordinates to world position (chunk center)
  chunkToWorld(coord: ChunkCoord): [number, number] {
    return [
      coord.x * this.chunkSize + this.chunkSize / 2,
      coord.z * this.chunkSize + this.chunkSize / 2
    ];
  }

  // Generate unique key for chunk coordinates
  private chunkKey(coord: ChunkCoord): string {
    return `${coord.x},${coord.z}`;
  }

  // Get chunk data, generating if necessary
  getChunk(coord: ChunkCoord): ChunkData {
    const key = this.chunkKey(coord);
    let loadedChunk = this.loadedChunks.get(key);

    if (!loadedChunk) {
      // Generate new chunk
      const chunkData = this.generator.generateChunk(coord);
      loadedChunk = {
        data: chunkData,
        lastAccessed: Date.now(),
        renderObjects: [],
        lodLevel: LODLevel.HIGH, // Default to high LOD, will be updated based on distance
        objectTypes: []
      };
      this.loadedChunks.set(key, loadedChunk);
    } else {
      // Update access time
      loadedChunk.lastAccessed = Date.now();
    }

    return loadedChunk.data;
  }

  // Update player position and manage chunks
  updatePlayerPosition(worldX: number, worldZ: number): {
    chunksToLoad: ChunkCoord[];
    chunksToUnload: string[];
  } {
    const newPlayerChunk = this.worldToChunk(worldX, worldZ);
    
    // Check if player moved to a different chunk
    if (newPlayerChunk.x === this.currentPlayerChunk.x && 
        newPlayerChunk.z === this.currentPlayerChunk.z) {
      return { chunksToLoad: [], chunksToUnload: [] };
    }

    this.currentPlayerChunk = newPlayerChunk;

    // Determine which chunks should be loaded
    const requiredChunks = new Set<string>();
    for (let x = newPlayerChunk.x - this.renderRadius; x <= newPlayerChunk.x + this.renderRadius; x++) {
      for (let z = newPlayerChunk.z - this.renderRadius; z <= newPlayerChunk.z + this.renderRadius; z++) {
        requiredChunks.add(this.chunkKey({ x, z }));
      }
    }

    // Find chunks to load (required but not loaded)
    const chunksToLoad: ChunkCoord[] = [];
    for (const key of requiredChunks) {
      if (!this.loadedChunks.has(key)) {
        const [x, z] = key.split(',').map(Number);
        chunksToLoad.push({ x, z });
      }
    }

    // Find chunks to unload (loaded but not required)
    const chunksToUnload: string[] = [];
    for (const key of this.loadedChunks.keys()) {
      if (!requiredChunks.has(key)) {
        chunksToUnload.push(key);
      }
    }

    return { chunksToLoad, chunksToUnload };
  }

  // Get all currently loaded chunks within render distance
  getLoadedChunksInRange(): ChunkData[] {
    const chunks: ChunkData[] = [];
    
    for (let x = this.currentPlayerChunk.x - this.renderRadius; x <= this.currentPlayerChunk.x + this.renderRadius; x++) {
      for (let z = this.currentPlayerChunk.z - this.renderRadius; z <= this.currentPlayerChunk.z + this.renderRadius; z++) {
        const key = this.chunkKey({ x, z });
        const loadedChunk = this.loadedChunks.get(key);
        if (loadedChunk) {
          chunks.push(loadedChunk.data);
        }
      }
    }
    
    return chunks;
  }

  // Store render objects for a chunk
  setChunkRenderObjects(coord: ChunkCoord, objects: THREE.Object3D[]): void {
    const key = this.chunkKey(coord);
    const loadedChunk = this.loadedChunks.get(key);
    if (loadedChunk) {
      loadedChunk.renderObjects = objects;
    }
  }

  // Get render objects for a chunk
  getChunkRenderObjects(coord: ChunkCoord): THREE.Object3D[] {
    const key = this.chunkKey(coord);
    const loadedChunk = this.loadedChunks.get(key);
    return loadedChunk ? loadedChunk.renderObjects : [];
  }

  // Unload a chunk and return its render objects for cleanup
  unloadChunk(key: string): THREE.Object3D[] {
    const loadedChunk = this.loadedChunks.get(key);
    if (loadedChunk) {
      this.loadedChunks.delete(key);
      return loadedChunk.renderObjects;
    }
    return [];
  }

  // Clean up old chunks if we have too many cached
  cleanupOldChunks(): string[] {
    if (this.loadedChunks.size <= this.maxCachedChunks) {
      return [];
    }

    // Sort chunks by last accessed time
    const sortedChunks = Array.from(this.loadedChunks.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest chunks
    const chunksToRemove = sortedChunks.slice(0, this.loadedChunks.size - this.maxCachedChunks);
    const removedKeys: string[] = [];

    for (const [key] of chunksToRemove) {
      // Don't remove chunks that are currently in render range
      const [x, z] = key.split(',').map(Number);
      const distance = Math.max(
        Math.abs(x - this.currentPlayerChunk.x),
        Math.abs(z - this.currentPlayerChunk.z)
      );
      
      if (distance > this.renderRadius) {
        this.loadedChunks.delete(key);
        removedKeys.push(key);
      }
    }

    return removedKeys;
  }

  // Get height at world position using terrain generator
  getHeightAt(worldX: number, worldZ: number): number {
    return this.generator.getHeightAt(worldX, worldZ);
  }

  // Check if there should be a shop at given chunk coordinates
  hasShopAt(coord: ChunkCoord): boolean {
    return this.generator.hasShopAt(coord);
  }

  // Get current player chunk
  getCurrentPlayerChunk(): ChunkCoord {
    return { ...this.currentPlayerChunk };
  }

  // Get chunk size
  getChunkSize(): number {
    return this.chunkSize;
  }

  // Get render radius
  getRenderRadius(): number {
    return this.renderRadius;
  }

  // Get statistics for debugging
  getStats(): {
    loadedChunks: number;
    currentChunk: ChunkCoord;
    memoryUsage: string;
  } {
    const totalObjects = Array.from(this.loadedChunks.values())
      .reduce((sum, chunk) => sum + chunk.renderObjects.length, 0);

    return {
      loadedChunks: this.loadedChunks.size,
      currentChunk: this.currentPlayerChunk,
      memoryUsage: `${totalObjects} objects`
    };
  }

  // Force load chunks in a specific area (useful for preloading)
  preloadArea(centerX: number, centerZ: number, radius: number): ChunkCoord[] {
    const centerChunk = this.worldToChunk(centerX, centerZ);
    const loadedChunks: ChunkCoord[] = [];

    for (let x = centerChunk.x - radius; x <= centerChunk.x + radius; x++) {
      for (let z = centerChunk.z - radius; z <= centerChunk.z + radius; z++) {
        const coord = { x, z };
        this.getChunk(coord); // This will generate and cache the chunk
        loadedChunks.push(coord);
      }
    }

    return loadedChunks;
  }
}
