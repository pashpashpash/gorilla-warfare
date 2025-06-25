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
      
      // Calculate new position
      const newX = playerPos.current[0] + moveVector.x;
      const newZ = playerPos.current[2] + moveVector.z;
      
      // Check collision for the new position
      const collision = collisionManager.checkCircleCollision(newX, newZ, playerRadius);
      
      if (!collision.hit) {
        // No collision - move freely
        playerPos.current[0] = newX;
        playerPos.current[2] = newZ;
      } else if (collision.normal) {
        // Collision detected - try sliding along the surface
        const slideVector = new THREE.Vector3(moveVector.x, 0, moveVector.z);
        const normal = new THREE.Vector3(collision.normal[0], 0, collision.normal[2]);
        
        // Project movement vector onto the surface (remove component along normal)
        const projectedMovement = slideVector.clone().sub(
          normal.clone().multiplyScalar(slideVector.dot(normal))
        );
        
        // Try the sliding movement
        const slideX = playerPos.current[0] + projectedMovement.x;
        const slideZ = playerPos.current[2] + projectedMovement.z;
        
        const slideCollision = collisionManager.checkCircleCollision(slideX, slideZ, playerRadius);
        
        if (!slideCollision.hit) {
          // Sliding movement is valid
          playerPos.current[0] = slideX;
          playerPos.current[2] = slideZ;
        }
        // If sliding also fails, player stays in place (blocked)
      }
      
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
