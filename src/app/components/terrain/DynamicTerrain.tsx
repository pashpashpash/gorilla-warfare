'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { ChunkManager } from './ChunkManager';
import { ObjectPool } from './ObjectPool';
import { LODManager, LODLevel } from './LODManager';
import { ChunkCoord, TerrainFeature } from './TerrainGenerator';

interface DynamicTerrainProps {
  playerPosition: [number, number, number];
  onShopInteract: () => void;
  seed?: number;
  chunkSize?: number;
  renderRadius?: number;
}

// Individual terrain feature component
function TerrainFeatureComponent({ 
  feature, 
  playerPosition, 
  onShopInteract 
}: { 
  feature: TerrainFeature;
  playerPosition: [number, number, number];
  onShopInteract: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [showShopPrompt, setShowShopPrompt] = React.useState(false);

  // Check distance to player for shop interaction
  useFrame(() => {
    if (feature.type === 'shop') {
      const dx = playerPosition[0] - feature.position[0];
      const dz = playerPosition[2] - feature.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      setShowShopPrompt(distance < 5);
    }
  });

  // Handle shop interaction
  useEffect(() => {
    if (feature.type === 'shop') {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.code === 'KeyF' && showShopPrompt) {
          onShopInteract();
        }
      };
      
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [showShopPrompt, onShopInteract, feature.type]);

  const scale = feature.scale || 1;
  const rotation = feature.rotation || 0;

  switch (feature.type) {
    case 'tree':
      return (
        <group ref={ref} position={feature.position} scale={scale} rotation={[0, rotation, 0]}>
          {/* Tree trunk */}
          <Box args={[1, 8, 1]} position={[0, 4, 0]}>
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </Box>
          {/* Tree foliage */}
          <Sphere args={[3]} position={[0, 10, 0]}>
            <meshStandardMaterial color="#228B22" roughness={0.8} />
          </Sphere>
        </group>
      );

    case 'rock':
      return (
        <group ref={ref} position={feature.position} scale={scale} rotation={[0, rotation, 0]}>
          <Box args={[2, 1.5, 2]} position={[0, 0.75, 0]}>
            <meshStandardMaterial color="#696969" roughness={0.9} />
          </Box>
          {/* Additional rock detail */}
          <Box args={[1.5, 1, 1.5]} position={[0.5, 0.5, 0.5]}>
            <meshStandardMaterial color="#808080" roughness={0.9} />
          </Box>
        </group>
      );

    case 'shop':
      return (
        <group ref={ref} position={feature.position} rotation={[0, rotation, 0]}>
          {/* Shop Building */}
          <Box args={[6, 4, 6]} position={[0, 2, 0]}>
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </Box>
          {/* Roof */}
          <Box args={[7, 1, 7]} position={[0, 4.5, 0]}>
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </Box>
          {/* Door */}
          <Box args={[1.5, 3, 0.2]} position={[0, 1.5, 3.1]}>
            <meshStandardMaterial color="#4A4A4A" roughness={0.8} />
          </Box>
          {/* Sign */}
          <Box args={[3, 1, 0.2]} position={[0, 3.5, 3.1]}>
            <meshStandardMaterial color="#FFFFFF" />
          </Box>
          
          {/* Interaction Prompt */}
          {showShopPrompt && (
            <group position={[0, 6, 0]}>
              <Plane args={[4, 1]} position={[0, 0, 0]}>
                <meshBasicMaterial color="#000000" transparent opacity={0.7} />
              </Plane>
              <Plane args={[3.8, 0.8]} position={[0, 0, 0.01]}>
                <meshBasicMaterial color="#FFFFFF" />
              </Plane>
            </group>
          )}
        </group>
      );

    case 'waterfall':
      return (
        <group ref={ref} position={feature.position}>
          <Box args={[0.5, 20, 0.5]} position={[0, 0, 0]}>
            <meshBasicMaterial color="#87CEEB" transparent opacity={0.6} />
          </Box>
          {/* Water pool at bottom */}
          <Sphere args={[3, 8, 8]} position={[0, -8, 0]}>
            <meshBasicMaterial color="#4682B4" transparent opacity={0.7} />
          </Sphere>
        </group>
      );

    default:
      return null;
  }
}

// Chunk component that renders all features in a chunk
function ChunkComponent({ 
  chunkData, 
  playerPosition, 
  onShopInteract,
  chunkManager,
  biomeColor 
}: { 
  chunkData: {
    coord: ChunkCoord;
    features: TerrainFeature[];
    biome: string;
  };
  playerPosition: [number, number, number];
  onShopInteract: () => void;
  chunkManager: ChunkManager;
  biomeColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const chunkSize = chunkManager.getChunkSize();
  
  // Calculate chunk world position
  const worldX = chunkData.coord.x * chunkSize;
  const worldZ = chunkData.coord.z * chunkSize;

  // Store render objects in chunk manager when component mounts
  useEffect(() => {
    if (groupRef.current) {
      const objects = groupRef.current.children;
      chunkManager.setChunkRenderObjects(chunkData.coord, objects);
    }
  }, [chunkData.coord, chunkManager]);

  return (
    <group ref={groupRef}>
      {/* Ground plane for this chunk */}
      <Plane 
        args={[chunkSize, chunkSize]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[worldX + chunkSize/2, 0, worldZ + chunkSize/2]}
      >
        <meshStandardMaterial color={biomeColor} roughness={0.8} />
      </Plane>
      
      {/* Render all features in this chunk */}
      {chunkData.features.map((feature: TerrainFeature) => (
        <TerrainFeatureComponent
          key={feature.id}
          feature={feature}
          playerPosition={playerPosition}
          onShopInteract={onShopInteract}
        />
      ))}
    </group>
  );
}

export default function DynamicTerrain({ 
  playerPosition, 
  onShopInteract, 
  seed = 12345,
  chunkSize = 50,
  renderRadius = 2
}: DynamicTerrainProps) {
  const chunkManager = useMemo(() => 
    new ChunkManager(seed, chunkSize, renderRadius), 
    [seed, chunkSize, renderRadius]
  );
  
  const [loadedChunks, setLoadedChunks] = React.useState<{
    coord: ChunkCoord;
    features: TerrainFeature[];
    biome: string;
  }[]>([]);
  const lastPlayerChunk = useRef<ChunkCoord>({ x: 0, z: 0 });

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
    }
  });

  // Initial chunk loading
  useEffect(() => {
    // Preload initial area around spawn
    chunkManager.preloadArea(0, 0, renderRadius);
    const initialChunks = chunkManager.getLoadedChunksInRange();
    setLoadedChunks(initialChunks);
  }, [chunkManager, renderRadius]);

  // Get biome color based on biome type
  const getBiomeColor = (biome: string): string => {
    switch (biome) {
      case 'clearing': return '#90EE90'; // Light green
      case 'dense_forest': return '#006400'; // Dark green
      case 'rocky': return '#A0A0A0'; // Gray
      default: return '#228B22'; // Forest green
    }
  };

  return (
    <group>
      {loadedChunks.map((chunkData) => (
        <ChunkComponent
          key={`${chunkData.coord.x}-${chunkData.coord.z}`}
          chunkData={chunkData}
          playerPosition={playerPosition}
          onShopInteract={onShopInteract}
          chunkManager={chunkManager}
          biomeColor={getBiomeColor(chunkData.biome)}
        />
      ))}
    </group>
  );
}
