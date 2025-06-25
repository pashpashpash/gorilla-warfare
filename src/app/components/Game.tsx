'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Environment, 
  Box, 
  Sphere, 
  Plane,
  Sky
} from '@react-three/drei';
import * as THREE from 'three';

// Game state interface
interface GameState {
  health: number;
  score: number;
  coconuts: number;
  money: number;
  enemies: Enemy[];
  gameStarted: boolean;
  gameOver: boolean;
  wave: number;
  betweenWaves: boolean;
  waveTimer: number;
  shopOpen: boolean;
  weapons: {
    knife: boolean;
    coconuts: boolean;
    bananaBoomerang: boolean;
    pineappleGrenade: boolean;
    watermelonCannon: boolean;
    durian: boolean;
    vineWhip: boolean;
  };
  perks: {
    maxHealth: number;
    moveSpeed: number;
    magneticRange: number;
    baseDamage: number;
    blastRadius: number;
    attackSpeed: number;
    criticalChance: number;
  };
}

interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  type: 'ape' | 'gorilla' | 'monkey' | 'acrobat' | 'berserker' | 'stealth' | 'bomber' | 'shaman' | 'leaper' | 'tank' | 'sniper' | 'trickster' | 'guardian' | 'scout';
  speed: number;
  alive: boolean;
  // Special behavior properties
  lastSpecialAttack?: number;
  isInvisible?: boolean;
  chargeDirection?: [number, number, number];
  isCharging?: boolean;
  targetPosition?: [number, number, number];
  healCooldown?: number;
  jumpCooldown?: number;
  climbHeight?: number;
  sniperCooldown?: number;
}

interface Coconut {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  explosive?: boolean;
  projectileType?: string;
}

interface MoneyDrop {
  id: string;
  position: [number, number, number];
  value: number;
  collected: boolean;
}

interface LootBox {
  id: string;
  position: [number, number, number];
  type: 'health' | 'speed' | 'damage' | 'coconuts' | 'money' | 'invincibility';
  collected: boolean;
}

interface KnifeAttack {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  life: number;
  weaponType?: string;
}

// Fortnite-style Mouse Look Camera with Pointer Lock
function FortniteMouseLook({ playerPosition, cameraRotation, onCameraReady }: { 
  playerPosition: [number, number, number],
  cameraRotation: React.RefObject<{ theta: number, phi: number }>,
  onCameraReady: (camera: THREE.Camera) => void
}) {
  const { camera } = useThree();
  const spherical = useRef(new THREE.Spherical(10, Math.PI / 2, 0));
  
  // Pass camera reference to parent on mount
  useEffect(() => {
    onCameraReady(camera);
  }, [camera, onCameraReady]);
  
  useFrame(() => {
    if (cameraRotation.current) {
      // Use accumulated rotation from mouse movement
      spherical.current.theta = cameraRotation.current.theta;
      spherical.current.phi = cameraRotation.current.phi;
      
      // Calculate camera position relative to player
      const offset = new THREE.Vector3();
      offset.setFromSpherical(spherical.current);
      
      camera.position.set(
        playerPosition[0] + offset.x,
        playerPosition[1] + offset.y,
        playerPosition[2] + offset.z
      );
      
      // Look at player
      camera.lookAt(playerPosition[0], playerPosition[1] + 1, playerPosition[2]);
    }
  });
  
  return null;
}

