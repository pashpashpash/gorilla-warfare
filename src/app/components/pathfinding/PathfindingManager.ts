import { CollisionManager } from '../collision/CollisionManager';

// Pathfinding node for A* algorithm
interface PathNode {
  x: number;
  z: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent?: PathNode;
  walkable: boolean;
}

// Path result
export interface PathResult {
  found: boolean;
  path: [number, number][]; // Array of [x, z] coordinates
  length: number;
  cost: number;
}

// Pathfinding request
export interface PathRequest {
  id: string;
  startX: number;
  startZ: number;
  goalX: number;
  goalZ: number;
  entityRadius: number;
  maxDistance?: number;
  allowPartialPath?: boolean;
  entityType?: 'ground' | 'flying' | 'climbing';
}

export class PathfindingManager {
  private collisionManager: CollisionManager;
  private nodeSize: number;
  private maxSearchNodes: number;
  private pathCache: Map<string, { path: PathResult; timestamp: number }>;
  private cacheTimeout: number;

  constructor(
    collisionManager: CollisionManager,
    nodeSize: number = 1,
    maxSearchNodes: number = 1000,
    cacheTimeout: number = 5000
  ) {
    this.collisionManager = collisionManager;
    this.nodeSize = nodeSize;
    this.maxSearchNodes = maxSearchNodes;
    this.pathCache = new Map();
    this.cacheTimeout = cacheTimeout;
  }

  // Find path using A* algorithm
  findPath(request: PathRequest): PathResult {
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.pathCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.path;
    }

    const result = this.aStar(request);
    
    // Cache the result
    this.pathCache.set(cacheKey, {
      path: result,
      timestamp: Date.now()
    });

