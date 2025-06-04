// Terrain generation utilities for procedural world generation
export interface ChunkCoord {
  x: number;
  z: number;
}

export interface TerrainFeature {
  id: string;
  type: 'tree' | 'rock' | 'shop' | 'waterfall';
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}

export interface ChunkData {
  coord: ChunkCoord;
  features: TerrainFeature[];
  heightMap?: number[][];
  biome: 'forest' | 'clearing' | 'dense_forest' | 'rocky';
}

// Simple noise function for procedural generation
class SimplexNoise {
  private perm: number[];
  private grad3: number[][];

  constructor(seed: number = 0) {
    // Initialize permutation table with seed
    this.perm = [];
    for (let i = 0; i < 256; i++) {
      this.perm[i] = i;
    }
    
    // Shuffle based on seed
    const random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }
    
    // Duplicate for overflow
    for (let i = 0; i < 256; i++) {
      this.perm[256 + i] = this.perm[i];
    }

    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
  }

  private seededRandom(seed: number) {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = 0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = 0;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = 0;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }
}

export class TerrainGenerator {
  private noise: SimplexNoise;
  private chunkSize: number;
  private seed: number;

  constructor(seed: number = 12345, chunkSize: number = 50) {
    this.seed = seed;
    this.chunkSize = chunkSize;
    this.noise = new SimplexNoise(seed);
  }

  // Generate a chunk at the given coordinates
  generateChunk(coord: ChunkCoord): ChunkData {
    const features: TerrainFeature[] = [];
    
    // Calculate world position of chunk
    const worldX = coord.x * this.chunkSize;
    const worldZ = coord.z * this.chunkSize;
    
    // Determine biome based on distance from origin and noise
    const distanceFromOrigin = Math.sqrt(coord.x * coord.x + coord.z * coord.z);
    const biomeNoise = this.noise.noise2D(coord.x * 0.1, coord.z * 0.1);
    
    let biome: ChunkData['biome'] = 'forest';
    if (distanceFromOrigin < 2 && biomeNoise > -0.3) {
      biome = 'clearing'; // More open areas near spawn
    } else if (biomeNoise > 0.3) {
      biome = 'dense_forest';
    } else if (biomeNoise < -0.5) {
      biome = 'rocky';
    }

    // Generate trees based on biome
    this.generateTrees(features, worldX, worldZ, biome);
    
    // Generate rocks
    this.generateRocks(features, worldX, worldZ, biome);
    
    // Generate shops (every 5th chunk in a grid pattern)
    if (coord.x % 5 === 0 && coord.z % 5 === 0 && (coord.x !== 0 || coord.z !== 0)) {
      this.generateShop(features, worldX, worldZ);
    }
    
    // Generate special features
    this.generateSpecialFeatures(features, worldX, worldZ, coord);

    return {
      coord,
      features,
      biome
    };
  }

  private generateTrees(features: TerrainFeature[], worldX: number, worldZ: number, biome: ChunkData['biome']) {
    let treeCount: number;
    let treeSpacing: number;
    
    switch (biome) {
      case 'clearing':
        treeCount = 3 + Math.floor(Math.random() * 4); // 3-6 trees
        treeSpacing = 15;
        break;
      case 'dense_forest':
        treeCount = 15 + Math.floor(Math.random() * 10); // 15-24 trees
        treeSpacing = 8;
        break;
      case 'rocky':
        treeCount = 2 + Math.floor(Math.random() * 3); // 2-4 trees
        treeSpacing = 20;
        break;
      default: // forest
        treeCount = 8 + Math.floor(Math.random() * 6); // 8-13 trees
        treeSpacing = 12;
        break;
    }

    // Use Poisson disk sampling for natural tree distribution
    const trees = this.poissonDiskSampling(
      worldX, worldZ, this.chunkSize, this.chunkSize,
      treeSpacing, treeCount
    );

    trees.forEach((pos, index) => {
      // Add some height variation
      const heightNoise = this.noise.noise2D(pos[0] * 0.05, pos[2] * 0.05);
      const y = Math.max(0, heightNoise * 2);
      
      features.push({
        id: `tree-${worldX}-${worldZ}-${index}`,
        type: 'tree',
        position: [pos[0], y, pos[2]],
        scale: 0.8 + Math.random() * 0.4, // Random scale 0.8-1.2
        rotation: Math.random() * Math.PI * 2
      });
    });
  }

