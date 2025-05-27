'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  Box, 
  Sphere, 
  Plane,
  Sky,
  Stars
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
  weapons: {
    knife: boolean;
    dualCoconuts: boolean;
    explosiveCoconuts: boolean;
    rapidFire: boolean;
  };
  perks: {
    healthBoost: number;
    speedBoost: number;
    magneticRange: number;
    damageMultiplier: number;
  };
}

interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  type: 'ape' | 'gorilla' | 'monkey';
  speed: number;
  alive: boolean;
}

interface Coconut {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  explosive?: boolean;
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
function ThirdPersonPlayer({ position, onMove, cameraRotation }: { 
  position: [number, number, number], 
  onMove: (pos: [number, number, number]) => void,
  cameraRotation: React.RefObject<{ theta: number, phi: number }>
}) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const playerPos = useRef(position);
  
  useFrame((state, delta) => {
    if (ref.current) {
      const keys = (window as any).gameKeys || {};
      const speed = 8 * delta;
      
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
      ref.current.position.set(...playerPos.current);
      onMove([...playerPos.current]);
      
      // Rotate player to face camera direction (not movement direction)
      if (cameraRotation.current) {
        ref.current.rotation.y = cameraRotation.current.theta;
      }
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Gorilla Body */}
      <Box args={[1, 2, 0.8]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      {/* Gorilla Head */}
      <Sphere args={[0.6]} position={[0, 2.2, 0]}>
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </Sphere>
      {/* Arms */}
      <Box args={[0.3, 1.5, 0.3]} position={[-0.8, 1, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      <Box args={[0.3, 1.5, 0.3]} position={[0.8, 1, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      {/* Legs */}
      <Box args={[0.4, 1, 0.4]} position={[-0.3, 0, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
      <Box args={[0.4, 1, 0.4]} position={[0.3, 0, 0]}>
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </Box>
    </group>
  );
}

// Simple Enemy Component
function SimpleEnemy({ enemy, playerPosition, onDamage, onPositionUpdate }: { 
  enemy: Enemy, 
  playerPosition: [number, number, number],
  onDamage: (enemyId: string) => void,
  onPositionUpdate: (enemyId: string, position: [number, number, number]) => void
}) {
  const ref = useRef<THREE.Group>(null);
  const enemyPos = useRef([...enemy.position]);
  const lastAttack = useRef(0);
  
  useFrame((state, delta) => {
    if (ref.current && enemy.alive) {
      // Simple AI - move toward player
      const dx = playerPosition[0] - enemyPos.current[0];
      const dz = playerPosition[2] - enemyPos.current[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 1.5) {
        // Move toward player
        const speed = enemy.speed * delta;
        enemyPos.current[0] += (dx / distance) * speed;
        enemyPos.current[2] += (dz / distance) * speed;
      } else {
        // Attack player if close enough
        const now = state.clock.elapsedTime;
        if (now - lastAttack.current > 1) { // Attack every 1 second
          onDamage(enemy.id);
          lastAttack.current = now;
        }
      }
      
      // Keep enemy on ground
      enemyPos.current[1] = 0;
      
      // Update position
      ref.current.position.set(...enemyPos.current);
      
      // Report current position back to parent
      onPositionUpdate(enemy.id, [enemyPos.current[0], enemyPos.current[1], enemyPos.current[2]]);
    }
  });

  if (!enemy.alive) return null;

  const color = enemy.type === 'ape' ? '#8B4513' : enemy.type === 'gorilla' ? '#2F2F2F' : '#CD853F';

  return (
    <group ref={ref} position={enemy.position}>
      {/* Enemy Body */}
      <Box args={[0.8, 1.6, 0.6]} position={[0, 0.8, 0]}>
        <meshStandardMaterial color={color} roughness={0.8} />
      </Box>
      {/* Enemy Head */}
      <Sphere args={[0.5]} position={[0, 1.8, 0]}>
        <meshStandardMaterial color={color} roughness={0.8} />
      </Sphere>
      {/* Health bar */}
      <Plane args={[1, 0.1]} position={[0, 2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="red" />
      </Plane>
      <Plane args={[enemy.health / 100, 0.1]} position={[0, 2.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="green" />
      </Plane>
    </group>
  );
}

// Simple Coconut Component
function SimpleCoconut({ coconut, onHit }: { 
  coconut: Coconut, 
  onHit: (coconutId: string, position: [number, number, number]) => void 
}) {
  const ref = useRef<THREE.Group>(null);
  const coconutPos = useRef([...coconut.position]);
  const life = useRef(coconut.life);
  
  useFrame((state, delta) => {
    if (ref.current) {
      // Update position
      coconutPos.current[0] += coconut.velocity[0] * delta;
      coconutPos.current[1] += coconut.velocity[1] * delta;
      coconutPos.current[2] += coconut.velocity[2] * delta;
      
      // Apply gravity
      coconut.velocity[1] -= 15 * delta;
      
      // Check if hit ground or expired
      life.current -= delta;
      if (coconutPos.current[1] <= 0 || life.current <= 0) {
        onHit(coconut.id, [...coconutPos.current]);
        return;
      }
      
      ref.current.position.set(...coconutPos.current);
    }
  });

  return (
    <group ref={ref} position={coconut.position}>
      <Sphere args={[0.2]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </Sphere>
    </group>
  );
}

// Simple Environment
function SimpleEnvironment() {
  // Memoize tree positions to prevent re-rendering
  const treePositions = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80,
      z: (Math.random() - 0.5) * 80
    }));
  }, []);

  return (
    <group>
      {/* Ground */}
      <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#228B22" roughness={0.8} />
      </Plane>
      
      {/* Trees */}
      {treePositions.map((tree) => (
        <group key={tree.id} position={[tree.x, 0, tree.z]}>
          <Box args={[1, 8, 1]} position={[0, 4, 0]}>
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </Box>
          <Sphere args={[3]} position={[0, 10, 0]}>
            <meshStandardMaterial color="#228B22" roughness={0.8} />
          </Sphere>
        </group>
      ))}
      
      {/* Waterfall */}
      <group position={[-20, 10, -20]}>
        <Box args={[0.5, 20, 0.5]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#87CEEB" transparent opacity={0.6} />
        </Box>
      </group>
      
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
}

// Money Drop Component
function MoneyDropComponent({ money, playerPosition, onCollect }: { 
  money: MoneyDrop, 
  playerPosition: [number, number, number],
  onCollect: (moneyId: string) => void 
}) {
  const ref = useRef<THREE.Group>(null);
  const bobOffset = useRef(Math.random() * Math.PI * 2);
  
  useFrame((state, delta) => {
    if (ref.current && !money.collected) {
      // Bobbing animation
      ref.current.position.y = money.position[1] + Math.sin(state.clock.elapsedTime * 3 + bobOffset.current) * 0.2;
      
      // Magnetic pull towards player
      const dx = playerPosition[0] - money.position[0];
      const dz = playerPosition[2] - money.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 5) { // Magnetic range
        const pullStrength = 0.1;
        money.position[0] += dx * pullStrength;
        money.position[2] += dz * pullStrength;
        
        if (distance < 1) {
          onCollect(money.id);
        }
      }
      
      // Rotation
      ref.current.rotation.y += delta * 2;
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

// Knife Attack Component
function KnifeAttackComponent({ attack, onComplete }: { 
  attack: KnifeAttack, 
  onComplete: (attackId: string) => void 
}) {
  const ref = useRef<THREE.Group>(null);
  const life = useRef(attack.life);
  
  useFrame((state, delta) => {
    if (ref.current) {
      life.current -= delta;
      if (life.current <= 0) {
        onComplete(attack.id);
        return;
      }
      
      // Move knife attack forward
      ref.current.position.x += attack.direction[0] * delta * 10;
      ref.current.position.z += attack.direction[2] * delta * 10;
      
      // Fade out
      const opacity = life.current / attack.life;
      if (ref.current.children[0]) {
        (ref.current.children[0] as any).material.opacity = opacity;
      }
    }
  });

  return (
    <group ref={ref} position={attack.position}>
      <Box args={[0.1, 0.5, 2]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#C0C0C0" transparent />
      </Box>
    </group>
  );
}

// Explosion Effect
function Explosion({ position, onComplete }: { position: [number, number, number], onComplete: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const scale = useRef(0);
  
  useFrame((state, delta) => {
    if (ref.current) {
      scale.current += delta * 8;
      if (scale.current > 2) {
        onComplete();
        return;
      }
      ref.current.scale.setScalar(scale.current);
    }
  });

  return (
    <group ref={ref} position={position}>
      <Sphere args={[2]} position={[0, 0, 0]}>
        <meshBasicMaterial color="orange" transparent opacity={0.7} />
      </Sphere>
    </group>
  );
}

// Main Game Component
export default function Game() {
  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    score: 0,
    coconuts: 10,
    money: 0,
    enemies: [],
    gameStarted: false,
    gameOver: false,
    wave: 1,
    betweenWaves: false,
    weapons: {
      knife: true,
      dualCoconuts: false,
      explosiveCoconuts: false,
      rapidFire: false
    },
    perks: {
      healthBoost: 0,
      speedBoost: 0,
      magneticRange: 3,
      damageMultiplier: 1
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

  // Player position ref to get current position
  const playerPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  
  // Update player position ref whenever position changes
  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  // Knife attack function
  const performKnifeAttack = () => {
    const now = Date.now();
    if (now - lastKnifeAttack.current < 500) return; // 500ms cooldown
    
    lastKnifeAttack.current = now;
    
    if (cameraRef.current) {
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      
      const currentPlayerPos = playerPositionRef.current;
      
      const newKnifeAttack: KnifeAttack = {
        id: `knife-${now}`,
        position: [currentPlayerPos[0], currentPlayerPos[1] + 1, currentPlayerPos[2]],
        direction: [direction.x, direction.y, direction.z],
        life: 0.5
      };
      
      setKnifeAttacks(prev => [...prev, newKnifeAttack]);
      
      // Check for immediate hits on nearby enemies
      setGameState(prev => ({
        ...prev,
        enemies: prev.enemies.map(enemy => {
          if (!enemy.alive) return enemy;
          
          const currentPos = enemyPositions[enemy.id] || enemy.position;
          const dx = currentPos[0] - currentPlayerPos[0];
          const dz = currentPos[2] - currentPlayerPos[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < 3) { // Knife range
            const newHealth = enemy.health - 75; // High knife damage
            if (newHealth <= 0) {
              // Drop money when enemy dies
              const moneyValue = 50 + Math.floor(Math.random() * 50);
              const newMoney: MoneyDrop = {
                id: `money-${enemy.id}-${now}`,
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
            performKnifeAttack();
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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
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
        
        newEnemies.push({
          id: `enemy-${gameState.wave}-${i}`,
          position: [
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
          ],
          health: 100,
          type: ['ape', 'gorilla', 'monkey'][Math.floor(Math.random() * 3)] as 'ape' | 'gorilla' | 'monkey',
          speed: 3 + Math.random() * 2,
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
  };

  const throwCoconut = () => {
    if (gameState.coconuts > 0 && cameraRef.current) {
      // Get the actual camera direction vector
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      
      // Scale the direction and add some upward arc
      const velocity = [
        direction.x * 20,
        direction.y * 20 + 5, // Add upward arc
        direction.z * 20
      ];
      
      const newCoconut: Coconut = {
        id: `coconut-${Date.now()}`,
        position: [playerPosition[0], playerPosition[1] + 2, playerPosition[2]],
        velocity: velocity,
        life: 3
      };
      
      setCoconutProjectiles(prev => [...prev, newCoconut]);
      setGameState(prev => ({ ...prev, coconuts: prev.coconuts - 1 }));
    }
  };

  const handleCoconutHit = (coconutId: string, position: [number, number, number]) => {
    // Create explosion
    setExplosions(prev => [...prev, { id: `explosion-${Date.now()}`, position }]);
    
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
        
        if (distance < 5) {
          const newHealth = enemy.health - 50;
          if (newHealth <= 0) {
            // Drop money when enemy dies from coconut
            const moneyValue = 50 + Math.floor(Math.random() * 50);
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
            return { ...prev, perks: { ...prev.perks, speedBoost: prev.perks.speedBoost + 1 } };
          case 'damage':
            return { ...prev, perks: { ...prev.perks, damageMultiplier: prev.perks.damageMultiplier + 0.5 } };
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
        // Shoot coconut if already locked
        throwCoconut();
      }
    }
  };

  // Check win/lose conditions
  useEffect(() => {
    if (gameState.health <= 0) {
      setGameState(prev => ({ ...prev, gameOver: true }));
    }
    
    const aliveEnemies = gameState.enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0 && gameState.gameStarted && gameState.enemies.length > 0) {
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          wave: prev.wave + 1,
          coconuts: prev.coconuts + 5,
          enemies: []
        }));
      }, 2000);
    }
  }, [gameState.enemies, gameState.health, gameState.gameStarted]);

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
          <div>Space: Knife Attack</div>
          {isPointerLocked && <div className="text-green-400">Mouse Locked ✓</div>}
        </div>
      </div>

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
        
        <SimpleEnvironment />
        
        <ThirdPersonPlayer 
          position={[0, 0, 0]} 
          onMove={setPlayerPosition}
          cameraRotation={cameraRotation}
        />
        
        {aliveEnemies.map(enemy => (
          <SimpleEnemy 
            key={enemy.id}
            enemy={enemy}
            playerPosition={playerPosition}
            onDamage={handleEnemyDamage}
            onPositionUpdate={handleEnemyPositionUpdate}
          />
        ))}
        
        {coconutProjectiles.map(coconut => (
          <SimpleCoconut
            key={coconut.id}
            coconut={coconut}
            onHit={handleCoconutHit}
          />
        ))}
        
        {explosions.map(explosion => (
          <Explosion
            key={explosion.id}
            position={explosion.position}
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
          />
        ))}
        
        <FortniteMouseLook 
          playerPosition={playerPosition} 
          cameraRotation={cameraRotation}
          onCameraReady={handleCameraReady}
        />
        <Environment preset="forest" />
      </Canvas>
    </div>
  );
}
