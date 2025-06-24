import * as THREE from 'three';
import { ChunkCoord } from './TerrainGenerator';

export enum LODLevel {
  HIGH = 0,    // 0-45 units: Full detail
  MEDIUM = 1,  // 45-95 units: Reduced detail
  LOW = 2,     // 95-145 units: Minimal detail
  CULLED = 3   // 145+ units: Not rendered
}

export interface LODGeometry {
  high: THREE.BufferGeometry;
  medium: THREE.BufferGeometry;
  low: THREE.BufferGeometry;
}

export interface LODMaterial {
  high: THREE.Material;
  medium: THREE.Material;
  low: THREE.Material;
}

export class LODManager {
  private lodGeometries: Map<string, LODGeometry> = new Map();
  private lodMaterials: Map<string, LODMaterial> = new Map();
  private lodDistances: number[];
  private chunkSize: number;
  private initialized: boolean = false;
  private initializationAttempts: number = 0;
  private maxInitializationAttempts: number = 3;

  constructor(chunkSize: number = 50) {
    this.chunkSize = chunkSize;
    this.lodDistances = [45, 95, 145]; // Distance thresholds for LOD levels with hysteresis
    // Don't initialize immediately - use lazy initialization
    console.log('LODManager: Constructor completed, will initialize on first use');
  }

  private isThreeJSReady(): boolean {
    try {
      // Test if we can create a basic Three.js geometry
      const testGeometry = new THREE.BoxGeometry(1, 1, 1);
      testGeometry.dispose();
      return true;
    } catch (error) {
      console.warn('LODManager: Three.js not ready yet:', error);
      return false;
    }
  }

  private initialize(): boolean {
    if (this.initialized) return true;
    
    this.initializationAttempts++;
    
    if (this.initializationAttempts > this.maxInitializationAttempts) {
      console.error('LODManager: Max initialization attempts reached, using fallback mode');
      return false;
    }
    
    if (!this.isThreeJSReady()) {
      console.warn('LODManager: Three.js not ready, deferring initialization');
      return false;
    }
    
    try {
      console.log(`LODManager: Starting initialization (attempt ${this.initializationAttempts})...`);
      
      // Clear any existing data
      this.lodGeometries.clear();
      this.lodMaterials.clear();
      
      this.initializeLODGeometries();
      console.log('LODManager: Geometries initialized, count:', this.lodGeometries.size);
      
      if (this.lodGeometries.size === 0) {
        throw new Error('No geometries were initialized');
      }
      
      this.initializeLODMaterials();
      console.log('LODManager: Materials initialized, count:', this.lodMaterials.size);
      
      if (this.lodMaterials.size === 0) {
        throw new Error('No materials were initialized');
      }
      
      this.initialized = true;
      console.log('LODManager: Initialization complete!');
      return true;
    } catch (error) {
      console.error(`LODManager: Initialization failed (attempt ${this.initializationAttempts}):`, error);
      this.initialized = false;
      return false;
    }
  }

  private ensureInitialized(): boolean {
    if (this.initialized) return true;
    
    const success = this.initialize();
    if (!success && this.initializationAttempts < this.maxInitializationAttempts) {
      // Schedule retry for next frame
      setTimeout(() => this.initialize(), 16);
    }
    
    return success;
  }