  private generateRocks(features: TerrainFeature[], worldX: number, worldZ: number, biome: ChunkData['biome']) {
    let rockCount = 0;
    
    if (biome === 'rocky') {
      rockCount = 5 + Math.floor(Math.random() * 8); // 5-12 rocks
    } else if (biome === 'forest') {
      rockCount = 1 + Math.floor(Math.random() * 3); // 1-3 rocks
    } else if (biome === 'dense_forest') {
      rockCount = 2 + Math.floor(Math.random() * 4); // 2-5 rocks
    }

    for (let i = 0; i < rockCount; i++) {
      const x = worldX + Math.random() * this.chunkSize;
      const z = worldZ + Math.random() * this.chunkSize;
      const heightNoise = this.noise.noise2D(x * 0.05, z * 0.05);
      const y = Math.max(0, heightNoise * 2);
      
      features.push({
        id: `rock-${worldX}-${worldZ}-${i}`,
        type: 'rock',
        position: [x, y, z],
        scale: 0.5 + Math.random() * 1.0, // Random scale 0.5-1.5
        rotation: Math.random() * Math.PI * 2
      });
    }
  }

  private generateShop(features: TerrainFeature[], worldX: number, worldZ: number) {
    // Place shop in center of chunk
    const x = worldX + this.chunkSize / 2;
    const z = worldZ + this.chunkSize / 2;
    
    features.push({
      id: `shop-${worldX}-${worldZ}`,
      type: 'shop',
      position: [x, 0, z],
      rotation: Math.random() * Math.PI * 2
    });
  }

  private generateSpecialFeatures(features: TerrainFeature[], worldX: number, worldZ: number, coord: ChunkCoord) {
    // Generate waterfalls occasionally in specific locations
    const waterfall_noise = this.noise.noise2D(coord.x * 0.3, coord.z * 0.3);
    if (waterfall_noise > 0.7 && Math.random() < 0.1) {
      const x = worldX + Math.random() * this.chunkSize;
      const z = worldZ + Math.random() * this.chunkSize;
      
      features.push({
        id: `waterfall-${worldX}-${worldZ}`,
        type: 'waterfall',
        position: [x, 10, z]
      });
    }
  }

  // Poisson disk sampling for natural object distribution
  private poissonDiskSampling(
    startX: number, startZ: number, 
    width: number, height: number, 
    minDistance: number, maxPoints: number
  ): [number, number, number][] {
    const points: [number, number, number][] = [];
    const grid: (number | null)[][] = [];
    const cellSize = minDistance / Math.sqrt(2);
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    
    // Initialize grid
    for (let i = 0; i < gridWidth; i++) {
      grid[i] = [];
      for (let j = 0; j < gridHeight; j++) {
        grid[i][j] = null;
      }
    }
    
    // Add initial point
    const initialX = startX + width / 2;
    const initialZ = startZ + height / 2;
    points.push([initialX, 0, initialZ]);
    
    const activeList: number[] = [0];
    
    while (activeList.length > 0 && points.length < maxPoints) {
      const randomIndex = Math.floor(Math.random() * activeList.length);
      const pointIndex = activeList[randomIndex];
      const point = points[pointIndex];
      
      let found = false;
      
      // Try to generate new points around this point
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * minDistance;
        const newX = point[0] + Math.cos(angle) * distance;
        const newZ = point[2] + Math.sin(angle) * distance;
        
        // Check if point is within bounds
        if (newX >= startX && newX < startX + width && 
            newZ >= startZ && newZ < startZ + height) {
          
          // Check if point is far enough from other points
          let valid = true;
          for (const existingPoint of points) {
            const dx = newX - existingPoint[0];
            const dz = newZ - existingPoint[2];
            if (Math.sqrt(dx * dx + dz * dz) < minDistance) {
              valid = false;
              break;
            }
          }
          
          if (valid) {
            points.push([newX, 0, newZ]);
            activeList.push(points.length - 1);
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        activeList.splice(randomIndex, 1);
      }
    }
    
    return points;
  }

  // Get height at a specific world position
  getHeightAt(x: number, z: number): number {
    const heightNoise = this.noise.noise2D(x * 0.05, z * 0.05);
    return Math.max(0, heightNoise * 2);
  }

  // Check if a position should have a shop
  hasShopAt(coord: ChunkCoord): boolean {
    return coord.x % 5 === 0 && coord.z % 5 === 0 && (coord.x !== 0 || coord.z !== 0);
  }
}
