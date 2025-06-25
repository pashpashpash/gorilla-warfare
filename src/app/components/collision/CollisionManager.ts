import { TerrainFeature } from '../terrain/TerrainGenerator';

// Collision bounds for different object types
export interface CollisionBounds {
  id: string;
  type: 'tree' | 'rock' | 'shop' | 'waterfall';
  position: [number, number, number];
  radius: number; // For circular collision
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
  }; // For box collision
  height: number;
}

// Spatial grid cell for efficient collision queries
interface SpatialCell {
  objects: CollisionBounds[];
}

// Collision query result
export interface CollisionResult {
  hit: boolean;
  object?: CollisionBounds;
  distance?: number;
  normal?: [number, number, number]; // Surface normal for sliding collision
}

export class CollisionManager {
  private spatialGrid: Map<string, SpatialCell>;
  private cellSize: number;
  private allObjects: Map<string, CollisionBounds>;

  constructor(cellSize: number = 8) {
    this.spatialGrid = new Map();
    this.cellSize = cellSize;
    this.allObjects = new Map();
  }

  // Convert world position to grid cell coordinates
  private worldToGrid(x: number, z: number): [number, number] {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(z / this.cellSize)
    ];
  }

  // Generate grid cell key
  private gridKey(gridX: number, gridZ: number): string {
    return `${gridX},${gridZ}`;
  }

  // Get or create spatial cell
  private getCell(gridX: number, gridZ: number): SpatialCell {
    const key = this.gridKey(gridX, gridZ);
    let cell = this.spatialGrid.get(key);
    if (!cell) {
      cell = { objects: [] };
      this.spatialGrid.set(key, cell);
    }
    return cell;
  }

  // Add collision object from terrain feature
  addTerrainFeature(feature: TerrainFeature, scale: number = 1): void {
    const bounds = this.createCollisionBounds(feature, scale);
    this.addCollisionObject(bounds);
  }

  // Create collision bounds from terrain feature
  private createCollisionBounds(feature: TerrainFeature, scale: number): CollisionBounds {
    let radius: number;
    let height: number;

    switch (feature.type) {
      case 'tree':
        radius = 0.8 * scale; // Tree trunk radius
        height = 8 * scale;
        break;
      case 'rock':
        radius = 1.2 * scale; // Rock radius
        height = 2 * scale;
        break;
      case 'shop':
        radius = 4; // Shop building radius
        height = 5;
        break;
      case 'waterfall':
        radius = 2; // Waterfall area radius
        height = 15;
        break;
      default:
        radius = 1;
        height = 2;
    }

    return {
      id: feature.id,
      type: feature.type,
      position: [...feature.position],
      radius,
      height
    };
  }

  // Add collision object to spatial grid
  addCollisionObject(bounds: CollisionBounds): void {
    // Remove existing object if it exists
    this.removeCollisionObject(bounds.id);

    // Store in main collection
    this.allObjects.set(bounds.id, bounds);

    // Add to spatial grid cells that this object overlaps
    const [minGridX, minGridZ] = this.worldToGrid(
      bounds.position[0] - bounds.radius,
      bounds.position[2] - bounds.radius
    );
    const [maxGridX, maxGridZ] = this.worldToGrid(
      bounds.position[0] + bounds.radius,
      bounds.position[2] + bounds.radius
    );

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
        const cell = this.getCell(gridX, gridZ);
        cell.objects.push(bounds);
      }
    }
  }

  // Remove collision object
  removeCollisionObject(id: string): void {
    const bounds = this.allObjects.get(id);
    if (!bounds) return;

    // Remove from main collection
    this.allObjects.delete(id);

    // Remove from spatial grid
    const [minGridX, minGridZ] = this.worldToGrid(
      bounds.position[0] - bounds.radius,
      bounds.position[2] - bounds.radius
    );
    const [maxGridX, maxGridZ] = this.worldToGrid(
      bounds.position[0] + bounds.radius,
      bounds.position[2] + bounds.radius
    );

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
        const key = this.gridKey(gridX, gridZ);
        const cell = this.spatialGrid.get(key);
        if (cell) {
          cell.objects = cell.objects.filter(obj => obj.id !== id);
          // Clean up empty cells
          if (cell.objects.length === 0) {
            this.spatialGrid.delete(key);
          }
        }
      }
    }
  }

  // Check point collision
  checkPointCollision(x: number, y: number, z: number, excludeTypes?: string[]): CollisionResult {
    const [gridX, gridZ] = this.worldToGrid(x, z);
    const cell = this.spatialGrid.get(this.gridKey(gridX, gridZ));
    
    if (!cell) {
      return { hit: false };
    }

    for (const obj of cell.objects) {
      // Skip excluded types
      if (excludeTypes && excludeTypes.includes(obj.type)) {
        continue;
      }

      // Check if point is within object bounds
      const dx = x - obj.position[0];
      const dz = z - obj.position[2];
      const dy = y - obj.position[1];
      const distance2D = Math.sqrt(dx * dx + dz * dz);

      if (distance2D <= obj.radius && dy >= 0 && dy <= obj.height) {
        // Calculate surface normal for sliding collision
        const normal: [number, number, number] = [
          dx / distance2D || 0,
          0,
          dz / distance2D || 0
        ];

        return {
          hit: true,
          object: obj,
          distance: distance2D,
          normal
        };
      }
    }

    return { hit: false };
  }

  // Check swept collision (moving from point A to point B)
  checkSweptCollision(
    fromX: number, fromZ: number,
    toX: number, toZ: number,
    radius: number = 0.5,
    excludeTypes?: string[]
  ): CollisionResult {
    // Simple swept collision using multiple point samples
    const steps = Math.max(3, Math.ceil(Math.sqrt((toX - fromX) ** 2 + (toZ - fromZ) ** 2) / this.cellSize));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = fromX + (toX - fromX) * t;
      const z = fromZ + (toZ - fromZ) * t;
      
      // Check collision at this point with radius
      const result = this.checkCircleCollision(x, z, radius, excludeTypes);
      if (result.hit) {
        return result;
      }
    }

    return { hit: false };
  }

  // Check circular collision (for entities with radius)
  checkCircleCollision(x: number, z: number, radius: number, excludeTypes?: string[]): CollisionResult {
    // Check multiple grid cells that the circle might overlap
    const [minGridX, minGridZ] = this.worldToGrid(x - radius, z - radius);
    const [maxGridX, maxGridZ] = this.worldToGrid(x + radius, z + radius);

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
        const cell = this.spatialGrid.get(this.gridKey(gridX, gridZ));
        if (!cell) continue;

        for (const obj of cell.objects) {
          // Skip excluded types
          if (excludeTypes && excludeTypes.includes(obj.type)) {
            continue;
          }

          // Check circle-to-circle collision
          const dx = x - obj.position[0];
          const dz = z - obj.position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          const minDistance = radius + obj.radius;

          if (distance < minDistance) {
            // Calculate surface normal
            const normal: [number, number, number] = [
              dx / distance || 0,
              0,
              dz / distance || 0
            ];

            return {
              hit: true,
              object: obj,
              distance,
              normal
            };
          }
        }
      }
    }

    return { hit: false };
  }

  // Get all objects in a radius (for pathfinding)
  getObjectsInRadius(x: number, z: number, radius: number): CollisionBounds[] {
    const objects: CollisionBounds[] = [];
    const [minGridX, minGridZ] = this.worldToGrid(x - radius, z - radius);
    const [maxGridX, maxGridZ] = this.worldToGrid(x + radius, z + radius);

    const seen = new Set<string>();

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
        const cell = this.spatialGrid.get(this.gridKey(gridX, gridZ));
        if (!cell) continue;

        for (const obj of cell.objects) {
          if (seen.has(obj.id)) continue;
          seen.add(obj.id);

          const dx = x - obj.position[0];
          const dz = z - obj.position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);

          if (distance <= radius + obj.radius) {
            objects.push(obj);
          }
        }
      }
    }

    return objects;
  }

  // Clear all collision objects (for chunk unloading)
  clearAll(): void {
    this.spatialGrid.clear();
    this.allObjects.clear();
  }

  // Clear objects in a specific area (for chunk unloading)
  clearArea(minX: number, minZ: number, maxX: number, maxZ: number): void {
    const objectsToRemove: string[] = [];

    for (const [id, obj] of this.allObjects) {
      if (obj.position[0] >= minX && obj.position[0] <= maxX &&
          obj.position[2] >= minZ && obj.position[2] <= maxZ) {
        objectsToRemove.push(id);
      }
    }

    for (const id of objectsToRemove) {
      this.removeCollisionObject(id);
    }
  }

  // Get statistics for debugging
  getStats(): {
    totalObjects: number;
    gridCells: number;
    averageObjectsPerCell: number;
  } {
    const totalObjects = this.allObjects.size;
    const gridCells = this.spatialGrid.size;
    const totalCellObjects = Array.from(this.spatialGrid.values())
      .reduce((sum, cell) => sum + cell.objects.length, 0);

    return {
      totalObjects,
      gridCells,
      averageObjectsPerCell: gridCells > 0 ? totalCellObjects / gridCells : 0
    };
  }
}
