'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { CollisionManager } from '../collision/CollisionManager';
import { PathfindingManager, PathRequest, PathResult } from '../pathfinding/PathfindingManager';

interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  type: 'ape' | 'gorilla' | 'monkey' | 'acrobat' | 'berserker' | 'stealth' | 'bomber' | 'shaman' | 'leaper' | 'tank' | 'sniper' | 'trickster' | 'guardian' | 'scout';
  speed: number;
  alive: boolean;
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

interface EnhancedEnemyProps {
  enemy: Enemy;
  playerPosition: [number, number, number];
  onDamage: (enemyId: string) => void;
  onPositionUpdate: (enemyId: string, position: [number, number, number]) => void;
  collisionManager: CollisionManager;
  pathfindingManager: PathfindingManager;
}

export function EnhancedEnemy({ 
  enemy, 
  playerPosition, 
  onDamage, 
  onPositionUpdate,
  collisionManager,
  pathfindingManager
}: EnhancedEnemyProps) {
  const ref = useRef<THREE.Group>(null);
  const enemyPos = useRef([...enemy.position]);
  const lastAttack = useRef(0);
  const currentPath = useRef<[number, number][]>([]);
  const pathIndex = useRef(0);
  const lastPathRequest = useRef(0);
  const pathRequestCooldown = 200; // Request new path every 200ms (much more responsive)
  const enemyRadius = 0.4; // Enemy collision radius
  const lastPlayerPosition = useRef([...playerPosition]);
  
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

  // Get entity type for pathfinding
  const getEntityType = (): 'ground' | 'flying' | 'climbing' => {
    switch (enemy.type) {
      case 'acrobat':
      case 'sniper':
        return 'climbing';
      case 'scout':
        return 'flying'; // Scouts can move over some obstacles
      default:
        return 'ground';
    }
  };

  // Request a new path to the player
  const requestPathToPlayer = (forceRequest = false) => {
    const now = Date.now();
    if (!forceRequest && now - lastPathRequest.current < pathRequestCooldown) return;
    
    lastPathRequest.current = now;
    
    const pathRequest: PathRequest = {
      id: `${enemy.id}-${now}`,
      startX: enemyPos.current[0],
      startZ: enemyPos.current[2],
      goalX: playerPosition[0],
      goalZ: playerPosition[2],
      entityRadius: enemyRadius,
      maxDistance: 50,
      allowPartialPath: true,
      entityType: getEntityType()
    };

    const pathResult: PathResult = pathfindingManager.findPath(pathRequest);
    
    if (pathResult.found && pathResult.path.length > 1) {
      // Convert path to 2D coordinates (remove Y component)
      currentPath.current = pathResult.path.map(point => [point[0], point[1]] as [number, number]);
      pathIndex.current = 1; // Start from second point (first is current position)
    }
  };

  // Follow the current path
  const followPath = (delta: number) => {
    if (currentPath.current.length === 0 || pathIndex.current >= currentPath.current.length) {
      return false; // No path to follow
    }

    const targetPoint = currentPath.current[pathIndex.current];
    const dx = targetPoint[0] - enemyPos.current[0];
    const dz = targetPoint[1] - enemyPos.current[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.0) {
      // Reached current waypoint, move to next
      pathIndex.current++;
      return pathIndex.current < currentPath.current.length;
    }

    // Move towards current waypoint
    const speed = enemy.speed * delta;
    const moveX = (dx / distance) * speed;
    const moveZ = (dz / distance) * speed;

    // Try movement with sliding collision response
    let finalX = enemyPos.current[0];
    let finalZ = enemyPos.current[2];
    
    // Try X movement first
    if (Math.abs(moveX) > 0.001) {
      const testX = enemyPos.current[0] + moveX;
      const collisionX = collisionManager.checkCircleCollision(testX, enemyPos.current[2], enemyRadius);
      
      if (!collisionX.hit) {
        finalX = testX;
      } else if (collisionX.normal) {
        // Try sliding along the surface for X movement
        const slideFactorX = 1 - Math.abs(collisionX.normal[0]);
        const slideX = enemyPos.current[0] + moveX * slideFactorX * 0.7; // Reduce sliding speed
        
        // Verify the slide doesn't cause collision
        const slideTestX = collisionManager.checkCircleCollision(slideX, enemyPos.current[2], enemyRadius);
        if (!slideTestX.hit) {
          finalX = slideX;
        }
        // If sliding fails, we'll try alternative movement below
      }
    }
    
    // Try Z movement
    if (Math.abs(moveZ) > 0.001) {
      const testZ = enemyPos.current[2] + moveZ;
      const collisionZ = collisionManager.checkCircleCollision(finalX, testZ, enemyRadius);
      
      if (!collisionZ.hit) {
        finalZ = testZ;
      } else if (collisionZ.normal) {
        // Try sliding along the surface for Z movement
        const slideFactorZ = 1 - Math.abs(collisionZ.normal[2]);
        const slideZ = enemyPos.current[2] + moveZ * slideFactorZ * 0.7; // Reduce sliding speed
        
        // Verify the slide doesn't cause collision
        const slideTestZ = collisionManager.checkCircleCollision(finalX, slideZ, enemyRadius);
        if (!slideTestZ.hit) {
          finalZ = slideZ;
        }
        // If sliding fails, we'll try alternative movement below
      }
    }
    
    // Check if we made any progress
    const progressMade = Math.abs(finalX - enemyPos.current[0]) > 0.001 || 
                        Math.abs(finalZ - enemyPos.current[2]) > 0.001;
    
    if (progressMade) {
      // Apply the movement
      enemyPos.current[0] = finalX;
      enemyPos.current[2] = finalZ;
    } else {
      // No progress made, try alternative movement directions
      const alternativeDirections = [
        [moveX * 0.5, moveZ * -0.5], // Try diagonal movement
        [moveX * -0.5, moveZ * 0.5], // Try opposite diagonal
        [0, moveZ], // Try pure Z movement
        [moveX, 0], // Try pure X movement
      ];
      
      let alternativeWorked = false;
      for (const [altX, altZ] of alternativeDirections) {
        const altTestX = enemyPos.current[0] + altX;
        const altTestZ = enemyPos.current[2] + altZ;
        const altCollision = collisionManager.checkCircleCollision(altTestX, altTestZ, enemyRadius);
        
        if (!altCollision.hit) {
          enemyPos.current[0] = altTestX;
          enemyPos.current[2] = altTestZ;
          alternativeWorked = true;
          break;
        }
      }
      
      // If no alternative movement worked, request new path
      if (!alternativeWorked) {
        currentPath.current = [];
        pathIndex.current = 0;
      }
    }

    return true;
  };

  useFrame((state, delta) => {
    if (ref.current && enemy.alive) {
      const dx = playerPosition[0] - enemyPos.current[0];
      const dz = playerPosition[2] - enemyPos.current[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      const now = state.clock.elapsedTime;
      
      // Special behavior based on enemy type
      let usePathfinding = true;
      
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
            usePathfinding = false; // Don't use pathfinding when teleporting
          }
          // Drop down when close to player
          if (distance < 8 && enemyPos.current[1] > 2) {
            enemyPos.current[1] -= 15 * delta; // Fast drop
            usePathfinding = false;
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
            const newX = enemyPos.current[0] + behaviorState.current.chargeDirection[0] * chargeSpeed;
            const newZ = enemyPos.current[2] + behaviorState.current.chargeDirection[2] * chargeSpeed;
            
            // Check collision during charge
            const collision = collisionManager.checkCircleCollision(newX, newZ, enemyRadius);
            if (!collision.hit) {
              enemyPos.current[0] = newX;
              enemyPos.current[2] = newZ;
            } else {
              // Hit obstacle, stop charging
              behaviorState.current.isCharging = false;
            }
            
            // Stop charging after 2 seconds
            if (now - behaviorState.current.lastSpecialAttack > 2) {
              behaviorState.current.isCharging = false;
            }
            usePathfinding = false;
          }
          break;
          
        case 'stealth':
          // Becomes invisible periodically, ambush attacks
          if (now - behaviorState.current.lastSpecialAttack > 5) {
            behaviorState.current.isInvisible = !behaviorState.current.isInvisible;
            behaviorState.current.lastSpecialAttack = now;
          }
          if (behaviorState.current.isInvisible && distance > 3) {
            // Move faster when invisible, but still use pathfinding
            // Pathfinding will handle this with increased speed
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
            
            // Clear current path for jump
            currentPath.current = [];
            pathIndex.current = 0;
          }
          
          // Move toward jump target
          if (behaviorState.current.targetPosition) {
            const jumpDx = behaviorState.current.targetPosition[0] - enemyPos.current[0];
            const jumpDz = behaviorState.current.targetPosition[2] - enemyPos.current[2];
            const jumpDistance = Math.sqrt(jumpDx * jumpDx + jumpDz * jumpDz);
            if (jumpDistance > 0.5) {
              const jumpSpeed = enemy.speed * 2 * delta;
              const newX = enemyPos.current[0] + (jumpDx / jumpDistance) * jumpSpeed;
              const newZ = enemyPos.current[2] + (jumpDz / jumpDistance) * jumpSpeed;
              
              const collision = collisionManager.checkCircleCollision(newX, newZ, enemyRadius);
              if (!collision.hit) {
                enemyPos.current[0] = newX;
                enemyPos.current[2] = newZ;
              }
              usePathfinding = false;
            }
          }
          break;
          
        case 'sniper':
          // Long-range attacks, climbs to high positions
          behaviorState.current.climbHeight = Math.min(behaviorState.current.climbHeight + delta * 2, 6);
          enemyPos.current[1] = behaviorState.current.climbHeight;
          
          // Stay at distance
          if (distance < 20) {
            // Use pathfinding to move away from player
            usePathfinding = true;
          } else {
            usePathfinding = false; // Stay in position when at good range
          }
          break;
      }
      
      // Check if player has moved significantly since last path request
      const playerMoveDx = playerPosition[0] - lastPlayerPosition.current[0];
      const playerMoveDz = playerPosition[2] - lastPlayerPosition.current[2];
      const playerMoveDistance = Math.sqrt(playerMoveDx * playerMoveDx + playerMoveDz * playerMoveDz);
      
      // If player moved more than 3 units, force immediate path recalculation
      if (playerMoveDistance > 3) {
        lastPlayerPosition.current = [...playerPosition];
        currentPath.current = []; // Clear current path to force new one
        pathIndex.current = 0;
      }
      
      // Use pathfinding for most movement
      if (usePathfinding && distance > 1.5) {
        // Try to follow current path
        const followingPath = followPath(delta);
        
        // Request new path if not following one, path is old, or player moved significantly
        if (!followingPath || currentPath.current.length === 0 || playerMoveDistance > 3) {
          requestPathToPlayer(playerMoveDistance > 3); // Force request if player moved a lot
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
      
      {/* Debug collision visualization */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[enemyRadius - 0.1, enemyRadius, 16]} />
          <meshBasicMaterial color="blue" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Debug path visualization */}
      {process.env.NODE_ENV === 'development' && currentPath.current.length > 0 && (
        <group>
          {currentPath.current.map((point, index) => (
            <mesh key={index} position={[point[0] - enemyPos.current[0], 0.2, point[1] - enemyPos.current[2]]}>
              <sphereGeometry args={[0.1]} />
              <meshBasicMaterial color={index === pathIndex.current ? "yellow" : "green"} />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Special effects for certain types */}
      {enemy.type === 'berserker' && behaviorState.current.isCharging && (
        <Sphere args={[2]} position={[0, 1, 0]}>
          <meshBasicMaterial color="red" transparent opacity={0.3} />
        </Sphere>
      )}
    </group>
  );
}