// Third Person Player Component
function ThirdPersonPlayer({ position, onMove, cameraRotation, gameState }: { 
  position: [number, number, number], 
  onMove: (pos: [number, number, number]) => void,
  cameraRotation: React.RefObject<{ theta: number, phi: number }>,
  gameState: GameState
}) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const playerPos = useRef(position);
  
  useFrame((state, delta) => {
    if (ref.current) {
      const keys = (window as unknown as { gameKeys?: { w: boolean; a: boolean; s: boolean; d: boolean; space: boolean } }).gameKeys || { w: false, a: false, s: false, d: false, space: false };
      // Apply speed boost from upgrades
      const baseSpeed = 8;
      const speedMultiplier = gameState.perks.moveSpeed; // Use direct speed multiplier
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
      
      // Calculate movement based on camera orientation
      const moveVector = new THREE.Vector3(0, 0, 0);
      
      if (keys.w) moveVector.add(cameraDirection.clone().multiplyScalar(speed));
      if (keys.s) moveVector.add(cameraDirection.clone().multiplyScalar(-speed));
      if (keys.a) moveVector.add(cameraRight.clone().multiplyScalar(-speed));
      if (keys.d) moveVector.add(cameraRight.clone().multiplyScalar(speed));
      
      // Apply movement
      playerPos.current[0] += moveVector.x;
      playerPos.current[2] += moveVector.z;
      playerPos.current[1] = 0; // Keep on ground
      
      // Update position
      ref.current.position.set(playerPos.current[0], playerPos.current[1], playerPos.current[2]);
      onMove([playerPos.current[0], playerPos.current[1], playerPos.current[2]]);
      
      // Rotate player to face camera direction (not movement direction)
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
    </group>
  );
}

// Advanced Enemy Component with Unique Behaviors
function AdvancedEnemy({ enemy, playerPosition, onDamage, onPositionUpdate }: { 
  enemy: Enemy, 
  playerPosition: [number, number, number],
  onDamage: (enemyId: string) => void,
  onPositionUpdate: (enemyId: string, position: [number, number, number]) => void
}) {
  const ref = useRef<THREE.Group>(null);
  const enemyPos = useRef([...enemy.position]);
  const lastAttack = useRef(0);
  const behaviorState = useRef({
    lastSpecialAttack: 0,
    isInvisible: false,
    chargeDirection: [0, 0, 0] as [number, number, number],
    isCharging: false,
    targetPosition: [0, 0, 0] as [number, number, number],
    jumpCooldown: 0,
    climbHeight: 0,
    sniperCooldown: 0
  });
  
  useFrame((state, delta) => {
    if (ref.current && enemy.alive) {
      const dx = playerPosition[0] - enemyPos.current[0];
      const dz = playerPosition[2] - enemyPos.current[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      const now = state.clock.elapsedTime;
      
      // Update behavior based on enemy type
      switch (enemy.type) {
        case 'acrobat':
          // Swings between trees, hard to hit, drops down for surprise attacks
          if (now - behaviorState.current.lastSpecialAttack > 3) {
            // Teleport to a random tree position
            const angle = Math.random() * Math.PI * 2;
            const treeDistance = 10 + Math.random() * 15;
            enemyPos.current[0] = Math.cos(angle) * treeDistance;
            enemyPos.current[2] = Math.sin(angle) * treeDistance;
            enemyPos.current[1] = 8; // High in trees
            behaviorState.current.lastSpecialAttack = now;
          }
          // Drop down when close to player
          if (distance < 8 && enemyPos.current[1] > 2) {
            enemyPos.current[1] -= 15 * delta; // Fast drop
          }
          break;
          
        case 'berserker':
          // Charges in straight lines, devastating but predictable
          if (!behaviorState.current.isCharging && distance < 15 && now - behaviorState.current.lastSpecialAttack > 4) {
            behaviorState.current.isCharging = true;
            behaviorState.current.chargeDirection = [dx / distance, 0, dz / distance];
            behaviorState.current.lastSpecialAttack = now;
          }
          if (behaviorState.current.isCharging) {
            const chargeSpeed = 20 * delta;
            enemyPos.current[0] += behaviorState.current.chargeDirection[0] * chargeSpeed;
            enemyPos.current[2] += behaviorState.current.chargeDirection[2] * chargeSpeed;
            // Stop charging after 2 seconds
            if (now - behaviorState.current.lastSpecialAttack > 2) {
              behaviorState.current.isCharging = false;
            }
          }
          break;
          
        case 'stealth':
          // Becomes invisible periodically, ambush attacks
          if (now - behaviorState.current.lastSpecialAttack > 5) {
            behaviorState.current.isInvisible = !behaviorState.current.isInvisible;
            behaviorState.current.lastSpecialAttack = now;
          }
          if (behaviorState.current.isInvisible && distance > 3) {
            // Move faster when invisible
            const speed = enemy.speed * 2 * delta;
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          }
          break;
          
        case 'bomber':
          // Throws explosive fruit from range, stays back
          if (distance > 8) {
            // Move to maintain distance
            const speed = enemy.speed * delta;
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          } else if (distance < 12) {
            // Back away if too close
            const speed = enemy.speed * delta;
            enemyPos.current[0] -= (dx / distance) * speed;
            enemyPos.current[2] -= (dz / distance) * speed;
          }
          break;
          
        case 'leaper':
          // Jumps around erratically, very fast and unpredictable
          behaviorState.current.jumpCooldown -= delta;
          if (behaviorState.current.jumpCooldown <= 0) {
            const jumpAngle = Math.random() * Math.PI * 2;
            const jumpDistance = 5 + Math.random() * 8;
            behaviorState.current.targetPosition = [
              enemyPos.current[0] + Math.cos(jumpAngle) * jumpDistance,
              0,
              enemyPos.current[2] + Math.sin(jumpAngle) * jumpDistance
            ];
            behaviorState.current.jumpCooldown = 1 + Math.random() * 2;
          }
          // Move toward jump target
          const jumpDx = behaviorState.current.targetPosition[0] - enemyPos.current[0];
          const jumpDz = behaviorState.current.targetPosition[2] - enemyPos.current[2];
          const jumpDistance = Math.sqrt(jumpDx * jumpDx + jumpDz * jumpDz);
          if (jumpDistance > 0.5) {
            const jumpSpeed = enemy.speed * 2 * delta;
            enemyPos.current[0] += (jumpDx / jumpDistance) * jumpSpeed;
            enemyPos.current[2] += (jumpDz / jumpDistance) * jumpSpeed;
          }
          break;
          
        case 'tank':
          // Slow but massive health, creates shockwaves
          if (distance > 2) {
            const speed = enemy.speed * 0.5 * delta; // Slower movement
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          }
          // Shockwave attack
          if (distance < 5 && now - behaviorState.current.lastSpecialAttack > 3) {
            // TODO: Create shockwave effect
            behaviorState.current.lastSpecialAttack = now;
          }
          break;
          
        case 'sniper':
          // Long-range coconut attacks, climbs to high positions
          behaviorState.current.climbHeight = Math.min(behaviorState.current.climbHeight + delta * 2, 6);
          enemyPos.current[1] = behaviorState.current.climbHeight;
          
          // Stay at distance and shoot
          if (distance < 20) {
            const speed = enemy.speed * 0.3 * delta;
            enemyPos.current[0] -= (dx / distance) * speed;
            enemyPos.current[2] -= (dz / distance) * speed;
          }
          break;
          
        case 'trickster':
          // Uses distractions and quick movements to confuse player
          if (now - behaviorState.current.lastSpecialAttack > 2) {
            // Quick dodge movement
            const dodgeAngle = Math.random() * Math.PI * 2;
            const dodgeDistance = 3 + Math.random() * 5;
            enemyPos.current[0] += Math.cos(dodgeAngle) * dodgeDistance * delta;
            enemyPos.current[2] += Math.sin(dodgeAngle) * dodgeDistance * delta;
            behaviorState.current.lastSpecialAttack = now;
          }
          // Quick approach when close
          if (distance < 5) {
            const speed = enemy.speed * 1.5 * delta;
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          }
          break;
          
        case 'guardian':
          // Protects other enemies, slow but high health and can block attacks
          if (distance > 3) {
            const speed = enemy.speed * 0.7 * delta; // Slower movement
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          }
          // Shielding aura for nearby enemies (visual effect only for now)
          if (now - behaviorState.current.lastSpecialAttack > 5) {
            behaviorState.current.lastSpecialAttack = now;
          }
          break;
          
        case 'scout':
          // Fast, low health, alerts others, tries to flank player
          if (distance > 10) {
            const speed = enemy.speed * 1.8 * delta; // Very fast
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          } else if (distance < 10 && distance > 3) {
            // Circle around player
            const speed = enemy.speed * 1.5 * delta;
            const tangentX = -dz / distance;
            const tangentZ = dx / distance;
            enemyPos.current[0] += tangentX * speed;
            enemyPos.current[2] += tangentZ * speed;
          }
          break;
          
        default:
          // Basic movement for original enemy types
          if (distance > 1.5) {
            const speed = enemy.speed * delta;
            enemyPos.current[0] += (dx / distance) * speed;
            enemyPos.current[2] += (dz / distance) * speed;
          }
      }
      
      // Attack logic
      if (distance < 2 && now - lastAttack.current > 1) {
        onDamage(enemy.id);
        lastAttack.current = now;
      }
      
      // Keep enemy on ground (except for special types)
      if (enemy.type !== 'acrobat' && enemy.type !== 'sniper') {
        enemyPos.current[1] = 0;
      }
      
      // Update position
      ref.current.position.set(enemyPos.current[0], enemyPos.current[1], enemyPos.current[2]);
      
      // Handle invisibility
      if (enemy.type === 'stealth' && behaviorState.current.isInvisible) {
        ref.current.visible = Math.sin(now * 10) > 0; // Flickering effect
      } else {
        ref.current.visible = true;
      }
      
      // Report current position back to parent
      onPositionUpdate(enemy.id, [enemyPos.current[0], enemyPos.current[1], enemyPos.current[2]]);
    }
  });

  if (!enemy.alive) return null;

  // Different colors and sizes for different enemy types
  const getEnemyAppearance = () => {
    switch (enemy.type) {
      case 'acrobat': return { color: '#FF6B35', size: [0.6, 1.2, 0.4] };
      case 'berserker': return { color: '#DC143C', size: [1.2, 2.0, 0.8] };
      case 'stealth': return { color: '#4B0082', size: [0.7, 1.4, 0.5] };
      case 'bomber': return { color: '#FF8C00', size: [0.9, 1.7, 0.7] };
      case 'shaman': return { color: '#9370DB', size: [0.8, 1.8, 0.6] };
      case 'leaper': return { color: '#32CD32', size: [0.5, 1.0, 0.3] };
      case 'tank': return { color: '#2F4F4F', size: [1.5, 2.5, 1.0] };
      case 'sniper': return { color: '#8B4513', size: [0.7, 1.5, 0.5] };
      case 'trickster': return { color: '#FF69B4', size: [0.6, 1.2, 0.4] };
      case 'guardian': return { color: '#4682B4', size: [1.3, 2.2, 0.9] };
      case 'scout': return { color: '#ADFF2F', size: [0.5, 1.0, 0.3] };
      case 'ape': return { color: '#8B4513', size: [0.8, 1.6, 0.6] };
      case 'gorilla': return { color: '#2F2F2F', size: [0.8, 1.6, 0.6] };
      case 'monkey': return { color: '#CD853F', size: [0.8, 1.6, 0.6] };
      default: return { color: '#8B4513', size: [0.8, 1.6, 0.6] };
    }
  };
  
  const appearance = getEnemyAppearance();

  return (
    <group ref={ref} position={enemy.position}>
      {/* Enemy Body */}
      <Box args={appearance.size as [number, number, number]} position={[0, appearance.size[1] / 2, 0]}>
        <meshStandardMaterial color={appearance.color} roughness={0.8} />
      </Box>
      {/* Enemy Head */}
      <Sphere args={[appearance.size[0] * 0.6] as [number]} position={[0, appearance.size[1] + appearance.size[0] * 0.3, 0]}>
        <meshStandardMaterial color={appearance.color} roughness={0.8} />
      </Sphere>
      {/* Health bar */}
      <Plane args={[1, 0.1]} position={[0, appearance.size[1] + 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="red" />
      </Plane>
      <Plane args={[enemy.health / 200, 0.1]} position={[0, appearance.size[1] + 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="green" />
      </Plane>
      {/* Special effects for certain types */}
      {enemy.type === 'berserker' && behaviorState.current.isCharging && (
        <Sphere args={[2]} position={[0, 1, 0]}>
          <meshBasicMaterial color="red" transparent opacity={0.3} />
        </Sphere>
      )}
    </group>
  );
}

// Advanced Projectile Component with Different Types
function AdvancedProjectile({ coconut, onHit, playerPosition }: { 
  coconut: Coconut, 
  onHit: (coconutId: string, position: [number, number, number]) => void,
  playerPosition: [number, number, number]
}) {
  const ref = useRef<THREE.Group>(null);
  const coconutPos = useRef([...coconut.position]);
  const life = useRef(coconut.life);
  const originalLife = useRef(coconut.life);
  const isReturning = useRef(false);
  const initialVelocity = useRef([...coconut.velocity]);
  
  useFrame((state, delta) => {
    if (ref.current) {
      const projectileType = coconut.projectileType || 'coconuts';
      
      // Banana boomerang special behavior
      if (projectileType === 'bananaBoomerang') {
        const lifeProgress = 1 - (life.current / originalLife.current);
        
        // Start returning after 40% of life (earlier return)
        if (lifeProgress > 0.4 && !isReturning.current) {
          isReturning.current = true;
          console.log('Boomerang starting return phase!');
        }
        
        // Return behavior
        if (isReturning.current) {
          // Calculate return velocity toward player
          const dx = playerPosition[0] - coconutPos.current[0];
          const dy = playerPosition[1] + 1 - coconutPos.current[1]; // Aim slightly above player
          const dz = playerPosition[2] - coconutPos.current[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance > 0) {
            const returnSpeed = 30; // Even faster return
            coconut.velocity[0] = (dx / distance) * returnSpeed;
            coconut.velocity[1] = (dy / distance) * returnSpeed + 5; // Strong upward component
            coconut.velocity[2] = (dz / distance) * returnSpeed;
          }
          
          // Check if returned to player
          const distanceToPlayer = Math.sqrt(
            Math.pow(coconutPos.current[0] - playerPosition[0], 2) +
            Math.pow(coconutPos.current[1] - playerPosition[1], 2) +
            Math.pow(coconutPos.current[2] - playerPosition[2], 2)
          );
          
          if (distanceToPlayer < 3) {
            console.log('Boomerang collected by player!');
            // Collected by player - don't explode, just remove
            onHit(coconut.id, [...coconutPos.current]);
            return;
          }
        }
        
        // Spinning animation for boomerang
        ref.current.rotation.x += delta * 15;
        ref.current.rotation.z += delta * 10;
      }
      
      // Update position
      coconutPos.current[0] += coconut.velocity[0] * delta;
      coconutPos.current[1] += coconut.velocity[1] * delta;
      coconutPos.current[2] += coconut.velocity[2] * delta;
      
      // Apply gravity (less for banana boomerang when returning)
      const gravityMultiplier = (projectileType === 'bananaBoomerang' && isReturning.current) ? 0.3 : 1;
      coconut.velocity[1] -= 15 * delta * gravityMultiplier;
      
      // Check if hit ground or expired
      life.current -= delta;
      if (coconutPos.current[1] <= 0 || life.current <= 0) {
        onHit(coconut.id, [...coconutPos.current]);
        return;
      }
      
      ref.current.position.set(coconutPos.current[0], coconutPos.current[1], coconutPos.current[2]);
    }
  });

  // Different appearances for different projectile types
  const getProjectileAppearance = () => {
    switch (coconut.projectileType) {
      case 'bananaBoomerang':
        return {
          shape: 'curved',
          color: '#FFFF00',
          size: [0.15, 0.6, 0.15],
          emissive: '#444400'
        };
      case 'watermelonCannon':
        return {
          shape: 'sphere',
          color: '#228B22',
          size: [0.4, 0.4, 0.4],
          emissive: '#001100'
        };
      case 'pineappleGrenade':
        return {
          shape: 'pineapple',
          color: '#DAA520',
          size: [0.25, 0.35, 0.25],
          emissive: '#332200'
        };
      case 'durian':
        return {
          shape: 'spiky',
          color: '#8B7D6B',
          size: [0.3, 0.3, 0.3],
          emissive: '#221100'
        };
      default: // coconuts
        return {
          shape: 'sphere',
          color: '#8B4513',
          size: [0.2, 0.2, 0.2],
          emissive: '#000000'
        };
    }
  };
  
  const appearance = getProjectileAppearance();

  return (
    <group ref={ref} position={coconut.position}>
      {/* Main projectile body */}
      {appearance.shape === 'curved' ? (
        // Banana shape - curved box
        <>
          <Box args={appearance.size as [number, number, number]} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
            <meshStandardMaterial color={appearance.color} emissive={appearance.emissive} roughness={0.7} />
          </Box>
          <Box args={[0.1, 0.4, 0.1] as [number, number, number]} position={[0.1, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
            <meshStandardMaterial color={appearance.color} emissive={appearance.emissive} roughness={0.7} />
          </Box>
        </>
      ) : appearance.shape === 'pineapple' ? (
        // Pineapple shape - textured
        <>
          <Box args={appearance.size as [number, number, number]} position={[0, 0, 0]}>
            <meshStandardMaterial color={appearance.color} emissive={appearance.emissive} roughness={0.8} />
          </Box>
          {/* Pineapple crown */}
          <Box args={[0.1, 0.2, 0.1] as [number, number, number]} position={[0, 0.25, 0]}>
            <meshStandardMaterial color="#228B22" roughness={0.9} />
          </Box>
        </>
      ) : appearance.shape === 'spiky' ? (
        // Durian shape - spiky
        <>
          <Sphere args={appearance.size as [number, number, number]} position={[0, 0, 0]}>
            <meshStandardMaterial color={appearance.color} emissive={appearance.emissive} roughness={0.9} />
          </Sphere>
          {/* Spikes */}
          <Box args={[0.05, 0.15, 0.05] as [number, number, number]} position={[0.2, 0, 0]}>
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </Box>
          <Box args={[0.05, 0.15, 0.05] as [number, number, number]} position={[-0.2, 0, 0]}>
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </Box>
          <Box args={[0.05, 0.15, 0.05] as [number, number, number]} position={[0, 0.2, 0]}>
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </Box>
        </>
      ) : (
        // Default sphere shape
        <Sphere args={appearance.size as [number, number, number]} position={[0, 0, 0]}>
          <meshStandardMaterial color={appearance.color} emissive={appearance.emissive} roughness={0.9} />
        </Sphere>
      )}
      
      {/* Trail effect for fast projectiles */}
      {(coconut.projectileType === 'watermelonCannon' || coconut.projectileType === 'bananaBoomerang') && (
        <Sphere args={[0.1]} position={[-0.3, 0, 0]}>
          <meshBasicMaterial color={appearance.color} transparent opacity={0.3} />
        </Sphere>
      )}
    </group>
  );
}

// Shop Building Component
function ShopBuilding({ playerPosition, onShopInteract }: {
  playerPosition: [number, number, number],
  onShopInteract: () => void
}) {
  const shopPosition: [number, number, number] = [15, 0, 15];
  const [showPrompt, setShowPrompt] = useState(false);
  
  useFrame(() => {
    const dx = playerPosition[0] - shopPosition[0];
    const dz = playerPosition[2] - shopPosition[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    setShowPrompt(distance < 5);
  });
  
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'KeyF' && showPrompt) {
        onShopInteract();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPrompt, onShopInteract]);
  
  return (
    <group position={shopPosition}>
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
      {showPrompt && (
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
}

// Import the optimized dynamic terrain system
import OptimizedDynamicTerrain from './terrain/OptimizedDynamicTerrain';

// Import collision and pathfinding systems
import { CollisionManager } from './collision/CollisionManager';
import { PathfindingManager } from './pathfinding/PathfindingManager';

// Import enhanced components
import { EnhancedThirdPersonPlayer } from './player/EnhancedThirdPersonPlayer';
import { EnhancedEnemy } from './enemies/EnhancedEnemy';

// Safe spawn position utility
function findSafeSpawnPosition(
  collisionManager: CollisionManager,
  preferredPosition: [number, number, number],
  entityRadius: number = 0.4,
  maxSearchRadius: number = 20,
  playerPosition: [number, number, number] = [0, 0, 0],
  minPlayerDistance: number = 8
): [number, number, number] {
  // First check if preferred position is safe
  const collision = collisionManager.checkCircleCollision(
    preferredPosition[0], 
    preferredPosition[2], 
    entityRadius
  );
  
  // Also check distance from player
  const playerDx = preferredPosition[0] - playerPosition[0];
  const playerDz = preferredPosition[2] - playerPosition[2];
  const playerDistance = Math.sqrt(playerDx * playerDx + playerDz * playerDz);
  
  if (!collision.hit && playerDistance >= minPlayerDistance) {
    return preferredPosition;
  }
  
  // Search in expanding circles for a safe position
  for (let radius = 1; radius <= maxSearchRadius; radius += 1) {
    const searchPoints = Math.max(8, radius * 4); // More points for larger radii
    
    for (let i = 0; i < searchPoints; i++) {
      const angle = (i / searchPoints) * Math.PI * 2;
      const testX = preferredPosition[0] + Math.cos(angle) * radius;
      const testZ = preferredPosition[2] + Math.sin(angle) * radius;
      
      // Check collision with terrain
      const testCollision = collisionManager.checkCircleCollision(testX, testZ, entityRadius);
      
      // Check distance from player
      const testPlayerDx = testX - playerPosition[0];
      const testPlayerDz = testZ - playerPosition[2];
      const testPlayerDistance = Math.sqrt(testPlayerDx * testPlayerDx + testPlayerDz * testPlayerDz);
      
      if (!testCollision.hit && testPlayerDistance >= minPlayerDistance) {
        return [testX, preferredPosition[1], testZ];
      }
    }
  }
  
  // If no safe position found, return a position far from obstacles
  // Try positions at the edge of the search area
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const fallbackX = preferredPosition[0] + Math.cos(angle) * maxSearchRadius;
    const fallbackZ = preferredPosition[2] + Math.sin(angle) * maxSearchRadius;
    
    const fallbackCollision = collisionManager.checkCircleCollision(fallbackX, fallbackZ, entityRadius);
    const fallbackPlayerDx = fallbackX - playerPosition[0];
    const fallbackPlayerDz = fallbackZ - playerPosition[2];
    const fallbackPlayerDistance = Math.sqrt(fallbackPlayerDx * fallbackPlayerDx + fallbackPlayerDz * fallbackPlayerDz);
    
    if (!fallbackCollision.hit && fallbackPlayerDistance >= minPlayerDistance) {
      return [fallbackX, preferredPosition[1], fallbackZ];
    }
  }
  
  // Last resort: return original position (enemy will have unstuck logic)
  console.warn('Could not find safe spawn position, using original position');
  return preferredPosition;
}

// Money Drop Component
function MoneyDropComponent({ money, playerPosition, onCollect }: { 
  money: MoneyDrop, 
  playerPosition: [number, number, number],
  onCollect: (moneyId: string) => void 
}) {
  const ref = useRef<THREE.Group>(null);
  const bobOffset = useRef(Math.random() * Math.PI * 2);
  const isBeingPulled = useRef(false);
  const velocity = useRef({ x: 0, z: 0 });
  
  useFrame((state, delta) => {
    if (ref.current && !money.collected) {
      // Calculate distance to player
      const dx = playerPosition[0] - money.position[0];
      const dz = playerPosition[2] - money.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Magnetic range check - once pulled, always stay pulled until collected
      if (distance < 6 || isBeingPulled.current) {
        isBeingPulled.current = true;
        
        // Direct movement towards player (no physics, just smooth interpolation)
        const moveSpeed = Math.min(0.8, 5 / Math.max(distance, 0.1)) * delta * 60;
        
        // Move directly towards player position
        const directionX = dx / Math.max(distance, 0.001);
        const directionZ = dz / Math.max(distance, 0.001);
        
        money.position[0] += directionX * moveSpeed;
        money.position[2] += directionZ * moveSpeed;
        
        // Check for collection (smaller radius for actual collection)
        if (distance < 0.8) {
          onCollect(money.id);
          return;
        }
      }
      
      // Update visual position
      ref.current.position.set(money.position[0], money.position[1], money.position[2]);
      
      // Bobbing animation (less when being pulled)
      const bobIntensity = isBeingPulled.current ? 0.1 : 0.2;
      ref.current.position.y = money.position[1] + Math.sin(state.clock.elapsedTime * 3 + bobOffset.current) * bobIntensity;
      
      // Rotation (faster when being pulled)
      const rotationSpeed = isBeingPulled.current ? 8 : 2;
      ref.current.rotation.y += delta * rotationSpeed;
      
      // Scale effect when being pulled
      const scale = isBeingPulled.current ? 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1 : 1;
      ref.current.scale.setScalar(scale);
    }
  });

  if (money.collected) return null;

  return (
    <group ref={ref} position={money.position}>
      <Box args={[0.3, 0.6, 0.1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#00FF00" emissive="#004400" />
      </Box>
      <Box args={[0.4, 0.2, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#FFFFFF" />
      </Box>
      {/* Glowing effect when being magnetized */}
      {isBeingPulled.current && (
        <Sphere args={[0.8]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#00FF00" transparent opacity={0.2} />
        </Sphere>
      )}
    </group>
  );
}

// Loot Box Component
function LootBoxComponent({ lootBox, playerPosition, onCollect }: { 
  lootBox: LootBox, 
  playerPosition: [number, number, number],
  onCollect: (lootBoxId: string) => void 
}) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (ref.current && !lootBox.collected) {
      // Floating and rotating
      ref.current.position.y = lootBox.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      ref.current.rotation.y += delta;
      ref.current.rotation.x += delta * 0.5;
      
      // Check collection distance
      const dx = playerPosition[0] - lootBox.position[0];
      const dz = playerPosition[2] - lootBox.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 2) {
        onCollect(lootBox.id);
      }
    }
  });

  if (lootBox.collected) return null;

  const colors = {
    health: '#FF0000',
    speed: '#00FF00', 
    damage: '#FF8800',
    coconuts: '#8B4513',
    money: '#FFD700',
    invincibility: '#9400D3'
  };

  return (
    <group ref={ref} position={lootBox.position}>
      <Box args={[1, 1, 1]} position={[0, 0, 0]}>
        <meshStandardMaterial color={colors[lootBox.type]} emissive={colors[lootBox.type]} emissiveIntensity={0.3} />
      </Box>
      <Sphere args={[0.2]} position={[0, 0.7, 0]}>
        <meshBasicMaterial color="white" />
      </Sphere>
    </group>
  );
}

// Melee Attack Component (Knife or Vine Whip)
function KnifeAttackComponent({ attack, onComplete, onHit }: { 
  attack: KnifeAttack, 
  onComplete: (attackId: string) => void,
  onHit: (attackId: string, position: [number, number, number]) => void
}) {
  const ref = useRef<THREE.Group>(null);
  const life = useRef(attack.life);
  const hasHit = useRef(false);
  const isVineWhip = attack.weaponType === 'vineWhip';
  
  useFrame((state, delta) => {
    if (ref.current && !hasHit.current) {
      life.current -= delta;
      if (life.current <= 0) {
        onComplete(attack.id);
        return;
      }
      
      // Different speeds for different weapons
      const speed = isVineWhip ? 20 : 15; // Vine whip is faster
      ref.current.position.x += attack.direction[0] * delta * speed;
      ref.current.position.y += attack.direction[1] * delta * speed;
      ref.current.position.z += attack.direction[2] * delta * speed;
      
      // Vine whip has a whipping animation
      if (isVineWhip) {
        const whipProgress = 1 - (life.current / attack.life);
        const whipCurve = Math.sin(whipProgress * Math.PI * 3) * 0.5;
        ref.current.rotation.z = whipCurve;
        ref.current.scale.x = 1 + whipProgress * 0.5; // Extends as it whips
      }
      
      // Check for hits at current position
      const currentPos: [number, number, number] = [
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z
      ];
      
      // Trigger hit detection
      onHit(attack.id, currentPos);
      
      // Fade out
      const opacity = life.current / attack.life;
      if (ref.current.children.length > 0) {
        ref.current.children.forEach(child => {
          if ((child as any).material) {
            (child as any).material.opacity = opacity;
          }
        });
      }
    }
  });

  if (isVineWhip) {
    // Vine whip appearance - long, green, organic
    return (
      <group ref={ref} position={attack.position}>
        {/* Main vine body - longer and thicker */}
        <Box args={[0.15, 0.3, 4]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#228B22" transparent />
        </Box>
        {/* Vine segments for organic look */}
        <Box args={[0.12, 0.25, 1]} position={[0, 0, 1.5]}>
          <meshBasicMaterial color="#32CD32" transparent />
        </Box>
        <Box args={[0.1, 0.2, 1]} position={[0, 0, 2.5]}>
          <meshBasicMaterial color="#90EE90" transparent />
        </Box>
        {/* Thorns/spikes */}
        <Box args={[0.05, 0.1, 0.2]} position={[0.1, 0.1, 1]}>
          <meshBasicMaterial color="#8B4513" transparent />
        </Box>
        <Box args={[0.05, 0.1, 0.2]} position={[-0.1, 0.1, 2]}>
          <meshBasicMaterial color="#8B4513" transparent />
        </Box>
        {/* Glowing effect */}
        <Sphere args={[0.3]} position={[0, 0, 2]}>
          <meshBasicMaterial color="#00FF00" transparent opacity={0.2} />
        </Sphere>
      </group>
    );
  } else {
    // Knife appearance - metallic and sharp
    return (
      <group ref={ref} position={attack.position}>
        <Box args={[0.1, 0.5, 2]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#C0C0C0" transparent />
        </Box>
        {/* Knife blade shine */}
        <Box args={[0.05, 0.3, 1.5]} position={[0, 0, 0.25]}>
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
        </Box>
      </group>
    );
  }
}

// Explosion Effect
function Explosion({ position, blastRadius, onComplete }: { position: [number, number, number], blastRadius: number, onComplete: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const scale = useRef(0);
  
  // Scale animation duration with blast radius - bigger explosions last longer
  const animationSpeed = 8 / (blastRadius / 5); // Slower for larger blasts
  const maxScale = 1.5 + (blastRadius / 10); // Larger explosions reach higher scale
  
  useFrame((state, delta) => {
    if (ref.current) {
      scale.current += delta * animationSpeed;
      if (scale.current > maxScale) {
        onComplete();
        return;
      }
      ref.current.scale.setScalar(scale.current);
      
      // Fade out towards the end
      const fadeProgress = scale.current / maxScale;
      const opacity = fadeProgress < 0.7 ? 0.8 : 0.8 * (1 - (fadeProgress - 0.7) / 0.3);
      if (ref.current.children[0]) {
        (ref.current.children[0] as any).material.opacity = opacity;
      }
    }
  });

  return (
    <group ref={ref} position={position}>
      <Sphere args={[blastRadius / 2.5]} position={[0, 0, 0]}>
        <meshBasicMaterial color="orange" transparent opacity={0.8} />
      </Sphere>
    </group>
  );
}

// Main Game Component
export default function Game() {
  // Create collision and pathfinding managers
  const collisionManager = useRef<CollisionManager | null>(null);
  const pathfindingManager = useRef<PathfindingManager | null>(null);
  
  // Initialize managers
  useEffect(() => {
    if (!collisionManager.current) {
      collisionManager.current = new CollisionManager();
    }
    if (!pathfindingManager.current && collisionManager.current) {
      pathfindingManager.current = new PathfindingManager(collisionManager.current);
    }
  }, []);

  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    score: 0,
    coconuts: 0, // Start with 0 coconuts - must be purchased
    money: 50, // Reduced starting money for better balance
    enemies: [],
    gameStarted: false,
    gameOver: false,
    wave: 1,
    betweenWaves: false,
    waveTimer: 60,
    shopOpen: false,
    weapons: {
      knife: true,
      coconuts: false, // Coconuts must be unlocked
      bananaBoomerang: false,
      pineappleGrenade: false,
      watermelonCannon: false,
      durian: false,
      vineWhip: false
    },
    perks: {
      maxHealth: 100,
      moveSpeed: 1.0,
      magneticRange: 6,
      baseDamage: 30,
      blastRadius: 5,
      attackSpeed: 1.0,
      criticalChance: 0.1
    }
  });

  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [coconutProjectiles, setCoconutProjectiles] = useState<Coconut[]>([]);
  const [explosions, setExplosions] = useState<{ id: string, position: [number, number, number] }[]>([]);
  const [enemyPositions, setEnemyPositions] = useState<{ [key: string]: [number, number, number] }>({});
  const [moneyDrops, setMoneyDrops] = useState<MoneyDrop[]>([]);
  const [lootBoxes, setLootBoxes] = useState<LootBox[]>([]);
  const [knifeAttacks, setKnifeAttacks] = useState<KnifeAttack[]>([]);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const cameraRotation = useRef({ theta: 0, phi: Math.PI / 2 });
  const cameraRef = useRef<THREE.Camera | null>(null);
  const lastKnifeAttack = useRef(0);

  // Player position ref to get current position - persists across re-renders
  const playerPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  // Preserve position during shop transitions
  const savedPlayerPosition = useRef<[number, number, number]>([0, 0, 0]);
  const savedCameraRotation = useRef({ theta: 0, phi: Math.PI / 2 });
  const isInShopTransition = useRef(false);
  
  // Update player position ref whenever position changes
  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  // Handle shop transitions - preserve position and camera state
  useEffect(() => {
    if (gameState.shopOpen && !isInShopTransition.current) {
      // Entering shop - save current state and release pointer lock
      console.log('Entering shop - saving position:', playerPosition);
      savedPlayerPosition.current = [...playerPosition];
      savedCameraRotation.current = { ...cameraRotation.current };
      isInShopTransition.current = true;
      
      // Release pointer lock so user can interact with shop UI
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else if (!gameState.shopOpen && isInShopTransition.current) {
      // Exiting shop - restore state
      console.log('Exiting shop - restoring position:', savedPlayerPosition.current);
      setPlayerPosition(savedPlayerPosition.current);
      cameraRotation.current = { ...savedCameraRotation.current };
      isInShopTransition.current = false;
      
      // Automatically restore pointer lock after a brief delay
      setTimeout(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.requestPointerLock();
        }
      }, 100);
      
      console.log('Shop exit complete - position preserved, pointer lock restored');
    }
  }, [gameState.shopOpen, playerPosition]);

  // Get current melee weapon
  const getCurrentMeleeWeapon = () => {
    if (gameState.weapons.vineWhip) return 'vineWhip';
    return 'knife';
  };

  // Get current projectile weapon (priority order: most expensive first)
  const getCurrentProjectileWeapon = () => {
    if (gameState.weapons.watermelonCannon) return 'watermelonCannon';
    if (gameState.weapons.pineappleGrenade) return 'pineappleGrenade';
    if (gameState.weapons.durian) return 'durian';
    if (gameState.weapons.bananaBoomerang) return 'bananaBoomerang';
    return 'coconuts';
  };

  // Melee attack function (knife or vine whip)
  const performMeleeAttack = () => {
    const now = Date.now();
    const currentWeapon = getCurrentMeleeWeapon();
    const cooldown = currentWeapon === 'vineWhip' ? 300 : 500; // Vine whip is faster
    
    if (now - lastKnifeAttack.current < cooldown) return;
    
    lastKnifeAttack.current = now;
    
    if (cameraRef.current) {
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      
      const currentPlayerPos = playerPositionRef.current;
      
      const newAttack: KnifeAttack = {
        id: `${currentWeapon}-${now}`,
        position: [currentPlayerPos[0], currentPlayerPos[1] + 1, currentPlayerPos[2]],
        direction: [direction.x, direction.y, direction.z],
        life: currentWeapon === 'vineWhip' ? 1.0 : 0.5, // Vine whip lasts much longer
        weaponType: currentWeapon // Add weapon type for visual differences
      };
      
      setKnifeAttacks(prev => [...prev, newAttack]);
      
      // Check for immediate hits on nearby enemies
      setGameState(prev => ({
        ...prev,
        enemies: prev.enemies.map(enemy => {
          if (!enemy.alive) return enemy;
          
          const currentPos = enemyPositions[enemy.id] || enemy.position;
          const dx = currentPos[0] - currentPlayerPos[0];
          const dz = currentPos[2] - currentPlayerPos[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          // Different range and damage for different weapons
          const weaponRange = currentWeapon === 'vineWhip' ? 5 : 3; // Vine whip has longer range
          const baseDamage = currentWeapon === 'vineWhip' ? 100 : 75; // Vine whip does more damage
          
          if (distance < weaponRange) {
            const actualDamage = baseDamage * (gameState.perks.baseDamage / 50); // Scale with base damage
            const newHealth = enemy.health - actualDamage;
            if (newHealth <= 0) {
              // Drop money when enemy dies - balanced amounts
              const baseMoneyValue = 15 + Math.floor(Math.random() * 10); // 15-25 base
              const waveBonus = gameState.wave * 2; // +2 per wave
              const moneyValue = baseMoneyValue + waveBonus;
              const newMoney: MoneyDrop = {
                id: `money-${enemy.id}-${now}-${Math.random().toString(36).substr(2, 9)}`,
                position: [currentPos[0], currentPos[1] + 1, currentPos[2]],
                value: moneyValue,
                collected: false
              };
              setMoneyDrops(prev => [...prev, newMoney]);
              
              setGameState(prev2 => ({ ...prev2, score: prev2.score + 100 }));
              return { ...enemy, health: 0, alive: false };
            }
            return { ...enemy, health: newHealth };
          }
          return enemy;
        })
      }));
    }
  };

  // Key handling with knife attack
  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false, space: false };
    (window as any).gameKeys = keys;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
        case 'Space': 
          if (!keys.space && gameState.weapons.knife && isPointerLocked) {
            performMeleeAttack();
          }
          keys.space = true; 
          event.preventDefault(); 
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyD': keys.d = false; break;
        case 'Space': keys.space = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      delete (window as any).gameKeys;
    };
  }, [gameState.weapons.knife, isPointerLocked]);

  // Pointer lock and mouse movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isPointerLocked) {
        const sensitivity = 0.002;
        cameraRotation.current.theta -= event.movementX * sensitivity;
        cameraRotation.current.phi -= event.movementY * sensitivity;
        
        // Clamp vertical rotation
        cameraRotation.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.current.phi));
      }
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && isPointerLocked) {
        document.exitPointerLock();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isPointerLocked]);

  // Initialize enemies and spawn loot boxes
  useEffect(() => {
    if (gameState.gameStarted && gameState.enemies.length === 0) {
      const newEnemies: Enemy[] = [];
      const enemyCount = Math.min(gameState.wave + 2, 6);
      
      for (let i = 0; i < enemyCount; i++) {
        const angle = (i / enemyCount) * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        
        // Progressive enemy type introduction based on wave
        let availableTypes: Enemy['type'][] = ['ape', 'gorilla', 'monkey'];
        
        if (gameState.wave >= 3) availableTypes.push('acrobat', 'berserker');
        if (gameState.wave >= 5) availableTypes.push('stealth', 'bomber');
        if (gameState.wave >= 7) availableTypes.push('shaman', 'leaper');
        if (gameState.wave >= 10) availableTypes.push('tank', 'sniper');
        if (gameState.wave >= 12) availableTypes.push('trickster', 'guardian');
        if (gameState.wave >= 15) availableTypes.push('scout');
        
        const enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        // Balanced enemy scaling: Base 80 HP + 20 per wave
        const baseHealth = 80 + (gameState.wave - 1) * 20;
        let enemyHealth = baseHealth;
        
        // Different health multipliers by type
        if (enemyType === 'monkey') enemyHealth *= 0.8; // Faster, weaker
        else if (enemyType === 'gorilla') enemyHealth *= 1.5; // Slower, tankier
        
        // Calculate preferred spawn position
        const preferredPosition: [number, number, number] = [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ];
        
        // Find safe spawn position using collision manager
        const safePosition = collisionManager.current 
          ? findSafeSpawnPosition(
              collisionManager.current,
              preferredPosition,
              0.4, // Enemy radius
              20,  // Max search radius
              playerPositionRef.current,
              8    // Min distance from player
            )
          : preferredPosition;

        newEnemies.push({
          id: `enemy-${gameState.wave}-${i}`,
          position: safePosition,
          health: Math.round(enemyHealth),
          type: enemyType,
          speed: enemyType === 'monkey' ? 6 + Math.random() * 3 : enemyType === 'gorilla' ? 4 + Math.random() * 2 : 5 + Math.random() * 3,
          alive: true
        });
      }
      
      setGameState(prev => ({ ...prev, enemies: newEnemies }));
      
      // Spawn loot boxes occasionally (20% chance per wave)
      if (Math.random() < 0.2) {
        const lootTypes: LootBox['type'][] = ['health', 'speed', 'damage', 'coconuts', 'money', 'invincibility'];
        const randomType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        
        const newLootBox: LootBox = {
          id: `lootbox-${gameState.wave}-${Date.now()}`,
          position: [
            (Math.random() - 0.5) * 30,
            2,
            (Math.random() - 0.5) * 30
          ],
          type: randomType,
          collected: false
        };
        
        setLootBoxes(prev => [...prev, newLootBox]);
      }
    }
  }, [gameState.gameStarted, gameState.enemies.length, gameState.wave]);

  const startGame = () => {
    setGameState(prev => ({ ...prev, gameStarted: true }));
    // Auto-request pointer lock when starting the game
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.requestPointerLock();
      }
    }, 100); // Small delay to ensure canvas is ready
  };

  const throwProjectile = () => {
    if (gameState.weapons.coconuts && gameState.coconuts > 0 && cameraRef.current) {
      // Get the actual camera direction vector
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      
      const currentWeapon = getCurrentProjectileWeapon();
      
      // Different stats for different weapons
      let velocity, life, projectileSize;
      switch (currentWeapon) {
        case 'watermelonCannon':
          velocity = [direction.x * 25, direction.y * 25 + 3, direction.z * 25]; // Faster, less arc
          life = 4; // Longer range
          projectileSize = 0.4; // Bigger
          break;
        case 'pineappleGrenade':
          velocity = [direction.x * 18, direction.y * 18 + 8, direction.z * 18]; // Slower, more arc
          life = 3.5;
          projectileSize = 0.3;
          break;
        case 'durian':
          velocity = [direction.x * 15, direction.y * 15 + 10, direction.z * 15]; // Slowest, highest arc
          life = 4;
          projectileSize = 0.35;
          break;
        case 'bananaBoomerang':
          velocity = [direction.x * 22, direction.y * 22 + 4, direction.z * 22];
          life = 5; // Returns, so longer life
          projectileSize = 0.25;
          break;
        default: // coconuts
          velocity = [direction.x * 20, direction.y * 20 + 5, direction.z * 20];
          life = 3;
          projectileSize = 0.2;
      }
      
      const newProjectile: Coconut = {
        id: `${currentWeapon}-${Date.now()}`,
        position: [playerPosition[0], playerPosition[1] + 2, playerPosition[2]],
        velocity: velocity,
        life: life,
        projectileType: currentWeapon
      };
      
      setCoconutProjectiles(prev => [...prev, newProjectile]);
      setGameState(prev => ({ ...prev, coconuts: prev.coconuts - 1 }));
    }
  };

  const handleCoconutHit = (coconutId: string, position: [number, number, number]) => {
    // Create explosion with unique ID
    const explosionId = `explosion-${coconutId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setExplosions(prev => [...prev, { id: explosionId, position }]);
    
    // Damage nearby enemies using their current positions
    setGameState(prev => ({
      ...prev,
      enemies: prev.enemies.map(enemy => {
        if (!enemy.alive) return enemy;
        
        // Use current position from enemyPositions state, fallback to initial position
        const currentPos = enemyPositions[enemy.id] || enemy.position;
        const distance = Math.sqrt(
          Math.pow(currentPos[0] - position[0], 2) +
          Math.pow(currentPos[2] - position[2], 2)
        );
        
        if (distance < prev.perks.blastRadius) {
          const baseDamage = 50;
          const actualDamage = baseDamage * (gameState.perks.baseDamage / 50); // Scale with base damage
          const newHealth = enemy.health - actualDamage;
          if (newHealth <= 0) {
            // Drop money when enemy dies from coconut - balanced amounts
            const baseMoneyValue = 15 + Math.floor(Math.random() * 10); // 15-25 base
            const waveBonus = gameState.wave * 2; // +2 per wave
            const moneyValue = baseMoneyValue + waveBonus;
            const newMoney: MoneyDrop = {
              id: `money-coconut-${enemy.id}-${Date.now()}`,
              position: [currentPos[0], currentPos[1] + 1, currentPos[2]],
              value: moneyValue,
              collected: false
            };
            setMoneyDrops(prev => [...prev, newMoney]);
            
            setGameState(prev2 => ({ ...prev2, score: prev2.score + 100 }));
            return { ...enemy, health: 0, alive: false };
          }
          return { ...enemy, health: newHealth };
        }
        return enemy;
      })
    }));
    
    // Remove coconut
    setCoconutProjectiles(prev => prev.filter(c => c.id !== coconutId));
  };

  const handleEnemyDamage = (enemyId: string) => {
    setGameState(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }));
  };

  const handleEnemyPositionUpdate = (enemyId: string, position: [number, number, number]) => {
    setEnemyPositions(prev => ({ ...prev, [enemyId]: position }));
  };

  const handleExplosionComplete = (explosionId: string) => {
    setExplosions(prev => prev.filter(e => e.id !== explosionId));
  };

  // Money collection handler
  const handleMoneyCollect = (moneyId: string) => {
    const money = moneyDrops.find(m => m.id === moneyId);
    if (money && !money.collected) {
      setGameState(prev => ({ ...prev, money: prev.money + money.value }));
      setMoneyDrops(prev => prev.map(m => m.id === moneyId ? { ...m, collected: true } : m));
    }
  };

  // Loot box collection handler
  const handleLootBoxCollect = (lootBoxId: string) => {
    const lootBox = lootBoxes.find(l => l.id === lootBoxId);
    if (lootBox && !lootBox.collected) {
      setLootBoxes(prev => prev.map(l => l.id === lootBoxId ? { ...l, collected: true } : l));
      
      // Apply loot box effects
      setGameState(prev => {
        switch (lootBox.type) {
          case 'health':
            return { ...prev, health: Math.min(100, prev.health + 50) };
          case 'speed':
            return { ...prev, perks: { ...prev.perks, moveSpeed: prev.perks.moveSpeed + 0.2 } };
          case 'damage':
            return { ...prev, perks: { ...prev.perks, baseDamage: prev.perks.baseDamage + 25 } };
          case 'coconuts':
            return { ...prev, coconuts: prev.coconuts + 10 };
          case 'money':
            return { ...prev, money: prev.money + 200 };
          case 'invincibility':
            // TODO: Implement temporary invincibility
            return { ...prev, health: Math.min(100, prev.health + 25) };
          default:
            return prev;
        }
      });
    }
  };

  // Knife attack completion handler
  const handleKnifeAttackComplete = (attackId: string) => {
    setKnifeAttacks(prev => prev.filter(k => k.id !== attackId));
  };

  // Knife attack hit handler
  const handleKnifeAttackHit = (attackId: string, position: [number, number, number]) => {
    // Check for hits on enemies at the knife position
    setGameState(prev => ({
      ...prev,
      enemies: prev.enemies.map(enemy => {
        if (!enemy.alive) return enemy;
        
        const currentPos = enemyPositions[enemy.id] || enemy.position;
        const dx = currentPos[0] - position[0];
        const dz = currentPos[2] - position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 2) { // Knife hit range
          const newHealth = enemy.health - 75; // High knife damage
          if (newHealth <= 0) {
            // Drop money when enemy dies - balanced amounts
            const baseMoneyValue = 15 + Math.floor(Math.random() * 10); // 15-25 base
            const waveBonus = gameState.wave * 2; // +2 per wave
            const moneyValue = baseMoneyValue + waveBonus;
            const newMoney: MoneyDrop = {
              id: `money-knife-${enemy.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: [currentPos[0], currentPos[1] + 1, currentPos[2]],
              value: moneyValue,
              collected: false
            };
            setMoneyDrops(prev => [...prev, newMoney]);
            
            // Remove the knife attack after hit
            setKnifeAttacks(prev => prev.filter(k => k.id !== attackId));
            
            setGameState(prev2 => ({ ...prev2, score: prev2.score + 100 }));
            return { ...enemy, health: 0, alive: false };
          }
          
          // Remove the knife attack after hit
          setKnifeAttacks(prev => prev.filter(k => k.id !== attackId));
          return { ...enemy, health: newHealth };
        }
        return enemy;
      })
    }));
  };

  // Handle camera ready callback
  const handleCameraReady = (camera: THREE.Camera) => {
    cameraRef.current = camera;
  };

  // Handle mouse click and pointer lock
  const handleCanvasClick = () => {
    if (gameState.gameStarted && !gameState.gameOver) {
      if (!isPointerLocked) {
        // Request pointer lock on first click
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.requestPointerLock();
        }
      } else {
        // Shoot projectile if already locked
        throwProjectile();
      }
    }
  };

  // Between-wave timer
  useEffect(() => {
    if (gameState.betweenWaves && gameState.waveTimer > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, waveTimer: prev.waveTimer - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState.betweenWaves && gameState.waveTimer <= 0) {
      // Start next wave automatically
      setGameState(prev => ({
        ...prev,
        betweenWaves: false,
        waveTimer: 60,
        enemies: []
      }));
    }
  }, [gameState.betweenWaves, gameState.waveTimer]);

  // Enter key to start wave early
  useEffect(() => {
    const handleEnterKey = (event: KeyboardEvent) => {
      if (event.code === 'Enter' && gameState.betweenWaves) {
        setGameState(prev => ({
          ...prev,
          betweenWaves: false,
          waveTimer: 60,
          enemies: []
        }));
      }
    };
    
    window.addEventListener('keydown', handleEnterKey);
    return () => window.removeEventListener('keydown', handleEnterKey);
  }, [gameState.betweenWaves]);

  // Check win/lose conditions
  useEffect(() => {
    if (gameState.health <= 0) {
      setGameState(prev => ({ ...prev, gameOver: true }));
    }
    
    const aliveEnemies = gameState.enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0 && gameState.gameStarted && gameState.enemies.length > 0 && !gameState.betweenWaves) {
      // Start between-wave period
      setGameState(prev => ({
        ...prev,
        wave: prev.wave + 1,
        betweenWaves: true,
        waveTimer: 60
      }));
    }
  }, [gameState.enemies, gameState.health, gameState.gameStarted, gameState.betweenWaves]);

  if (!gameState.gameStarted) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">🦍 GORILLA WARFARE 🦍</h1>
          <p className="text-2xl text-green-200 mb-8">Tutorial Mode: Fight the AI Apes!</p>
          <p className="text-lg text-green-300 mb-8">
            Use WASD to move, move mouse to aim, click to throw exploding coconuts!
          </p>
          <button 
            onClick={startGame}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-lg text-2xl"
          >
            START BATTLE
          </button>
        </div>
      </div>
    );
  }

  if (gameState.gameOver) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-red-900 to-red-700 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">💀 GAME OVER 💀</h1>
          <p className="text-2xl text-red-200 mb-8">Final Score: {gameState.score}</p>
          <p className="text-lg text-red-300 mb-8">Wave Reached: {gameState.wave}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-2xl"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const aliveEnemies = gameState.enemies.filter(e => e.alive);



  // Shop items definition
  const shopItems = [
    // Basic Items
    { id: 'coconuts', name: '🥥 Coconut Launcher', price: 300, description: 'Unlock explosive coconut projectiles' },
    { id: 'health', name: '❤️ Health Pack', price: 120, description: 'Restore 50 health' },
    { id: 'coconut-ammo', name: '🥥 Coconut Ammo (10)', price: 80, description: '10 explosive coconuts' },
    
    // Stat Upgrades (Expensive)
    { id: 'speed', name: '🏃 Speed Boost', price: 400, description: 'Permanent movement speed increase (+20%)' },
    { id: 'damage', name: '⚔️ Damage Boost', price: 500, description: 'Increase all damage (+25 points)' },
    { id: 'blast-radius', name: '💥 Blast Radius', price: 600, description: 'Increase coconut explosion radius by 3 units' },
    { id: 'max-health', name: '💪 Max Health', price: 450, description: 'Increase maximum health by 25' },
    { id: 'attack-speed', name: '⚡ Attack Speed', price: 550, description: 'Increase attack speed by 25%' },
    { id: 'critical-chance', name: '🎯 Critical Chance', price: 700, description: 'Increase critical hit chance by 10%' },
    
    // Advanced Weapons (Very Expensive)
    { id: 'banana-boomerang', name: '🍌 Banana Boomerang', price: 800, description: 'Returning projectile weapon' },
    { id: 'pineapple-grenade', name: '🍍 Pineapple Grenade', price: 1000, description: 'High-damage area explosive' },
    { id: 'watermelon-cannon', name: '🍉 Watermelon Cannon', price: 1200, description: 'Heavy artillery weapon' },
    { id: 'durian', name: '🥭 Durian Bomb', price: 900, description: 'Stink bomb with area denial' },
    { id: 'vine-whip', name: '🌿 Vine Whip', price: 750, description: 'Melee weapon with extended reach' }
  ];

  const buyItem = (itemId: string, price: number) => {
    if (gameState.money >= price) {
      setGameState(prev => {
        const newState = { ...prev, money: prev.money - price };
        
        switch (itemId) {
          case 'coconuts':
            newState.weapons.coconuts = true;
            newState.coconuts = prev.coconuts + 5;
            break;
          case 'health':
            newState.health = Math.min(100, prev.health + 50);
            break;
          case 'coconut-ammo':
            newState.coconuts = prev.coconuts + 10;
            break;
          case 'speed':
            newState.perks.moveSpeed = prev.perks.moveSpeed + 0.2;
            break;
          case 'damage':
            newState.perks.baseDamage = prev.perks.baseDamage + 25;
            break;
          case 'blast-radius':
            newState.perks.blastRadius = prev.perks.blastRadius + 3;
            break;
          case 'max-health':
            newState.perks.maxHealth = prev.perks.maxHealth + 25;
            newState.health = Math.min(newState.perks.maxHealth, prev.health + 25);
            break;
          case 'attack-speed':
            newState.perks.attackSpeed = prev.perks.attackSpeed + 0.25;
            break;
          case 'critical-chance':
            newState.perks.criticalChance = prev.perks.criticalChance + 0.1;
            break;
          case 'banana-boomerang':
            newState.weapons.bananaBoomerang = true;
            newState.weapons.coconuts = true; // Auto-unlock coconut system
            if (newState.coconuts === 0) newState.coconuts = 5; // Give some ammo
            break;
          case 'pineapple-grenade':
            newState.weapons.pineappleGrenade = true;
            newState.weapons.coconuts = true; // Auto-unlock coconut system
            if (newState.coconuts === 0) newState.coconuts = 5; // Give some ammo
            break;
          case 'watermelon-cannon':
            newState.weapons.watermelonCannon = true;
            newState.weapons.coconuts = true; // Auto-unlock coconut system
            if (newState.coconuts === 0) newState.coconuts = 5; // Give some ammo
            break;
          case 'durian':
            newState.weapons.durian = true;
            newState.weapons.coconuts = true; // Auto-unlock coconut system
            if (newState.coconuts === 0) newState.coconuts = 5; // Give some ammo
            break;
          case 'vine-whip':
            newState.weapons.vineWhip = true;
            break;
        }
        
        return newState;
      });
    }
  };

  return (
    <div className="w-full h-screen relative">
      {/* Game UI */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg">
          <div>Health: {gameState.health}/100</div>
          <div>Score: {gameState.score}</div>
          <div>💰 Money: ${gameState.money}</div>
          <div>🥥 Coconuts: {gameState.coconuts}</div>
          <div>Wave: {gameState.wave}</div>
          <div>Enemies: {aliveEnemies.length}</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-white">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg">
          <div>WASD: Move</div>
          <div>Mouse: Look Around</div>
          <div>Click: {isPointerLocked ? 'Shoot Coconut' : 'Lock Mouse'}</div>
          <div>Space: {getCurrentMeleeWeapon() === 'vineWhip' ? '🌿 Vine Whip' : '🔪 Knife'} Attack</div>
          {isPointerLocked && <div className="text-green-400">Mouse Locked ✓</div>}
        </div>
      </div>

      {/* Between-wave overlay - positioned around edges */}
      {gameState.betweenWaves && (
        <>
          {/* Top banner */}
          <div className="absolute top-0 left-0 w-full bg-[rgba(0,0,0,0.5)] z-20 p-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">🛡️ WAVE {gameState.wave} COMPLETE! 🛡️</h1>
              <div className="text-xl text-blue-200">Next wave starts in: {gameState.waveTimer}s</div>
            </div>
          </div>
          
          {/* Left side panel */}
          <div className="absolute top-20 left-0 bg-black bg-opacity-80 z-20 p-4 rounded-r-lg">
            <div className="text-white">
              <div className="text-lg font-bold mb-2">💰 Resources</div>
              <div className="text-green-400">Money: ${gameState.money}</div>
              <div className="text-orange-400">Coconuts: {gameState.coconuts}</div>
            </div>
          </div>
          
          {/* Right side panel */}
          <div className="absolute top-20 right-0 bg-black bg-opacity-80 z-20 p-4 rounded-l-lg">
            <div className="text-white">
              <div className="text-lg font-bold mb-2">📊 Stats</div>
              <div className="text-green-400">Health: {gameState.health}/100</div>
              <div className="text-yellow-400">Score: {gameState.score}</div>
              <div className="text-purple-400">Speed: {gameState.perks.moveSpeed.toFixed(1)}x</div>
              <div className="text-red-400">Damage: {gameState.perks.baseDamage}</div>
              <div className="text-orange-400">Blast: {gameState.perks.blastRadius} units</div>
            </div>
          </div>
          
          {/* Bottom instructions */}
          <div className="absolute bottom-0 left-0 w-full bg-[rgba(0,0,0,0.5)] z-20 p-3">
            <div className="text-center text-white">
              <div className="text-lg mb-1">🏪 Walk to the shop (brown building) and press F to buy upgrades!</div>
              <div className="text-md text-blue-300">Press ENTER to start the next wave early</div>
            </div>
          </div>
        </>
      )}

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-4 h-4 border-2 border-white rounded-full opacity-50"></div>
      </div>

      {/* 3D Game Canvas */}
      <Canvas 
        camera={{ position: [8, 6, 12], fov: 75 }}
        onClick={handleCanvasClick}
        style={{ cursor: 'crosshair' }}
      >
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />
        
        <OptimizedDynamicTerrain 
          playerPosition={playerPosition}
          onShopInteract={() => setGameState(prev => ({ ...prev, shopOpen: true }))}
          seed={12345}
          chunkSize={16}  // Reduced from 50 to 16 for smaller, less obvious chunks
          renderRadius={4}  // Increased from 2 to 4 to maintain same total coverage
          isInTransition={isInShopTransition.current}
          collisionManager={collisionManager.current}
        />
        
        {collisionManager.current && (
          <EnhancedThirdPersonPlayer 
            position={playerPosition} 
            onMove={setPlayerPosition}
            cameraRotation={cameraRotation}
            gameState={gameState}
            collisionManager={collisionManager.current}
          />
        )}
        
        {collisionManager.current && pathfindingManager.current && aliveEnemies.map(enemy => (
          <EnhancedEnemy 
            key={enemy.id}
            enemy={enemy}
            playerPosition={playerPosition}
            onDamage={handleEnemyDamage}
            onPositionUpdate={handleEnemyPositionUpdate}
            collisionManager={collisionManager.current!}
            pathfindingManager={pathfindingManager.current!}
          />
        ))}
        
        {coconutProjectiles.map(coconut => (
          <AdvancedProjectile
            key={coconut.id}
            coconut={coconut}
            onHit={handleCoconutHit}
            playerPosition={playerPosition}
          />
        ))}
        
        {explosions.map(explosion => (
          <Explosion
            key={explosion.id}
            position={explosion.position}
            blastRadius={gameState.perks.blastRadius}
            onComplete={() => handleExplosionComplete(explosion.id)}
          />
        ))}
        
        {moneyDrops.map(money => (
          <MoneyDropComponent
            key={money.id}
            money={money}
            playerPosition={playerPosition}
            onCollect={handleMoneyCollect}
          />
        ))}
        
        {lootBoxes.map(lootBox => (
          <LootBoxComponent
            key={lootBox.id}
            lootBox={lootBox}
            playerPosition={playerPosition}
            onCollect={handleLootBoxCollect}
          />
        ))}
        
        {knifeAttacks.map(attack => (
          <KnifeAttackComponent
            key={attack.id}
            attack={attack}
            onComplete={handleKnifeAttackComplete}
            onHit={handleKnifeAttackHit}
          />
        ))}
        
        <FortniteMouseLook 
          playerPosition={playerPosition} 
          cameraRotation={cameraRotation}
          onCameraReady={handleCameraReady}
        />
        <Environment preset="forest" />
      </Canvas>

      {/* Shop UI Overlay */}
      {gameState.shopOpen && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900 to-amber-700 flex items-center justify-center z-30">
          <div className="bg-black bg-opacity-90 p-6 rounded-lg max-w-6xl w-full mx-4 h-[90vh] flex flex-col">
            <h1 className="text-4xl font-bold text-white mb-6 text-center">🏪 GORILLA SHOP 🏪</h1>
            <div className="text-2xl text-green-400 mb-6 text-center">💰 Money: ${gameState.money}</div>
            
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {shopItems.map(item => {
                const canAfford = gameState.money >= item.price;
                const alreadyOwned = item.id === 'coconuts' && gameState.weapons.coconuts;
                
                return (
                  <div key={item.id} className={`p-4 rounded-lg border-2 ${
                    alreadyOwned ? 'bg-green-800 border-green-600' :
                    canAfford ? 'bg-gray-800 border-green-500 hover:bg-gray-700 cursor-pointer' :
                    'bg-gray-900 border-red-500 opacity-50'
                  }`}
                  onClick={() => !alreadyOwned && canAfford && buyItem(item.id, item.price)}
                  >
                    <div className="text-xl font-bold text-white mb-2">{item.name}</div>
                    <div className="text-gray-300 mb-2">{item.description}</div>
                    <div className={`text-lg font-bold ${
                      alreadyOwned ? 'text-green-400' :
                      canAfford ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {alreadyOwned ? 'OWNED' : `$${item.price}`}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
            
            <div className="text-center">
              <button 
                onClick={() => {
                  setGameState(prev => ({ ...prev, shopOpen: false }));
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-xl"
              >
                Close Shop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
