import * as THREE from 'three';

// Object pool for reusing Three.js objects to reduce memory allocation
export interface PoolableObject {
  mesh: THREE.Object3D;
  inUse: boolean;
  type: string;
  lastUsed: number;
}

export class ObjectPool {
  private pools: Map<string, PoolableObject[]> = new Map();
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private maxPoolSize: number;
  private cleanupInterval: number;
  private lastCleanup: number = 0;

  constructor(maxPoolSize: number = 100, cleanupInterval: number = 30000) {
    this.maxPoolSize = maxPoolSize;
    this.cleanupInterval = cleanupInterval;
    this.initializeGeometries();
    this.initializeMaterials();
  }

  private initializeGeometries() {
    // Tree geometries
    this.geometries.set('tree-trunk', new THREE.BoxGeometry(1, 8, 1));
    this.geometries.set('tree-foliage', new THREE.SphereGeometry(3, 8, 6));
    
    // Rock geometries
    this.geometries.set('rock-main', new THREE.BoxGeometry(2, 1.5, 2));
    this.geometries.set('rock-detail', new THREE.BoxGeometry(1.5, 1, 1.5));
    
    // Shop geometries
    this.geometries.set('shop-building', new THREE.BoxGeometry(6, 4, 6));
    this.geometries.set('shop-roof', new THREE.BoxGeometry(7, 1, 7));
    this.geometries.set('shop-door', new THREE.BoxGeometry(1.5, 3, 0.2));
    this.geometries.set('shop-sign', new THREE.BoxGeometry(3, 1, 0.2));
    
    // Ground plane
    this.geometries.set('ground-plane', new THREE.PlaneGeometry(50, 50));
    
    // Waterfall geometries
    this.geometries.set('waterfall-stream', new THREE.BoxGeometry(0.5, 20, 0.5));
    this.geometries.set('waterfall-pool', new THREE.SphereGeometry(3, 8, 8));
  }

  private initializeMaterials() {
    // Tree materials
    this.materials.set('tree-trunk', new THREE.MeshStandardMaterial({ 
      color: '#8B4513', 
      roughness: 0.9 
    }));
    this.materials.set('tree-foliage', new THREE.MeshStandardMaterial({ 
      color: '#228B22', 
      roughness: 0.8 
    }));
    
    // Rock materials
    this.materials.set('rock-main', new THREE.MeshStandardMaterial({ 
      color: '#696969', 
      roughness: 0.9 
    }));
    this.materials.set('rock-detail', new THREE.MeshStandardMaterial({ 
      color: '#808080', 
      roughness: 0.9 
    }));
    
    // Shop materials
    this.materials.set('shop-building', new THREE.MeshStandardMaterial({ 
      color: '#8B4513', 
      roughness: 0.8 
    }));
    this.materials.set('shop-roof', new THREE.MeshStandardMaterial({ 
      color: '#654321', 
      roughness: 0.9 
    }));
    this.materials.set('shop-door', new THREE.MeshStandardMaterial({ 
      color: '#4A4A4A', 
      roughness: 0.8 
    }));
    this.materials.set('shop-sign', new THREE.MeshStandardMaterial({ 
      color: '#FFFFFF' 
    }));
    
    // Biome ground materials
    this.materials.set('ground-clearing', new THREE.MeshStandardMaterial({ 
      color: '#90EE90', 
      roughness: 0.8 
    }));
    this.materials.set('ground-forest', new THREE.MeshStandardMaterial({ 
      color: '#228B22', 
      roughness: 0.8 
    }));
    this.materials.set('ground-dense-forest', new THREE.MeshStandardMaterial({ 
      color: '#006400', 
      roughness: 0.8 
    }));
    this.materials.set('ground-rocky', new THREE.MeshStandardMaterial({ 
      color: '#A0A0A0', 
      roughness: 0.8 
    }));
    
    // Waterfall materials
    this.materials.set('waterfall-stream', new THREE.MeshBasicMaterial({ 
      color: '#87CEEB', 
      transparent: true, 
      opacity: 0.6 
    }));
    this.materials.set('waterfall-pool', new THREE.MeshBasicMaterial({ 
      color: '#4682B4', 
      transparent: true, 
      opacity: 0.7 
    }));
  }

  // Get an object from the pool or create a new one
  getObject(type: string): THREE.Object3D {
    const now = Date.now();
    
    // Clean up old unused objects periodically
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup();
      this.lastCleanup = now;
    }

    let pool = this.pools.get(type);
    if (!pool) {
      pool = [];
      this.pools.set(type, pool);
    }

    // Find an unused object in the pool
    for (const poolObj of pool) {
      if (!poolObj.inUse) {
        poolObj.inUse = true;
        poolObj.lastUsed = now;
        return poolObj.mesh;
      }
    }

    // Create new object if pool is empty or all objects are in use
    if (pool.length < this.maxPoolSize) {
      const mesh = this.createObject(type);
      const poolObj: PoolableObject = {
        mesh,
        inUse: true,
        type,
        lastUsed: now
      };
      pool.push(poolObj);
      return mesh;
    }

