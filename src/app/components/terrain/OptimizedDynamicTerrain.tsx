'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ChunkManager } from './ChunkManager';
import { ObjectPool } from './ObjectPool';
import { LODManager, LODLevel } from './LODManager';
import { ChunkCoord, TerrainFeature } from './TerrainGenerator';
import { CollisionManager } from '../collision/CollisionManager';

interface OptimizedDynamicTerrainProps {
  playerPosition: [number, number, number];
  onShopInteract: () => void;
  seed?: number;
  chunkSize?: number;
  renderRadius?: number;
  isInTransition?: boolean;
  collisionManager?: CollisionManager | null;
}

// Memory-efficient chunk component using object pooling and LOD
function OptimizedChunkComponent({ 
  chunkData, 
  playerPosition, 
  onShopInteract,
  chunkManager,
  objectPool,
  lodManager,
  collisionManager
}: { 
  chunkData: {
    coord: ChunkCoord;
    features: TerrainFeature[];
    biome: string;
  };
  playerPosition: [number, number, number];
  onShopInteract: () => void;
  chunkManager: ChunkManager;
  objectPool: ObjectPool;
  lodManager: LODManager;
  collisionManager?: CollisionManager | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const chunkSize = chunkManager.getChunkSize();
  const renderObjectsRef = useRef<{ object: THREE.Object3D; type: string; feature?: TerrainFeature }[]>([]);
  const [showShopPrompt, setShowShopPrompt] = React.useState(false);
  
  // Calculate chunk world position
  const worldX = chunkData.coord.x * chunkSize;
  const worldZ = chunkData.coord.z * chunkSize;
  const chunkCenterX = worldX + chunkSize / 2;
  const chunkCenterZ = worldZ + chunkSize / 2;

  // Calculate LOD level for this chunk
  const chunkLOD = lodManager.calculateLODLevel(playerPosition, chunkData.coord);

  // Check for shop interaction
  useFrame(() => {
    // Check if any shop in this chunk is close enough for interaction
    let hasNearbyShop = false;
    for (const feature of chunkData.features) {
      if (feature.type === 'shop') {
        const dx = playerPosition[0] - feature.position[0];
        const dz = playerPosition[2] - feature.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < 5) {
          hasNearbyShop = true;
          break;
        }
      }
    }
    setShowShopPrompt(hasNearbyShop);
  });

  // Handle shop interaction
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'KeyF' && showShopPrompt) {
        onShopInteract();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShopPrompt, onShopInteract]);

  // Create and manage render objects based on LOD
  useEffect(() => {
    if (!groupRef.current || chunkLOD === LODLevel.CULLED) return;

    // Clear existing objects and remove collision entries if any
    renderObjectsRef.current.forEach(({ object, type, feature }) => {
      if (object.parent) {
        object.parent.remove(object);
      }
      // Return pooled objects where applicable
      objectPool.returnObject(object, type);
      // Remove collision bounds for features previously registered
      if (collisionManager && feature && (feature.type === 'tree' || feature.type === 'rock')) {
        const id = `${feature.type}-${feature.position[0]}-${feature.position[2]}`;
        collisionManager.removeCollisionObject(id);
      }
    });
    renderObjectsRef.current = [];

    // Create ground plane with appropriate LOD - this will never return null now
    const groundPlane = lodManager.createGroundPlane(chunkData.biome, chunkLOD);
    groundPlane.position.set(chunkCenterX, 0, chunkCenterZ);
    groupRef.current.add(groundPlane);
    renderObjectsRef.current.push({ object: groundPlane, type: 'ground-plane' });

    // Create terrain features with LOD
    chunkData.features.forEach((feature) => {
      // Calculate individual object LOD (might be different from chunk LOD)
      const objectLOD = lodManager.calculateObjectLODLevel(playerPosition, feature.position);
      
      if (objectLOD === LODLevel.CULLED) return;

      let terrainObject: THREE.Object3D | null = null;

      switch (feature.type) {
        case 'tree':
          terrainObject = lodManager.createTree(objectLOD);
          break;
        case 'rock':
          terrainObject = lodManager.createRock(objectLOD);
          break;
        case 'shop':
          terrainObject = lodManager.createShop(objectLOD);
          break;
        case 'waterfall':
          // For now, use object pool for waterfall
          terrainObject = objectPool.getObject('waterfall');
          break;
      }

      if (terrainObject && groupRef.current) {
        // Apply feature transformations
        terrainObject.position.set(...feature.position);
        if (feature.scale) {
          terrainObject.scale.setScalar(feature.scale);
        }
        if (feature.rotation) {
          terrainObject.rotation.y = feature.rotation;
        }

        groupRef.current.add(terrainObject);
        renderObjectsRef.current.push({ 
          object: terrainObject, 
          type: feature.type,
          feature 
        });

        // Register collision obstacles for trees and rocks
        if (collisionManager && (feature.type === 'tree' || feature.type === 'rock')) {
          const radius = feature.type === 'tree' ? 0.8 : 1.2; // Use same values as CollisionManager
          const height = feature.type === 'tree' ? 8 : 2;
          collisionManager.addCollisionObject({
            id: `${feature.type}-${feature.position[0]}-${feature.position[2]}`,
            type: feature.type,
            position: [feature.position[0], feature.position[1], feature.position[2]],
            radius: radius,
            height: height
          });
        }
      }
    });

    // Add shop interaction prompt if needed
    if (showShopPrompt && chunkLOD <= LODLevel.MEDIUM) {
      const shopFeature = chunkData.features.find(f => f.type === 'shop');
      if (shopFeature) {
        // Create interaction prompt
        const promptGroup = new THREE.Group();
        
        // Background plane
        const bgGeometry = new THREE.PlaneGeometry(4, 1);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x000000, 
          transparent: true, 
          opacity: 0.7 
        });
        const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
        promptGroup.add(bgPlane);
        
        // Text plane
        const textGeometry = new THREE.PlaneGeometry(3.8, 0.8);
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const textPlane = new THREE.Mesh(textGeometry, textMaterial);
        textPlane.position.z = 0.01;
        promptGroup.add(textPlane);
        
        promptGroup.position.set(
          shopFeature.position[0],
          shopFeature.position[1] + 6,
          shopFeature.position[2]
        );
        
        groupRef.current.add(promptGroup);
        renderObjectsRef.current.push({ 
          object: promptGroup, 
          type: 'shop-prompt' 
        });
      }
    }

    // Store render objects in chunk manager
    const allObjects = renderObjectsRef.current.map(item => item.object);
    chunkManager.setChunkRenderObjects(chunkData.coord, allObjects);

  }, [chunkData, chunkLOD, playerPosition, showShopPrompt, chunkManager, objectPool, lodManager, chunkCenterX, chunkCenterZ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderObjectsRef.current.forEach(({ object, type, feature }) => {
        if (object.parent) {
          object.parent.remove(object);
        }
        // Return objects to pool (except for LOD-created objects which are managed differently)
        if (type === 'waterfall' || type === 'ground-plane' || type === 'shop-prompt') {
          objectPool.returnObject(object, type);
        }
        // Remove collision entries for terrain features
        if (collisionManager && feature && (feature.type === 'tree' || feature.type === 'rock')) {
          const id = `${feature.type}-${feature.position[0]}-${feature.position[2]}`;
          collisionManager.removeCollisionObject(id);
        }
      });
      renderObjectsRef.current = [];
    };
  }, [objectPool, collisionManager]);

  if (chunkLOD === LODLevel.CULLED) {
    return null;
  }

  return <group ref={groupRef} />;
}