  private initializeLODGeometries() {
    try {
      console.log('LODManager: Initializing geometries...');
      
      // Tree LOD geometries
      console.log('LODManager: Creating tree geometries...');
      this.lodGeometries.set('tree', {
        high: new THREE.SphereGeometry(3, 16, 12), // Full detail foliage
        medium: new THREE.SphereGeometry(3, 8, 6), // Medium detail foliage
        low: new THREE.SphereGeometry(3, 4, 3)     // Low detail foliage
      });

      // Tree trunk LOD geometries
      console.log('LODManager: Creating tree-trunk geometries...');
      this.lodGeometries.set('tree-trunk', {
        high: new THREE.BoxGeometry(1, 8, 1),      // Full detail trunk
        medium: new THREE.BoxGeometry(1, 8, 1),    // Same for medium (trunk is simple)
        low: new THREE.BoxGeometry(1, 6, 1)        // Shorter trunk for distance
      });

      // Rock LOD geometries
      console.log('LODManager: Creating rock geometries...');
      this.lodGeometries.set('rock', {
        high: new THREE.BoxGeometry(2, 1.5, 2),    // Full detail
        medium: new THREE.BoxGeometry(1.8, 1.3, 1.8), // Slightly smaller
        low: new THREE.BoxGeometry(1.5, 1, 1.5)    // Much simpler
      });

      // Shop LOD geometries (shops are important, so less aggressive LOD)
      console.log('LODManager: Creating shop geometries...');
      this.lodGeometries.set('shop', {
        high: new THREE.BoxGeometry(6, 4, 6),      // Full detail
        medium: new THREE.BoxGeometry(5, 3.5, 5),  // Slightly smaller
        low: new THREE.BoxGeometry(4, 3, 4)        // Simplified
      });

      // Ground plane LOD geometries
      console.log('LODManager: Creating ground geometries with chunkSize:', this.chunkSize);
      this.lodGeometries.set('ground', {
        high: new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 32, 32), // High tessellation
        medium: new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 16, 16), // Medium tessellation
        low: new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 4, 4)      // Low tessellation
      });
      
      console.log('LODManager: Geometry initialization complete. Total geometries:', this.lodGeometries.size);
    } catch (error) {
      console.error('LODManager: Error initializing geometries:', error);
      throw error;
    }
  }

  private initializeLODMaterials() {
    try {
      console.log('LODManager: Initializing materials...');
      
      // Tree materials with different quality levels
      console.log('LODManager: Creating tree-foliage materials...');
      this.lodMaterials.set('tree-foliage', {
        high: new THREE.MeshStandardMaterial({ 
          color: '#228B22', 
          roughness: 0.8,
          metalness: 0.1
        }),
        medium: new THREE.MeshLambertMaterial({ 
          color: '#228B22'
        }),
        low: new THREE.MeshBasicMaterial({ 
          color: '#228B22'
        })
      });

      console.log('LODManager: Creating tree-trunk materials...');
      this.lodMaterials.set('tree-trunk', {
        high: new THREE.MeshStandardMaterial({ 
          color: '#8B4513', 
          roughness: 0.9,
          metalness: 0.0
        }),
        medium: new THREE.MeshLambertMaterial({ 
          color: '#8B4513'
        }),
        low: new THREE.MeshBasicMaterial({ 
          color: '#8B4513'
        })
      });

      // Rock materials
      console.log('LODManager: Creating rock materials...');
      this.lodMaterials.set('rock', {
        high: new THREE.MeshStandardMaterial({ 
          color: '#696969', 
          roughness: 0.9,
          metalness: 0.1
        }),
        medium: new THREE.MeshLambertMaterial({ 
          color: '#696969'
        }),
        low: new THREE.MeshBasicMaterial({ 
          color: '#696969'
        })
      });

      // Shop materials
      console.log('LODManager: Creating shop materials...');
      this.lodMaterials.set('shop', {
        high: new THREE.MeshStandardMaterial({ 
          color: '#8B4513', 
          roughness: 0.8,
          metalness: 0.0
        }),
        medium: new THREE.MeshLambertMaterial({ 
          color: '#8B4513'
        }),
        low: new THREE.MeshBasicMaterial({ 
          color: '#8B4513'
        })
      });

      // Unified ground materials - all biomes use the same consistent color
      // Using ONLY MeshBasicMaterial to eliminate color shifting from lighting
      console.log('LODManager: Creating unified ground materials (BasicMaterial only)...');
      const unifiedGroundColor = '#228B22'; // Forest green for all biomes
      
      // Create materials that use ONLY MeshBasicMaterial for all LOD levels
      // This eliminates color changes when moving closer/farther from chunks
      const unifiedGroundMaterials = {
        high: new THREE.MeshBasicMaterial({ 
          color: unifiedGroundColor
        }),
        medium: new THREE.MeshBasicMaterial({ 
          color: unifiedGroundColor
        }),
        low: new THREE.MeshBasicMaterial({ 
          color: unifiedGroundColor
        })
      };

      // Set the same materials for all biome types
      this.lodMaterials.set('ground-forest', unifiedGroundMaterials);
      this.lodMaterials.set('ground-clearing', unifiedGroundMaterials);
      this.lodMaterials.set('ground-dense_forest', unifiedGroundMaterials);
      this.lodMaterials.set('ground-rocky', unifiedGroundMaterials);
      
      // Also create a generic fallback
      this.lodMaterials.set('ground', unifiedGroundMaterials);
      
      console.log('LODManager: Material initialization complete. Total materials:', this.lodMaterials.size);
    } catch (error) {
      console.error('LODManager: Error initializing materials:', error);
      throw error;
    }
  }

  // Calculate LOD level based on distance from player
  calculateLODLevel(playerPosition: [number, number, number], chunkCoord: ChunkCoord): LODLevel {
    // Calculate chunk center position
    const chunkCenterX = chunkCoord.x * this.chunkSize + this.chunkSize / 2;
    const chunkCenterZ = chunkCoord.z * this.chunkSize + this.chunkSize / 2;

    // Calculate distance from player to chunk center
    const dx = playerPosition[0] - chunkCenterX;
    const dz = playerPosition[2] - chunkCenterZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Determine LOD level based on distance
    if (distance <= this.lodDistances[0]) {
      return LODLevel.HIGH;
    } else if (distance <= this.lodDistances[1]) {
      return LODLevel.MEDIUM;
    } else if (distance <= this.lodDistances[2]) {
      return LODLevel.LOW;
    } else {
      return LODLevel.CULLED;
    }
  }

  // Calculate LOD level for individual objects within a chunk
  calculateObjectLODLevel(playerPosition: [number, number, number], objectPosition: [number, number, number]): LODLevel {
    const dx = playerPosition[0] - objectPosition[0];
    const dz = playerPosition[2] - objectPosition[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Use tighter distances for individual objects
    const objectLODDistances = [30, 60, 100]; // Closer thresholds for objects

    if (distance <= objectLODDistances[0]) {
      return LODLevel.HIGH;
    } else if (distance <= objectLODDistances[1]) {
      return LODLevel.MEDIUM;
    } else if (distance <= objectLODDistances[2]) {
      return LODLevel.LOW;
    } else {
      return LODLevel.CULLED;
    }
  }

  // Get appropriate geometry for LOD level
  getGeometry(type: string, lodLevel: LODLevel): THREE.BufferGeometry | null {
    if (lodLevel === LODLevel.CULLED) return null;

    // Try to ensure initialization
    const isInitialized = this.ensureInitialized();
    
    // If not initialized and we can't initialize, create fallback geometry
    if (!isInitialized) {
      console.warn(`LODManager: Creating fallback geometry for type: ${type}, LOD: ${lodLevel}`);
      return this.createFallbackGeometry(type, lodLevel);
    }

    const lodGeometry = this.lodGeometries.get(type);
    if (!lodGeometry) {
      console.warn(`No LOD geometry found for type: ${type}, creating fallback`);
      return this.createFallbackGeometry(type, lodLevel);
    }

    switch (lodLevel) {
      case LODLevel.HIGH:
        return lodGeometry.high;
      case LODLevel.MEDIUM:
        return lodGeometry.medium;
      case LODLevel.LOW:
        return lodGeometry.low;
      default:
        console.warn(`Invalid LOD level: ${lodLevel}`);
        return null;
    }
  }

  // Get appropriate material for LOD level
  getMaterial(type: string, lodLevel: LODLevel): THREE.Material | null {
    if (lodLevel === LODLevel.CULLED) return null;

    // Try to ensure initialization
    const isInitialized = this.ensureInitialized();
    
    // If not initialized and we can't initialize, create fallback material
    if (!isInitialized) {
      console.warn(`LODManager: Creating fallback material for type: ${type}, LOD: ${lodLevel}`);
      return this.createFallbackMaterial(type, lodLevel);
    }

    const lodMaterial = this.lodMaterials.get(type);
    if (!lodMaterial) {
      console.warn(`No LOD material found for type: ${type}, creating fallback`);
      return this.createFallbackMaterial(type, lodLevel);
    }

    switch (lodLevel) {
      case LODLevel.HIGH:
        return lodMaterial.high;
      case LODLevel.MEDIUM:
        return lodMaterial.medium;
      case LODLevel.LOW:
        return lodMaterial.low;
      default:
        console.warn(`Invalid LOD level: ${lodLevel}`);
        return null;
    }
  }

  // Create fallback geometry when initialization fails
  private createFallbackGeometry(type: string, lodLevel: LODLevel): THREE.BufferGeometry {
    try {
      switch (type) {
        case 'ground':
          const segments = lodLevel === LODLevel.HIGH ? 16 : lodLevel === LODLevel.MEDIUM ? 8 : 4;
          return new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, segments, segments);
        case 'tree':
          const detail = lodLevel === LODLevel.HIGH ? 8 : lodLevel === LODLevel.MEDIUM ? 6 : 4;
          return new THREE.SphereGeometry(3, detail, detail);
        case 'tree-trunk':
          return new THREE.BoxGeometry(1, lodLevel === LODLevel.HIGH ? 8 : 6, 1);
        case 'rock':
          const size = lodLevel === LODLevel.HIGH ? 2 : lodLevel === LODLevel.MEDIUM ? 1.8 : 1.5;
          return new THREE.BoxGeometry(size, size * 0.75, size);
        case 'shop':
          const shopSize = lodLevel === LODLevel.HIGH ? 6 : lodLevel === LODLevel.MEDIUM ? 5 : 4;
          return new THREE.BoxGeometry(shopSize, shopSize * 0.67, shopSize);
        default:
          // Generic fallback
          return new THREE.BoxGeometry(1, 1, 1);
      }
    } catch (error) {
      console.error('Failed to create fallback geometry:', error);
      // Ultimate fallback - simplest possible geometry
      return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  // Create fallback material when initialization fails
  private createFallbackMaterial(type: string, lodLevel: LODLevel): THREE.Material {
    try {
      let color = '#FFFFFF';
      
      switch (type) {
        case 'ground':
        case 'ground-forest':
        case 'ground-clearing':
        case 'ground-dense_forest':
        case 'ground-rocky':
          color = '#228B22';
          break;
        case 'tree':
        case 'tree-foliage':
          color = '#228B22';
          break;
        case 'tree-trunk':
          color = '#8B4513';
          break;
        case 'rock':
          color = '#696969';
          break;
        case 'shop':
          color = '#8B4513';
          break;
      }

      // Use simpler materials for fallback to ensure compatibility
      switch (lodLevel) {
        case LODLevel.HIGH:
          return new THREE.MeshLambertMaterial({ color });
        case LODLevel.MEDIUM:
        case LODLevel.LOW:
        default:
          return new THREE.MeshBasicMaterial({ color });
      }
    } catch (error) {
      console.error('Failed to create fallback material:', error);
      // Ultimate fallback - simplest possible material
      return new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    }
  }

  // Create LOD-appropriate tree
  createTree(lodLevel: LODLevel): THREE.Object3D | null {
    if (lodLevel === LODLevel.CULLED) return null;

    const group = new THREE.Group();

    // For low LOD, just create a simple shape
    if (lodLevel === LODLevel.LOW) {
      const treeGeometry = this.getGeometry('tree', lodLevel);
      const treeMaterial = this.getMaterial('tree-foliage', lodLevel);
      
      if (!treeGeometry || !treeMaterial) {
        console.warn('Failed to get geometry or material for low LOD tree');
        return null;
      }
      
      const simplifiedTree = new THREE.Mesh(treeGeometry, treeMaterial);
      simplifiedTree.position.set(0, 6, 0); // Centered height
      simplifiedTree.scale.set(1, 1.5, 1); // Slightly taller to represent tree
      group.add(simplifiedTree);
      return group;
    }

    // For medium and high LOD, create trunk + foliage
    const trunkGeometry = this.getGeometry('tree-trunk', lodLevel);
    const trunkMaterial = this.getMaterial('tree-trunk', lodLevel);
    
    if (!trunkGeometry || !trunkMaterial) {
      console.warn('Failed to get geometry or material for tree trunk');
      return null;
    }
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, lodLevel === LODLevel.HIGH ? 4 : 3, 0);
    group.add(trunk);

    const foliageGeometry = this.getGeometry('tree', lodLevel);
    const foliageMaterial = this.getMaterial('tree-foliage', lodLevel);
    
    if (!foliageGeometry || !foliageMaterial) {
      console.warn('Failed to get geometry or material for tree foliage');
      return null;
    }
    
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(0, lodLevel === LODLevel.HIGH ? 10 : 8, 0);
    group.add(foliage);

    return group;
  }

  // Create LOD-appropriate rock
  createRock(lodLevel: LODLevel): THREE.Object3D | null {
    if (lodLevel === LODLevel.CULLED) return null;

    const group = new THREE.Group();

    const rockGeometry = this.getGeometry('rock', lodLevel);
    const rockMaterial = this.getMaterial('rock', lodLevel);
    
    if (!rockGeometry || !rockMaterial) {
      console.warn('Failed to get geometry or material for rock');
      return null;
    }

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(0, 0.75, 0);
    group.add(rock);

    // Only add detail rock for high LOD
    if (lodLevel === LODLevel.HIGH) {
      const detailRockMaterial = this.getMaterial('rock', lodLevel);
      
      if (!detailRockMaterial) {
        console.warn('Failed to get material for detail rock');
        return group; // Return the main rock even if detail rock fails
      }
      
      const detailRock = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.8, 1.2),
        detailRockMaterial
      );
      detailRock.position.set(0.4, 0.4, 0.4);
      group.add(detailRock);
    }

    return group;
  }

  // Create LOD-appropriate shop
  createShop(lodLevel: LODLevel): THREE.Object3D | null {
    if (lodLevel === LODLevel.CULLED) return null;

    const group = new THREE.Group();

    // Main building
    const shopGeometry = this.getGeometry('shop', lodLevel);
    const shopMaterial = this.getMaterial('shop', lodLevel);
    
    if (!shopGeometry || !shopMaterial) {
      console.warn('Failed to get geometry or material for shop');
      return null;
    }
    
    const building = new THREE.Mesh(shopGeometry, shopMaterial);
    building.position.set(0, lodLevel === LODLevel.HIGH ? 2 : 1.5, 0);
    group.add(building);

    // Only add details for medium and high LOD
    if (lodLevel >= LODLevel.MEDIUM) {
      // Roof
      const roofMaterial = this.getMaterial('shop', lodLevel);
      
      if (!roofMaterial) {
        console.warn('Failed to get material for shop roof');
        return group; // Return the main building even if roof fails
      }
      
      const roofSize = lodLevel === LODLevel.HIGH ? 7 : 5;
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(roofSize, 1, roofSize),
        roofMaterial
      );
      roof.position.set(0, lodLevel === LODLevel.HIGH ? 4.5 : 3.5, 0);
      group.add(roof);
    }

    // Only add door and sign for high LOD
    if (lodLevel === LODLevel.HIGH) {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 3, 0.2),
        new THREE.MeshStandardMaterial({ color: '#4A4A4A' })
      );
      door.position.set(0, 1.5, 3.1);
      group.add(door);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1, 0.2),
        new THREE.MeshStandardMaterial({ color: '#FFFFFF' })
      );
      sign.position.set(0, 3.5, 3.1);
      group.add(sign);
    }

    return group;
  }

  // Create LOD-appropriate ground plane
  createGroundPlane(biome: string, lodLevel: LODLevel): THREE.Object3D {
    if (lodLevel === LODLevel.CULLED) {
      // Even for culled, return a basic plane to prevent null issues
      const geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
      const material = new THREE.MeshBasicMaterial({ color: '#228B22', transparent: true, opacity: 0.1 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.name = `culled-ground-${biome}`;
      return mesh;
    }

    // Get geometry with fallback
    let geometry = this.getGeometry('ground', lodLevel);
    if (!geometry) {
      console.warn('Failed to get ground geometry for LOD level:', lodLevel, 'creating fallback geometry');
      // Create emergency fallback geometry
      geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 4, 4);
    }

    // Try to get biome-specific material first
    const materialKey = `ground-${biome}`;
    let material = this.getMaterial(materialKey, lodLevel);
    
    // If biome-specific material not found, try fallbacks
    if (!material) {
      console.warn(`Material not found for biome: ${biome}, trying fallbacks...`);
      
      // Try common fallback materials
      const fallbacks = ['ground-forest', 'ground-clearing', 'ground-dense_forest', 'ground-rocky'];
      for (const fallback of fallbacks) {
        material = this.getMaterial(fallback, lodLevel);
        if (material) {
          console.log(`Using fallback material: ${fallback} for biome: ${biome}`);
          break;
        }
      }
    }
    
    // If still no material, create a guaranteed working one based on LOD level
    if (!material) {
      console.warn(`No material found for biome: ${biome}, creating emergency fallback material for LOD level:`, lodLevel);
      
      // Create appropriate material type for the LOD level
      switch (lodLevel) {
        case LODLevel.HIGH:
          material = new THREE.MeshStandardMaterial({ 
            color: '#228B22', 
            roughness: 0.8 
          });
          break;
        case LODLevel.MEDIUM:
          material = new THREE.MeshLambertMaterial({ 
            color: '#228B22' 
          });
          break;
        case LODLevel.LOW:
        default:
          material = new THREE.MeshBasicMaterial({ 
            color: '#228B22' 
          });
          break;
      }
    }

    // Create the mesh - this should never fail now
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    
    // Add a name for debugging
    mesh.name = `ground-${biome}-${LODLevel[lodLevel]}`;
    
    return mesh;
  }

  // Get maximum render distance for culling
  getMaxRenderDistance(): number {
    return this.lodDistances[2]; // Distance at which objects are culled
  }

  // Get LOD distance thresholds
  getLODDistances(): number[] {
    return [...this.lodDistances];
  }

  // Update LOD distances (for dynamic quality adjustment)
  setLODDistances(distances: number[]): void {
    if (distances.length === 3) {
      this.lodDistances = [...distances];
    }
  }

  // Get statistics about LOD usage
  getLODStats(chunks: { coord: ChunkCoord; lodLevel: LODLevel }[]): {
    high: number;
    medium: number;
    low: number;
    culled: number;
  } {
    const stats = { high: 0, medium: 0, low: 0, culled: 0 };
    
    for (const chunk of chunks) {
      switch (chunk.lodLevel) {
        case LODLevel.HIGH:
          stats.high++;
          break;
        case LODLevel.MEDIUM:
          stats.medium++;
          break;
        case LODLevel.LOW:
          stats.low++;
          break;
        case LODLevel.CULLED:
          stats.culled++;
          break;
      }
    }
    
    return stats;
  }

  // Dispose of all LOD resources
  dispose(): void {
    // Dispose geometries
    for (const lodGeometry of this.lodGeometries.values()) {
      lodGeometry.high.dispose();
      lodGeometry.medium.dispose();
      lodGeometry.low.dispose();
    }

    // Dispose materials
    for (const lodMaterial of this.lodMaterials.values()) {
      lodMaterial.high.dispose();
      lodMaterial.medium.dispose();
      lodMaterial.low.dispose();
    }

    this.lodGeometries.clear();
    this.lodMaterials.clear();
  }
}
