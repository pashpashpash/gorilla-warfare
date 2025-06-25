'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { CollisionManager } from '../collision/CollisionManager';

interface GameState {
  perks: {
    moveSpeed: number;
  };
}

interface EnhancedThirdPersonPlayerProps {
  position: [number, number, number];
  onMove: (pos: [number, number, number]) => void;
  cameraRotation: React.RefObject<{ theta: number, phi: number }>;
  gameState: GameState;
  collisionManager: CollisionManager;
}

export function EnhancedThirdPersonPlayer({ 
  position, 
  onMove, 
  cameraRotation, 
  gameState,
  collisionManager
}: EnhancedThirdPersonPlayerProps) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const playerPos = useRef(position);
  const playerRadius = 0.5; // Player collision radius
  
  useFrame((state, delta) => {
    if (ref.current) {
      const keys = (window as unknown as { gameKeys?: { w: boolean; a: boolean; s: boolean; d: boolean; space: boolean } }).gameKeys || { w: false, a: false, s: false, d: false, space: false };
      
      // Apply speed boost from upgrades
      const baseSpeed = 8;
      const speedMultiplier = gameState.perks.moveSpeed;
      const speed = baseSpeed * speedMultiplier * delta;
      
      // Get camera direction for movement
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0; // Keep movement on ground plane
      cameraDirection.normalize();
      
      // Get camera right vector
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
      cameraRight.normalize();
      
      // Calculate desired movement based on camera orientation
      const moveVector = new THREE.Vector3(0, 0, 0);
      
      if (keys.w) moveVector.add(cameraDirection.clone().multiplyScalar(speed));
      if (keys.s) moveVector.add(cameraDirection.clone().multiplyScalar(-speed));
      if (keys.a) moveVector.add(cameraRight.clone().multiplyScalar(-speed));
      if (keys.d) moveVector.add(cameraRight.clone().multiplyScalar(speed));
      
      // Try movement with sliding collision response
      let finalX = playerPos.current[0];
      let finalZ = playerPos.current[2];
      
      // Try X movement first
      if (Math.abs(moveVector.x) > 0.001) {
        const testX = playerPos.current[0] + moveVector.x;
        const collisionX = collisionManager.checkCircleCollision(testX, playerPos.current[2], playerRadius);
        
        if (!collisionX.hit) {
          finalX = testX;
        } else if (collisionX.normal) {
          // Try sliding along the surface for X movement
          const slideFactorX = 1 - Math.abs(collisionX.normal[0]);
          finalX = playerPos.current[0] + moveVector.x * slideFactorX * 0.8; // Reduce sliding speed slightly
          
          // Verify the slide doesn't cause collision
          const slideTestX = collisionManager.checkCircleCollision(finalX, playerPos.current[2], playerRadius);
          if (slideTestX.hit) {
            finalX = playerPos.current[0]; // Revert if slide causes collision
          }
        }
      }
      
      // Try Z movement
      if (Math.abs(moveVector.z) > 0.001) {
        const testZ = playerPos.current[2] + moveVector.z;
        const collisionZ = collisionManager.checkCircleCollision(finalX, testZ, playerRadius);
        
        if (!collisionZ.hit) {
          finalZ = testZ;
        } else if (collisionZ.normal) {
          // Try sliding along the surface for Z movement
          const slideFactorZ = 1 - Math.abs(collisionZ.normal[2]);
          finalZ = playerPos.current[2] + moveVector.z * slideFactorZ * 0.8; // Reduce sliding speed slightly
          
          // Verify the slide doesn't cause collision
          const slideTestZ = collisionManager.checkCircleCollision(finalX, finalZ, playerRadius);
          if (slideTestZ.hit) {
            finalZ = playerPos.current[2]; // Revert if slide causes collision
          }
        }
      }
      
      // Apply final position
      playerPos.current[0] = finalX;
      playerPos.current[2] = finalZ;
      
      // Keep player on ground
      playerPos.current[1] = 0;
      
      // Update position
      ref.current.position.set(playerPos.current[0], playerPos.current[1], playerPos.current[2]);
      onMove([playerPos.current[0], playerPos.current[1], playerPos.current[2]]);
      
      // Rotate player to face camera direction
      if (cameraRotation.current) {
        ref.current.rotation.y = cameraRotation.current.theta;
      }
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Gorilla Body */}
      <Box args={[1, 2, 0.8] as [number, number, number]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      {/* Gorilla Head */}
      <Sphere args={[0.6] as [number]} position={[0, 2.2, 0]}>
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </Sphere>
      {/* Arms */}
      <Box args={[0.3, 1.5, 0.3] as [number, number, number]} position={[-0.8, 1, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      <Box args={[0.3, 1.5, 0.3] as [number, number, number]} position={[0.8, 1, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      {/* Legs */}
      <Box args={[0.4, 1, 0.4] as [number, number, number]} position={[-0.3, 0, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      <Box args={[0.4, 1, 0.4] as [number, number, number]} position={[0.3, 0, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      
      {/* Debug collision visualization (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[playerRadius - 0.1, playerRadius, 16]} />
          <meshBasicMaterial color="red" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}