export default function OptimizedDynamicTerrain({ 
  playerPosition, 
  onShopInteract, 
  seed = 12345,
  chunkSize = 16,  // Reduced from 50 to 16 for smaller, less obvious chunks
  renderRadius = 4,  // Increased from 2 to 4 to maintain same total coverage
  collisionManager = null
}: OptimizedDynamicTerrainProps) {
  const chunkManager = useMemo(() => 
    new ChunkManager(seed, chunkSize, renderRadius), 
    [seed, chunkSize, renderRadius]
  );
  
  const objectPool = useMemo(() => 
    new ObjectPool(100, 30000), // 100 objects max, cleanup every 30 seconds
    []
  );
  
  const lodManager = useMemo(() => {
    console.log('OptimizedDynamicTerrain: Creating LODManager with chunkSize:', chunkSize);
    const manager = new LODManager(chunkSize);
    console.log('OptimizedDynamicTerrain: LODManager created successfully');
    return manager;
  }, [chunkSize]);
  
  const [loadedChunks, setLoadedChunks] = React.useState<{
    coord: ChunkCoord;
    features: TerrainFeature[];
    biome: string;
  }[]>([]);
  const lastPlayerChunk = useRef<ChunkCoord>({ x: 0, z: 0 });
  const [, setMemoryStats] = React.useState<{ 
    chunks: number; 
    objects: number; 
    poolStats: Record<string, { total: number; inUse: number; available: number }>;
  }>({ 
    chunks: 0, 
    objects: 0, 
    poolStats: {} 
  });

  // Update chunks based on player position
  useFrame(() => {
    const currentChunk = chunkManager.worldToChunk(playerPosition[0], playerPosition[2]);
    
    // Only update if player moved to a different chunk
    if (currentChunk.x !== lastPlayerChunk.current.x || 
        currentChunk.z !== lastPlayerChunk.current.z) {
      
      const { chunksToLoad, chunksToUnload } = chunkManager.updatePlayerPosition(
        playerPosition[0], 
        playerPosition[2]
      );

      // Unload chunks that are no longer needed
      chunksToUnload.forEach(chunkKey => {
        const objectsToRemove = chunkManager.unloadChunk(chunkKey);
        objectsToRemove.forEach(obj => {
          if (obj.parent) {
            obj.parent.remove(obj);
          }
        });
      });

      // Load new chunks
      chunksToLoad.forEach(coord => {
        chunkManager.getChunk(coord);
      });

      // Update loaded chunks for rendering
      const newLoadedChunks = chunkManager.getLoadedChunksInRange();
      setLoadedChunks(newLoadedChunks);
      
      lastPlayerChunk.current = currentChunk;

      // Clean up old chunks if we have too many
      chunkManager.cleanupOldChunks();

      // Update memory statistics
      const chunkStats = chunkManager.getStats();
      const poolStats = objectPool.getStats();
      setMemoryStats({
        chunks: chunkStats.loadedChunks,
        objects: parseInt(chunkStats.memoryUsage.split(' ')[0]),
        poolStats
      });
    }
  });

  // Initial chunk loading
  useEffect(() => {
    // Preload initial area around spawn
    chunkManager.preloadArea(0, 0, renderRadius);
    const initialChunks = chunkManager.getLoadedChunksInRange();
    setLoadedChunks(initialChunks);
  }, [chunkManager, renderRadius]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      objectPool.dispose();
      lodManager.dispose();
    };
  }, [objectPool, lodManager]);

  return (
    <>
      {/* Debug visualization disabled for now */}
      
      {/* Render optimized chunks */}
      <group>
        {loadedChunks.map((chunkData) => (
          <OptimizedChunkComponent
            key={`${chunkData.coord.x}-${chunkData.coord.z}`}
            chunkData={chunkData}
            playerPosition={playerPosition}
            onShopInteract={onShopInteract}
            chunkManager={chunkManager}
            objectPool={objectPool}
            lodManager={lodManager}
            collisionManager={collisionManager}
          />
        ))}
      </group>
    </>
  );
}