    // Pool is full, create a temporary object (not pooled)
    console.warn(`Object pool for type '${type}' is full, creating temporary object`);
    return this.createObject(type);
  }

  // Return an object to the pool
  returnObject(mesh: THREE.Object3D, type: string): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    const poolObj = pool.find(obj => obj.mesh === mesh);
    if (poolObj) {
      poolObj.inUse = false;
      poolObj.lastUsed = Date.now();
      
      // Reset object state
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.visible = true;
      
      // Remove from parent if attached
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    }
  }

  // Create a new object of the specified type
  private createObject(type: string): THREE.Object3D {
    const group = new THREE.Group();
    
    switch (type) {
      case 'tree':
        return this.createTree();
      case 'rock':
        return this.createRock();
      case 'shop':
        return this.createShop();
      case 'ground-plane':
        return this.createGroundPlane();
      case 'waterfall':
        return this.createWaterfall();
      default:
        console.warn(`Unknown object type: ${type}`);
        return group;
    }
  }

  private createTree(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Tree trunk
    const trunk = new THREE.Mesh(
      this.geometries.get('tree-trunk')!,
      this.materials.get('tree-trunk')!
    );
    trunk.position.set(0, 4, 0);
    group.add(trunk);
    
    // Tree foliage
    const foliage = new THREE.Mesh(
      this.geometries.get('tree-foliage')!,
      this.materials.get('tree-foliage')!
    );
    foliage.position.set(0, 10, 0);
    group.add(foliage);
    
    return group;
  }

  private createRock(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Main rock
    const mainRock = new THREE.Mesh(
      this.geometries.get('rock-main')!,
      this.materials.get('rock-main')!
    );
    mainRock.position.set(0, 0.75, 0);
    group.add(mainRock);
    
    // Detail rock
    const detailRock = new THREE.Mesh(
      this.geometries.get('rock-detail')!,
      this.materials.get('rock-detail')!
    );
    detailRock.position.set(0.5, 0.5, 0.5);
    group.add(detailRock);
    
    return group;
  }

  private createShop(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Building
    const building = new THREE.Mesh(
      this.geometries.get('shop-building')!,
      this.materials.get('shop-building')!
    );
    building.position.set(0, 2, 0);
    group.add(building);
    
    // Roof
    const roof = new THREE.Mesh(
      this.geometries.get('shop-roof')!,
      this.materials.get('shop-roof')!
    );
    roof.position.set(0, 4.5, 0);
    group.add(roof);
    
    // Door
    const door = new THREE.Mesh(
      this.geometries.get('shop-door')!,
      this.materials.get('shop-door')!
    );
    door.position.set(0, 1.5, 3.1);
    group.add(door);
    
    // Sign
    const sign = new THREE.Mesh(
      this.geometries.get('shop-sign')!,
      this.materials.get('shop-sign')!
    );
    sign.position.set(0, 3.5, 3.1);
    group.add(sign);
    
    return group;
  }

  private createGroundPlane(): THREE.Object3D {
    const mesh = new THREE.Mesh(
      this.geometries.get('ground-plane')!,
      this.materials.get('ground-forest')! // Default material, will be changed based on biome
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private createWaterfall(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Water stream
    const stream = new THREE.Mesh(
      this.geometries.get('waterfall-stream')!,
      this.materials.get('waterfall-stream')!
    );
    stream.position.set(0, 0, 0);
    group.add(stream);
    
    // Water pool
    const pool = new THREE.Mesh(
      this.geometries.get('waterfall-pool')!,
      this.materials.get('waterfall-pool')!
    );
    pool.position.set(0, -8, 0);
    group.add(pool);
    
    return group;
  }

  // Get material for biome
  getBiomeMaterial(biome: string): THREE.Material {
    const materialKey = `ground-${biome}`;
    return this.materials.get(materialKey) || this.materials.get('ground-forest')!;
  }

  // Clean up old unused objects
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [, pool] of this.pools) {
      const toRemove: number[] = [];
      
      for (let i = 0; i < pool.length; i++) {
        const obj = pool[i];
        if (!obj.inUse && (now - obj.lastUsed) > maxAge) {
          // Dispose of geometry and material if they're not shared
          this.disposeObject(obj.mesh);
          toRemove.push(i);
        }
      }
      
      // Remove old objects from pool (in reverse order to maintain indices)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        pool.splice(toRemove[i], 1);
      }
    }
  }

  // Dispose of an object's resources
  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Don't dispose shared geometries and materials
        // They're managed by the pool
      }
    });
  }

  // Get pool statistics for debugging
  getStats(): { [key: string]: { total: number; inUse: number; available: number } } {
    const stats: { [key: string]: { total: number; inUse: number; available: number } } = {};
    
    for (const [type, pool] of this.pools) {
      const inUse = pool.filter(obj => obj.inUse).length;
      stats[type] = {
        total: pool.length,
        inUse,
        available: pool.length - inUse
      };
    }
    
    return stats;
  }

  // Dispose of all resources
  dispose(): void {
    // Dispose all geometries
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }
    
    // Dispose all materials
    for (const material of this.materials.values()) {
      material.dispose();
    }
    
    // Clear pools
    this.pools.clear();
    this.geometries.clear();
    this.materials.clear();
  }
}