    return result;
  }

  // Generate cache key for path request
  private getCacheKey(request: PathRequest): string {
    const { startX, startZ, goalX, goalZ, entityRadius, entityType } = request;
    return `${Math.floor(startX)},${Math.floor(startZ)}-${Math.floor(goalX)},${Math.floor(goalZ)}-${entityRadius}-${entityType}`;
  }

  // A* pathfinding implementation
  private aStar(request: PathRequest): PathResult {
    const {
      startX, startZ, goalX, goalZ,
      entityRadius, maxDistance = 100,
      allowPartialPath = true, entityType = 'ground'
    } = request;

    // Convert world coordinates to grid coordinates
    const startNode = this.worldToNode(startX, startZ);
    const goalNode = this.worldToNode(goalX, goalZ);

    // Check if goal is reachable
    if (!this.isNodeWalkable(goalNode.x, goalNode.z, entityRadius, entityType)) {
      if (!allowPartialPath) {
        return { found: false, path: [], length: 0, cost: 0 };
      }
      // Find nearest walkable node to goal
      const nearestGoal = this.findNearestWalkableNode(goalNode.x, goalNode.z, entityRadius, entityType);
      if (nearestGoal) {
        goalNode.x = nearestGoal.x;
        goalNode.z = nearestGoal.z;
      } else {
        return { found: false, path: [], length: 0, cost: 0 };
      }
    }

    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();
    const allNodes = new Map<string, PathNode>();

    // Initialize start node
    const start: PathNode = {
      x: startNode.x,
      z: startNode.z,
      g: 0,
      h: this.heuristic(startNode.x, startNode.z, goalNode.x, goalNode.z),
      f: 0,
      walkable: true
    };
    start.f = start.g + start.h;

    openSet.push(start);
    allNodes.set(this.nodeKey(start.x, start.z), start);

    let searchedNodes = 0;
    let bestNode = start;

    while (openSet.length > 0 && searchedNodes < this.maxSearchNodes) {
      searchedNodes++;

      // Find node with lowest f cost
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if we reached the goal
      if (current.x === goalNode.x && current.z === goalNode.z) {
        return this.reconstructPath(current);
      }

      // Track best node for partial paths
      if (current.h < bestNode.h) {
        bestNode = current;
      }

      closedSet.add(this.nodeKey(current.x, current.z));

      // Check neighbors
      const neighbors = this.getNeighbors(current.x, current.z);
      for (const neighbor of neighbors) {
        const neighborKey = this.nodeKey(neighbor.x, neighbor.z);
        
        if (closedSet.has(neighborKey)) continue;

        // Check if neighbor is walkable
        if (!this.isNodeWalkable(neighbor.x, neighbor.z, entityRadius, entityType)) {
          continue;
        }

        // Check distance limit
        const distanceFromStart = this.heuristic(startNode.x, startNode.z, neighbor.x, neighbor.z);
        if (distanceFromStart > maxDistance) continue;

        const moveCost = this.getMoveCost(current, neighbor, entityType);
        const tentativeG = current.g + moveCost;

        let neighborNode = allNodes.get(neighborKey);
        if (!neighborNode) {
          neighborNode = {
            x: neighbor.x,
            z: neighbor.z,
            g: Infinity,
            h: this.heuristic(neighbor.x, neighbor.z, goalNode.x, goalNode.z),
            f: 0,
            walkable: true
          };
          allNodes.set(neighborKey, neighborNode);
        }

        if (tentativeG < neighborNode.g) {
          neighborNode.parent = current;
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;

          if (!openSet.includes(neighborNode)) {
            openSet.push(neighborNode);
          }
        }
      }
    }

    // No path found, return partial path if allowed
    if (allowPartialPath && bestNode !== start) {
      return this.reconstructPath(bestNode);
    }

    return { found: false, path: [], length: 0, cost: 0 };
  }

  // Convert world coordinates to node coordinates
  private worldToNode(x: number, z: number): { x: number; z: number } {
    return {
      x: Math.floor(x / this.nodeSize),
      z: Math.floor(z / this.nodeSize)
    };
  }

  // Convert node coordinates to world coordinates
  private nodeToWorld(nodeX: number, nodeZ: number): { x: number; z: number } {
    return {
      x: nodeX * this.nodeSize + this.nodeSize / 2,
      z: nodeZ * this.nodeSize + this.nodeSize / 2
    };
  }

  // Generate node key for maps
  private nodeKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  // Calculate heuristic distance (Manhattan distance)
  private heuristic(x1: number, z1: number, x2: number, z2: number): number {
    return Math.abs(x1 - x2) + Math.abs(z1 - z2);
  }

  // Get neighboring nodes
  private getNeighbors(x: number, z: number): { x: number; z: number }[] {
    return [
      { x: x - 1, z: z },     // Left
      { x: x + 1, z: z },     // Right
      { x: x, z: z - 1 },     // Up
      { x: x, z: z + 1 },     // Down
      { x: x - 1, z: z - 1 }, // Top-left
      { x: x + 1, z: z - 1 }, // Top-right
      { x: x - 1, z: z + 1 }, // Bottom-left
      { x: x + 1, z: z + 1 }  // Bottom-right
    ];
  }

  // Calculate movement cost between nodes
  private getMoveCost(from: PathNode, to: { x: number; z: number }, entityType: string): number {
    const dx = Math.abs(to.x - from.x);
    const dz = Math.abs(to.z - from.z);
    
    // Diagonal movement costs more
    const isDiagonal = dx === 1 && dz === 1;
    const baseCost = isDiagonal ? 1.414 : 1.0;

    // Different entity types have different movement preferences
    switch (entityType) {
      case 'flying':
        return baseCost; // Flying entities have consistent movement cost
      case 'climbing':
        return baseCost * 0.8; // Climbing entities can move more efficiently
      default:
        return baseCost;
    }
  }

  // Check if a node is walkable
  private isNodeWalkable(
    nodeX: number, nodeZ: number,
    entityRadius: number,
    entityType: string
  ): boolean {
    const world = this.nodeToWorld(nodeX, nodeZ);
    
    // Flying entities can pass over most obstacles
    if (entityType === 'flying') {
      // Only check for very tall obstacles like waterfalls
      const collision = this.collisionManager.checkCircleCollision(
        world.x, world.z, entityRadius, ['tree', 'rock', 'shop']
      );
      return !collision.hit;
    }

    // Climbing entities can pass over rocks but not trees
    if (entityType === 'climbing') {
      const collision = this.collisionManager.checkCircleCollision(
        world.x, world.z, entityRadius, ['rock']
      );
      return !collision.hit;
    }

    // Ground entities must avoid all obstacles
    const collision = this.collisionManager.checkCircleCollision(
      world.x, world.z, entityRadius
    );
    return !collision.hit;
  }

  // Find nearest walkable node to a target
  private findNearestWalkableNode(
    targetX: number, targetZ: number,
    entityRadius: number,
    entityType: string,
    maxRadius: number = 10
  ): { x: number; z: number } | null {
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
          
          const x = targetX + dx;
          const z = targetZ + dz;
          
          if (this.isNodeWalkable(x, z, entityRadius, entityType)) {
            return { x, z };
          }
        }
      }
    }
    return null;
  }

  // Reconstruct path from goal node
  private reconstructPath(goalNode: PathNode): PathResult {
    const path: [number, number][] = [];
    let current: PathNode | undefined = goalNode;
    const totalCost = goalNode.g;

    while (current) {
      const world = this.nodeToWorld(current.x, current.z);
      path.unshift([world.x, world.z]);
      current = current.parent;
    }

    return {
      found: true,
      path,
      length: path.length,
      cost: totalCost
    };
  }

  // Clear old cache entries
  clearCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.pathCache) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.pathCache.delete(key);
      }
    }
  }

  // Get pathfinding statistics
  getStats(): {
    cacheSize: number;
    nodeSize: number;
    maxSearchNodes: number;
  } {
    return {
      cacheSize: this.pathCache.size,
      nodeSize: this.nodeSize,
      maxSearchNodes: this.maxSearchNodes
    };
  }

  // Smooth path by removing unnecessary waypoints
  smoothPath(path: [number, number][], entityRadius: number): [number, number][] {
    if (path.length <= 2) return path;

    const smoothed: [number, number][] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      let farthest = current + 1;

      // Find the farthest point we can reach directly
      for (let i = current + 2; i < path.length; i++) {
        const collision = this.collisionManager.checkSweptCollision(
          path[current][0], path[current][1],
          path[i][0], path[i][1],
          entityRadius
        );

        if (!collision.hit) {
          farthest = i;
        } else {
          break;
        }
      }

      smoothed.push(path[farthest]);
      current = farthest;
    }

    return smoothed;
  }
}
