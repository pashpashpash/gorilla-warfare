'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Environment, 
  Box, 
  Sphere, 
  Plane,
  Sky
} from '@react-three/drei';
import * as THREE from 'three';

// Import performance and memory management systems
import { memoryManager } from './memory/MemoryManager';
import { performanceOptimizer, PerformanceMetrics, QualitySettings } from './memory/PerformanceOptimizer';
import { gameObjectPool } from './memory/GameObjectPool';

// Import optimized components
import OptimizedDynamicTerrain from './terrain/OptimizedDynamicTerrain';
import { CollisionManager } from './collision/CollisionManager';
import { PathfindingManager } from './pathfinding/PathfindingManager';
import { EnhancedThirdPersonPlayer } from './player/EnhancedThirdPersonPlayer';
import { EnhancedEnemy } from './enemies/EnhancedEnemy';

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

// Performance Monitor Component
function PerformanceMonitor({ onPerformanceUpdate }: { 
  onPerformanceUpdate: (metrics: PerformanceMetrics) => void 
}) {
  useFrame(() => {
    // Skip frame if performance optimizer says so
    if (performanceOptimizer.shouldSkipFrame()) {
      return;
    }
    
    // Update performance metrics
    const metrics = performanceOptimizer.getMetrics();
    onPerformanceUpdate(metrics);
  });
  
  return null;
}

// Memory-managed Projectile Component
function OptimizedProjectile({ coconut, onHit, playerPosition }: { 
  coconut: Coconut, 
  onHit: (coconutId: string, position: [number, number, number]) => void,
  playerPosition: [number, number, number]
}) {
  const ref = useRef<THREE.Group>(null);
  const coconutPos = useRef<[number, number, number]>([...coconut.position]);
  const life = useRef(coconut.life);
  const originalLife = useRef(coconut.life);
  const isReturning = useRef(false);
  
  // Register with memory manager
  useEffect(() => {
    if (ref.current) {
      memoryManager.trackObject(ref.current, 'projectile');
    }
    return () => {
      if (ref.current) {
        memoryManager.untrackObject(ref.current);
      }
    };
  }, []);
  
  useFrame((state: any, delta: number) => {
    if (ref.current) {
      const projectileType = coconut.projectileType || 'coconuts';
      
      // Banana boomerang special behavior
      if (projectileType === 'bananaBoomerang') {
        const lifeProgress = 1 - (life.current / originalLife.current);
        
        if (lifeProgress > 0.4 && !isReturning.current) {
          isReturning.current = true;
        }
        
        if (isReturning.current) {
          const dx = playerPosition[0] - coconutPos.current[0];
          const dy = playerPosition[1] + 1 - coconutPos.current[1];
          const dz = playerPosition[2] - coconutPos.current[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance > 0) {
            const returnSpeed = 30;
            coconut.velocity[0] = (dx / distance) * returnSpeed;
            coconut.velocity[1] = (dy / distance) * returnSpeed + 5;
            coconut.velocity[2] = (dz / distance) * returnSpeed;
          }
          
          if (distance < 3) {
            onHit(coconut.id, coconutPos.current as [number, number, number]);
            return;
          }
        }
        
        ref.current.rotation.x += delta * 15;
        ref.current.rotation.z += delta * 10;
      }
      
      // Update position
      coconutPos.current[0] += coconut.velocity[0] * delta;
      coconutPos.current[1] += coconut.velocity[1] * delta;
      coconutPos.current[2] += coconut.velocity[2] * delta;
      
      // Apply gravity
      const gravityMultiplier = (projectileType === 'bananaBoomerang' && isReturning.current) ? 0.3 : 1;
      coconut.velocity[1] -= 15 * delta * gravityMultiplier;
      
      // Check if hit ground or expired
      life.current -= delta;
      if (coconutPos.current[1] <= 0 || life.current <= 0) {
        onHit(coconut.id, coconutPos.current as [number, number, number]);
        return;
      }
      
      ref.current.position.set(coconutPos.current[0], coconutPos.current[1], coconutPos.current[2]);
    }
  });

  // Note: appearance pooling is handled at a higher level; no direct pool access here

  return (
    <group ref={ref} position={coconut.position}>
      <Sphere args={[0.2]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </Sphere>
    </group>
  );
}

// Memory-managed Money Drop Component
function OptimizedMoneyDrop({ money, playerPosition, onCollect }: { 
  money: MoneyDrop, 
  playerPosition: [number, number, number],
  onCollect: (moneyId: string) => void 
}) {
  const ref = useRef<THREE.Group>(null);
  const bobOffset = useRef(Math.random() * Math.PI * 2);
  const isBeingPulled = useRef(false);
  
  // Register with memory manager
  useEffect(() => {
    if (ref.current) {
      memoryManager.trackObject(ref.current, 'money');
    }
    return () => {
      if (ref.current) {
        memoryManager.untrackObject(ref.current);
      }
    };
  }, []);
  
  useFrame((state: any, delta: number) => {
    if (ref.current && !money.collected) {
      const dx = playerPosition[0] - money.position[0];
      const dz = playerPosition[2] - money.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 6 || isBeingPulled.current) {
        isBeingPulled.current = true;
        
        const moveSpeed = Math.min(0.8, 5 / Math.max(distance, 0.1)) * delta * 60;
        const directionX = dx / Math.max(distance, 0.001);
        const directionZ = dz / Math.max(distance, 0.001);
        
        money.position[0] += directionX * moveSpeed;
        money.position[2] += directionZ * moveSpeed;
        
        if (distance < 0.8) {
          onCollect(money.id);
          return;
        }
      }
      
      ref.current.position.set(money.position[0], money.position[1], money.position[2]);
      
      const bobIntensity = isBeingPulled.current ? 0.1 : 0.2;
      ref.current.position.y = money.position[1] + Math.sin(state.clock.elapsedTime * 3 + bobOffset.current) * bobIntensity;
      
      const rotationSpeed = isBeingPulled.current ? 8 : 2;
      ref.current.rotation.y += delta * rotationSpeed;
      
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
      {isBeingPulled.current && (
        <Sphere args={[0.8]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#00FF00" transparent opacity={0.2} />
        </Sphere>
      )}
    </group>
  );
}

// Explosion Effect with Memory Management
function OptimizedExplosion({ position, blastRadius, onComplete }: { 
  position: [number, number, number], 
  blastRadius: number, 
  onComplete: () => void 
}) {
  const ref = useRef<THREE.Group>(null);
  const scale = useRef(0);
  
  // Register with memory manager
  useEffect(() => {
    if (ref.current) {
      memoryManager.trackObject(ref.current, 'explosion');
    }
    return () => {
      if (ref.current) {
        memoryManager.untrackObject(ref.current);
      }
    };
  }, []);
  
  const animationSpeed = 8 / (blastRadius / 5);
  const maxScale = 1.5 + (blastRadius / 10);
  
  useFrame((state: any, delta: number) => {
    if (ref.current) {
      scale.current += delta * animationSpeed;
      if (scale.current > maxScale) {
        onComplete();
        return;
      }
      ref.current.scale.setScalar(scale.current);
      
      const fadeProgress = scale.current / maxScale;
      const opacity = fadeProgress < 0.7 ? 0.8 : 0.8 * (1 - (fadeProgress - 0.7) / 0.3);
      if (ref.current.children[0]) {
        const material = (ref.current.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = opacity;
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

 // Melee Attack Component (Knife)
function KnifeAttackComponent({ attack, onComplete, onHit }: {
  attack: KnifeAttack,
  onComplete: (attackId: string) => void,
  onHit: (attackId: string, position: [number, number, number]) => void
}) {
  const ref = useRef<THREE.Group>(null);
  const life = useRef(attack.life);

  useFrame((state: any, delta: number) => {
    if (!ref.current) return;
    life.current -= delta;
    if (life.current <= 0) {
      onComplete(attack.id);
      return;
    }
    // advance forward and fade
    ref.current.position.x += attack.direction[0] * delta * 15;
    ref.current.position.y += attack.direction[1] * delta * 15;
    ref.current.position.z += attack.direction[2] * delta * 15;

    // report current position for hit detection
    const currentPos: [number, number, number] = [
      ref.current.position.x,
      ref.current.position.y,
      ref.current.position.z
    ];
    onHit(attack.id, currentPos);

    const opacity = Math.max(0, life.current / attack.life);
    ref.current.children.forEach((child: any) => {
      if (child.material) child.material.opacity = opacity;
    });
  });

  return (
    <group ref={ref} position={attack.position}>
      <Box args={[0.1, 0.5, 2]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#C0C0C0" transparent />
      </Box>
    </group>
  );
}

// Camera component with performance optimization
function OptimizedCamera({ playerPosition, cameraRotation, onCameraReady }: { 
  playerPosition: [number, number, number],
  cameraRotation: React.RefObject<{ theta: number, phi: number }>,
  onCameraReady: (camera: THREE.Camera) => void
}) {
  const { camera } = useThree();
  const spherical = useRef(new THREE.Spherical(10, Math.PI / 2, 0));
  
  useEffect(() => {
    onCameraReady(camera);
  }, [camera, onCameraReady]);
  
  useFrame(() => {
    // Skip frame if performance optimizer says so
    if (performanceOptimizer.shouldSkipFrame()) {
      return;
    }
    
    if (cameraRotation.current) {
      spherical.current.theta = cameraRotation.current.theta;
      spherical.current.phi = cameraRotation.current.phi;
      
      const offset = new THREE.Vector3();
      offset.setFromSpherical(spherical.current);
      
      camera.position.set(
        playerPosition[0] + offset.x,
        playerPosition[1] + offset.y,
        playerPosition[2] + offset.z
      );
      
      camera.lookAt(playerPosition[0], playerPosition[1] + 1, playerPosition[2]);
    }
  });
  
  return null;
}

// Safe spawn position utility
function findSafeSpawnPosition(
  collisionManager: CollisionManager,
  preferredPosition: [number, number, number],
  entityRadius: number = 0.4,
  maxSearchRadius: number = 20,
  playerPosition: [number, number, number] = [0, 0, 0],
  minPlayerDistance: number = 8
): [number, number, number] {
  const collision = collisionManager.checkCircleCollision(
    preferredPosition[0], 
    preferredPosition[2], 
    entityRadius
  );
  
  const playerDx = preferredPosition[0] - playerPosition[0];
  const playerDz = preferredPosition[2] - playerPosition[2];
  const playerDistance = Math.sqrt(playerDx * playerDx + playerDz * playerDz);
  
  if (!collision.hit && playerDistance >= minPlayerDistance) {
    return preferredPosition;
  }
  
  for (let radius = 1; radius <= maxSearchRadius; radius += 1) {
    const searchPoints = Math.max(8, radius * 4);
    
    for (let i = 0; i < searchPoints; i++) {
      const angle = (i / searchPoints) * Math.PI * 2;
      const testX = preferredPosition[0] + Math.cos(angle) * radius;
      const testZ = preferredPosition[2] + Math.sin(angle) * radius;
      
      const testCollision = collisionManager.checkCircleCollision(testX, testZ, entityRadius);
      
      const testPlayerDx = testX - playerPosition[0];
      const testPlayerDz = testZ - playerPosition[2];
      const testPlayerDistance = Math.sqrt(testPlayerDx * testPlayerDx + testPlayerDz * testPlayerDz);
      
      if (!testCollision.hit && testPlayerDistance >= minPlayerDistance) {
        return [testX, preferredPosition[1], testZ];
      }
    }
  }
  
  console.warn('Could not find safe spawn position, using original position');
  return preferredPosition;
}

// Main Optimized Game Component
export default function OptimizedGame() {
  // Performance state
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    objectCount: 0,
    renderCalls: 0,
    lastUpdate: Date.now()
  });
  const [qualitySettings, setQualitySettings] = useState<QualitySettings>(performanceOptimizer.getQualitySettings());
  
  // Managers
  const collisionManager = useRef<CollisionManager | null>(null);
  const pathfindingManager = useRef<PathfindingManager | null>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    score: 0,
    coconuts: 0,
    money: 50,
    enemies: [],
    gameStarted: false,
    gameOver: false,
    wave: 1,
    betweenWaves: false,
    waveTimer: 60,
    shopOpen: false,
    weapons: {
      knife: true,
      coconuts: false,
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

  // Game objects
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [coconutProjectiles, setCoconutProjectiles] = useState<Coconut[]>([]);
  const [explosions, setExplosions] = useState<{ id: string, position: [number, number, number] }[]>([]);
  const [enemyPositions, setEnemyPositions] = useState<{ [key: string]: [number, number, number] }>({});
  const [moneyDrops, setMoneyDrops] = useState<MoneyDrop[]>([]);
  const [lootBoxes, setLootBoxes] = useState<LootBox[]>([]);
  const [knifeAttacks, setKnifeAttacks] = useState<KnifeAttack[]>([]);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Camera and input
  const cameraRotation = useRef({ theta: 0, phi: Math.PI / 2 });
  const cameraRef = useRef<THREE.Camera | null>(null);
  const lastKnifeAttack = useRef(0);
  const playerPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const savedPlayerPosition = useRef<[number, number, number]>([0, 0, 0]);
  const savedCameraRotation = useRef({ theta: 0, phi: Math.PI / 2 });
  const isInShopTransition = useRef(false);

  // Initialize performance monitoring
  useEffect(() => {
    // Register performance callbacks
    performanceOptimizer.onQualityChange((newSettings) => {
      setQualitySettings(newSettings);
      console.log('Quality settings updated:', newSettings);
    });

    performanceOptimizer.onPerformanceWarning((metrics) => {
      console.warn('Performance warning:', metrics);
    });

    // Register memory pressure callback
    memoryManager.registerMemoryPressureCallback((pressure) => {
      if (pressure > 0.8) {
        console.warn('High memory pressure detected:', pressure);
        // Trigger emergency cleanup
        setCoconutProjectiles(prev => prev.slice(0, Math.floor(prev.length * 0.5)));
        setExplosions(prev => prev.slice(0, Math.floor(prev.length * 0.5)));
        setMoneyDrops(prev => prev.slice(0, Math.floor(prev.length * 0.7)));
      }
    });

    return () => {
      performanceOptimizer.dispose();
      memoryManager.forceCleanup();
    };
  }, []);

  // Initialize managers
  useEffect(() => {
    if (!collisionManager.current) {
      collisionManager.current = new CollisionManager();
    }
    if (!pathfindingManager.current && collisionManager.current) {
      pathfindingManager.current = new PathfindingManager(collisionManager.current);
    }
  }, []);

  // Update player position ref
  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  // Reset transient maps/lists on wave change and prune collected items
  useEffect(() => {
    // Clear enemy position cache when wave increments
    setEnemyPositions({});
    // Prune collected loot/money and cap list sizes to prevent unbounded growth
    setMoneyDrops(prev => prev.filter(m => !m.collected).slice(-100));
    setLootBoxes(prev => prev.filter(l => !l.collected).slice(-20));
  }, [gameState.wave]);

  // Also clear enemy position cache whenever enemies list is emptied (between waves)
  useEffect(() => {
    if (gameState.enemies.length === 0) {
      setEnemyPositions({});
    }
  }, [gameState.enemies.length]);

  // Periodic housekeeping to keep arrays bounded during long sessions
  useEffect(() => {
    const interval = setInterval(() => {
      setMoneyDrops(prev => prev.filter(m => !m.collected).slice(-100));
      setLootBoxes(prev => prev.filter(l => !l.collected).slice(-20));
      setExplosions(prev => prev.slice(-50));
      setKnifeAttacks(prev => prev.slice(-15));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Wave completion -> start between-waves timer and increment wave
  useEffect(() => {
    const alive = gameState.enemies.filter(e => e.alive);
    if (
      alive.length === 0 &&
      gameState.gameStarted &&
      gameState.enemies.length > 0 &&
      !gameState.betweenWaves
    ) {
      setGameState(prev => ({
        ...prev,
        wave: prev.wave + 1,
        betweenWaves: true,
        waveTimer: 60
      }));
    }
  }, [gameState.enemies, gameState.gameStarted, gameState.betweenWaves]);

  // Between-wave timer countdown and auto start next wave
  useEffect(() => {
    if (gameState.betweenWaves && gameState.waveTimer > 0) {
      const t = setTimeout(() => {
        setGameState(prev => ({ ...prev, waveTimer: prev.waveTimer - 1 }));
      }, 1000);
      return () => clearTimeout(t);
    } else if (gameState.betweenWaves && gameState.waveTimer <= 0) {
      setGameState(prev => ({
        ...prev,
        betweenWaves: false,
        waveTimer: 60,
        enemies: []
      }));
    }
  }, [gameState.betweenWaves, gameState.waveTimer]);

  // Enter to start next wave early
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && gameState.betweenWaves) {
        setGameState(prev => ({
          ...prev,
          betweenWaves: false,
          waveTimer: 60,
          enemies: []
        }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState.betweenWaves]);

  // Lose condition
  useEffect(() => {
    if (gameState.health <= 0 && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
    }
  }, [gameState.health, gameState.gameOver]);

  // Pointer lock and mouse movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isPointerLocked) {
        const sensitivity = 0.002;
        cameraRotation.current.theta -= event.movementX * sensitivity;
        cameraRotation.current.phi -= event.movementY * sensitivity;
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

  // Release pointer lock when shop opens, restore when it closes
  useEffect(() => {
    if (gameState.shopOpen) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      // small delay for React overlay unmount etc.
      setTimeout(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) canvas.requestPointerLock();
      }, 100);
    }
  }, [gameState.shopOpen]);

  // Keyboard movement state sharing for EnhancedThirdPersonPlayer
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
          keys.space = true;
          event.preventDefault();
          if (gameState.weapons.knife && gameState.gameStarted && !gameState.gameOver) {
            performMeleeAttack();
          }
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
  }, [isPointerLocked]);

  // Performance-based enemy limiting
  const getMaxEnemies = useCallback(() => {
    return Math.min(qualitySettings.maxEnemies, gameState.wave + 2);
  }, [qualitySettings.maxEnemies, gameState.wave]);

  // Performance-based projectile limiting
  const getMaxProjectiles = useCallback(() => {
    return qualitySettings.maxProjectiles;
  }, [qualitySettings.maxProjectiles]);

  // Handle performance updates
  const handlePerformanceUpdate = useCallback((metrics: PerformanceMetrics) => {
    setPerformanceMetrics(metrics);
    
    // Emergency cleanup if performance is critical
    if (metrics.fps < 15 || metrics.memoryUsage > 400) {
      console.warn('Critical performance detected, emergency cleanup');
      
      // Reduce active objects
      setCoconutProjectiles(prev => prev.slice(0, Math.floor(prev.length * 0.3)));
      setExplosions(prev => prev.slice(0, Math.floor(prev.length * 0.3)));
      setMoneyDrops(prev => prev.slice(0, Math.floor(prev.length * 0.5)));
      
      // Force garbage collection if available
      const w = window as any;
      if (w.gc) {
        w.gc();
      }
    }
  }, []);

  // Initialize enemies with performance limits
  useEffect(() => {
    if (gameState.gameStarted && gameState.enemies.length === 0) {
      const maxEnemies = getMaxEnemies();
      const newEnemies: Enemy[] = [];
      
      for (let i = 0; i < maxEnemies; i++) {
        const angle = (i / maxEnemies) * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        
        const availableTypes: Enemy['type'][] = ['ape', 'gorilla', 'monkey'];
        
        if (gameState.wave >= 3) availableTypes.push('acrobat', 'berserker');
        if (gameState.wave >= 5) availableTypes.push('stealth', 'bomber');
        if (gameState.wave >= 7) availableTypes.push('shaman', 'leaper');
        if (gameState.wave >= 10) availableTypes.push('tank', 'sniper');
        if (gameState.wave >= 12) availableTypes.push('trickster', 'guardian');
        if (gameState.wave >= 15) availableTypes.push('scout');
        
        const enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        const baseHealth = 80 + (gameState.wave - 1) * 20;
        let enemyHealth = baseHealth;
        
        if (enemyType === 'monkey') enemyHealth *= 0.8;
        else if (enemyType === 'gorilla') enemyHealth *= 1.5;
        
        const preferredPosition: [number, number, number] = [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ];
        
        const safePosition = collisionManager.current 
          ? findSafeSpawnPosition(
              collisionManager.current,
              preferredPosition,
              0.4,
              20,
              playerPositionRef.current,
              8
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
    }
  }, [gameState.gameStarted, gameState.enemies.length, gameState.wave, getMaxEnemies]);

  // Projectile limiting
  useEffect(() => {
    const maxProjectiles = getMaxProjectiles();
    if (coconutProjectiles.length > maxProjectiles) {
      setCoconutProjectiles(prev => prev.slice(-maxProjectiles));
    }
  }, [coconutProjectiles.length, getMaxProjectiles]);

  // Start game
  const startGame = () => {
    setGameState(prev => ({ ...prev, gameStarted: true }));
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.requestPointerLock();
      }
    }, 100);
  };

  // Throw projectile with performance limits
  const throwProjectile = () => {
    if (gameState.weapons.coconuts && gameState.coconuts > 0 && cameraRef.current) {
      // Check projectile limit
      if (coconutProjectiles.length >= getMaxProjectiles()) {
        console.log('Projectile limit reached, removing oldest');
        setCoconutProjectiles(prev => prev.slice(1));
      }
      
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      
      const currentWeapon = 'coconuts'; // Simplified for now
      const velocity: [number, number, number] = [
        direction.x * 20, 
        direction.y * 20 + 5, 
        direction.z * 20
      ];
      
      const newProjectile: Coconut = {
        id: `${currentWeapon}-${Date.now()}`,
        position: [playerPosition[0], playerPosition[1] + 2, playerPosition[2]],
        velocity: velocity,
        life: 3,
        projectileType: currentWeapon
      };
      
      setCoconutProjectiles(prev => [...prev, newProjectile]);
      setGameState(prev => ({ ...prev, coconuts: prev.coconuts - 1 }));
    }
  };

  // Melee attack (knife)
  const performMeleeAttack = () => {
    const now = Date.now();
    const cooldown = 500; // ms
    if (now - lastKnifeAttack.current < cooldown) return;
    if (!cameraRef.current) return;

    lastKnifeAttack.current = now;

    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);

    const startPos = [
      playerPositionRef.current[0],
      playerPositionRef.current[1] + 1,
      playerPositionRef.current[2]
    ] as [number, number, number];

    const newAttack: KnifeAttack = {
      id: `knife-${now}`,
      position: startPos,
      direction: [direction.x, direction.y, direction.z],
      life: 0.5,
      weaponType: 'knife'
    };

    setKnifeAttacks(prev => [...prev, newAttack]);

    // Immediate AoE damage around player at attack start
    setGameState(prev => ({
      ...prev,
      enemies: prev.enemies.map(enemy => {
        if (!enemy.alive) return enemy;
        const currentPos = enemyPositions[enemy.id] || enemy.position;
        const dx = currentPos[0] - playerPositionRef.current[0];
        const dz = currentPos[2] - playerPositionRef.current[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < 3.0) {
          const baseDamage = 75;
          const actualDamage = baseDamage * (prev.perks.baseDamage / 50);
          const newHealth = enemy.health - actualDamage;
          if (newHealth <= 0) {
            const baseMoneyValue = 15 + Math.floor(Math.random() * 10);
            const waveBonus = prev.wave * 2;
            const moneyValue = baseMoneyValue + waveBonus;
            const newMoney: MoneyDrop = {
              id: `money-knife-${enemy.id}-${now}-${Math.random().toString(36).substr(2, 9)}`,
              position: [currentPos[0], (currentPos as any)[1] + 1 || 1, currentPos[2]],
              value: moneyValue,
              collected: false
            };
            setMoneyDrops(prevM => [...prevM, newMoney]);
            return { ...enemy, health: 0, alive: false };
          }
          return { ...enemy, health: newHealth };
        }
        return enemy;
      })
    }));
  };

  const handleKnifeAttackComplete = (attackId: string) => {
    setKnifeAttacks(prev => prev.filter(k => k.id !== attackId));
  };

  const handleKnifeAttackHit = (attackId: string, position: [number, number, number]) => {
    // Check for hits on enemies at the knife position and remove the attack on hit
    setGameState(prev => ({
      ...prev,
      enemies: prev.enemies.map(enemy => {
        if (!enemy.alive) return enemy;

        const currentPos = enemyPositions[enemy.id] || enemy.position;
        const dx = currentPos[0] - position[0];
        const dz = currentPos[2] - position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < 3) { // knife hit range
          const baseDamage = 75;
          const actualDamage = baseDamage * (prev.perks.baseDamage / 50);
          const newHealth = enemy.health - actualDamage;
          if (newHealth <= 0) {
            const baseMoneyValue = 15 + Math.floor(Math.random() * 10);
            const waveBonus = prev.wave * 2;
            const moneyValue = baseMoneyValue + waveBonus;
            const newMoney: MoneyDrop = {
              id: `money-knife-${enemy.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: [currentPos[0], (currentPos as any)[1] + 1 || 1, currentPos[2]],
              value: moneyValue,
              collected: false
            };
            setMoneyDrops(prevM => [...prevM, newMoney]);
            // Remove the knife attack after a successful kill
            setKnifeAttacks(prevK => prevK.filter(k => k.id !== attackId));
            return { ...enemy, health: 0, alive: false };
          }
          // Remove the knife attack after any successful hit
          setKnifeAttacks(prevK => prevK.filter(k => k.id !== attackId));
          return { ...enemy, health: newHealth };
        }
        return enemy;
      })
    }));
  };

  // Handle coconut hit
  const handleCoconutHit = (coconutId: string, position: [number, number, number]) => {
    const explosionId = `explosion-${coconutId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setExplosions(prev => [...prev, { id: explosionId, position }]);
    
    setGameState(prev => ({
      ...prev,
      enemies: prev.enemies.map(enemy => {
        if (!enemy.alive) return enemy;
        
        const currentPos = enemyPositions[enemy.id] || enemy.position;
        const distance = Math.sqrt(
          Math.pow(currentPos[0] - position[0], 2) +
          Math.pow(currentPos[2] - position[2], 2)
        );
        
        if (distance < prev.perks.blastRadius) {
          const baseDamage = 50;
          const actualDamage = baseDamage * (gameState.perks.baseDamage / 50);
          const newHealth = enemy.health - actualDamage;
          if (newHealth <= 0) {
            const baseMoneyValue = 15 + Math.floor(Math.random() * 10);
            const waveBonus = gameState.wave * 2;
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
    
    setCoconutProjectiles(prev => prev.filter(c => c.id !== coconutId));
  };

  // Handle enemy damage
  const handleEnemyDamage = () => {
    setGameState(prev => {
      const newHealth = Math.max(0, prev.health - 10);
      return {
        ...prev,
        health: newHealth,
        gameOver: prev.gameOver || newHealth <= 0
      };
    });
  };

  // Handle enemy position update
  const handleEnemyPositionUpdate = (enemyId: string, position: [number, number, number]) => {
    setEnemyPositions(prev => ({ ...prev, [enemyId]: position }));
  };

  // Handle explosion complete
  const handleExplosionComplete = (explosionId: string) => {
    setExplosions(prev => prev.filter(e => e.id !== explosionId));
  };

  // Handle money collect
  const handleMoneyCollect = (moneyId: string) => {
    const money = moneyDrops.find(m => m.id === moneyId);
    if (money && !money.collected) {
      setGameState(prev => ({ ...prev, money: prev.money + money.value }));
      setMoneyDrops(prev => prev.map(m => m.id === moneyId ? { ...m, collected: true } : m));
    }
  };

  // Handle camera ready
  const handleCameraReady = (camera: THREE.Camera) => {
    cameraRef.current = camera;
  };

  // Handle canvas click
  const handleCanvasClick = () => {
    if (gameState.gameStarted && !gameState.gameOver) {
      if (!isPointerLocked) {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.requestPointerLock();
        }
      } else {
        throwProjectile();
      }
    }
  };

  // Shop items and buying logic
  const shopItems = [
    { id: 'coconuts', name: '🥥 Coconut Launcher', price: 300, description: 'Unlock explosive coconut projectiles' },
    { id: 'health', name: '❤️ Health Pack', price: 120, description: 'Restore 50 health' },
    { id: 'coconut-ammo', name: '🥥 Coconut Ammo (10)', price: 80, description: '10 explosive coconuts' },
    { id: 'speed', name: '🏃 Speed Boost', price: 400, description: 'Permanent movement speed increase (+20%)' },
    { id: 'damage', name: '⚔️ Damage Boost', price: 500, description: 'Increase all damage (+25 points)' },
    { id: 'blast-radius', name: '💥 Blast Radius', price: 600, description: 'Increase coconut explosion radius by 3 units' },
    { id: 'max-health', name: '💪 Max Health', price: 450, description: 'Increase maximum health by 25' },
    { id: 'attack-speed', name: '⚡ Attack Speed', price: 550, description: 'Increase attack speed by 25%' },
    { id: 'critical-chance', name: '🎯 Critical Chance', price: 700, description: 'Increase critical hit chance by 10%' },
    { id: 'banana-boomerang', name: '🍌 Banana Boomerang', price: 800, description: 'Returning projectile weapon' },
    { id: 'pineapple-grenade', name: '🍍 Pineapple Grenade', price: 1000, description: 'High-damage area explosive' },
    { id: 'watermelon-cannon', name: '🍉 Watermelon Cannon', price: 1200, description: 'Heavy artillery weapon' },
    { id: 'durian', name: '🥭 Durian Bomb', price: 900, description: 'Stink bomb with area denial' },
    { id: 'vine-whip', name: '🌿 Vine Whip', price: 750, description: 'Melee weapon with extended reach' }
  ] as const;

  const buyItem = (itemId: string, price: number) => {
    setGameState(prev => {
      if (prev.money < price) return prev;
      const newState = { ...prev, money: prev.money - price };
      switch (itemId) {
        case 'coconuts':
          newState.weapons.coconuts = true;
          newState.coconuts = prev.coconuts + 5;
          break;
        case 'health':
          newState.health = Math.min(prev.perks.maxHealth, prev.health + 50);
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
          newState.weapons.coconuts = true;
          if (newState.coconuts === 0) newState.coconuts = 5;
          break;
        case 'pineapple-grenade':
          newState.weapons.pineappleGrenade = true;
          newState.weapons.coconuts = true;
          if (newState.coconuts === 0) newState.coconuts = 5;
          break;
        case 'watermelon-cannon':
          newState.weapons.watermelonCannon = true;
          newState.weapons.coconuts = true;
          if (newState.coconuts === 0) newState.coconuts = 5;
          break;
        case 'durian':
          newState.weapons.durian = true;
          newState.weapons.coconuts = true;
          if (newState.coconuts === 0) newState.coconuts = 5;
          break;
        case 'vine-whip':
          newState.weapons.vineWhip = true;
          break;
      }
      return newState;
    });
  };

  // UI and rendering
  const aliveEnemies = gameState.enemies.filter(e => e.alive);

  if (!gameState.gameStarted) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">🦍 GORILLA WARFARE 🦍</h1>
          <p className="text-2xl text-green-200 mb-8">Tutorial Mode: Fight the AI Apes!</p>
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

  return (
    <div className="w-full h-screen relative">
      {/* HUD */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg">
          <div>Health: {gameState.health}/{gameState.perks.maxHealth}</div>
          <div>Score: {gameState.score}</div>
          <div>💰 Money: ${gameState.money}</div>
          <div>🥥 Coconuts: {gameState.coconuts}</div>
          <div>Wave: {gameState.wave}</div>
          <div>Enemies: {aliveEnemies.length}</div>
        </div>
      </div>

      {/* Between-wave overlay */}
      {gameState.betweenWaves && (
        <>
          <div className="absolute top-0 left-0 w-full bg-[rgba(0,0,0,0.6)] z-20 p-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-1">Wave {gameState.wave - 1} complete</h1>
              <div className="text-lg text-blue-200">Next wave starts in: {gameState.waveTimer}s (Press Enter to start early)</div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full bg-[rgba(0,0,0,0.5)] z-20 p-3">
            <div className="text-center text-white">
              <div className="text-lg mb-1">Walk to the shop (brown building) and press F to buy upgrades</div>
            </div>
          </div>
        </>
      )}

      {/* Shop UI Overlay */}
      {gameState.shopOpen && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900 to-amber-700 flex items-center justify-center z-30">
          <div className="bg-black bg-opacity-90 p-6 rounded-lg max-w-6xl w-full mx-4 h-[90vh] flex flex-col">
            <h1 className="text-3xl font-bold text-white mb-4 text-center">🏪 Gorilla Shop</h1>
            <div className="text-xl text-green-400 mb-4 text-center">💰 Money: ${gameState.money}</div>

            <div className="flex-1 overflow-y-auto mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {shopItems.map(item => {
                  const canAfford = gameState.money >= item.price;
                  const alreadyOwned =
                    (item.id === 'coconuts' && gameState.weapons.coconuts) ||
                    (item.id === 'banana-boomerang' && gameState.weapons.bananaBoomerang) ||
                    (item.id === 'pineapple-grenade' && gameState.weapons.pineappleGrenade) ||
                    (item.id === 'watermelon-cannon' && gameState.weapons.watermelonCannon) ||
                    (item.id === 'durian' && gameState.weapons.durian) ||
                    (item.id === 'vine-whip' && gameState.weapons.vineWhip);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 ${
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
                onClick={() => setGameState(prev => ({ ...prev, shopOpen: false }))}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                Close Shop
              </button>
            </div>
          </div>
        </div>
      )}

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
          chunkSize={16}
          renderRadius={4}
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
            onDamage={() => setGameState(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }))}
            onPositionUpdate={(id, pos) => setEnemyPositions(prev => ({ ...prev, [id]: pos }))}
            collisionManager={collisionManager.current!}
            pathfindingManager={pathfindingManager.current!}
          />
        ))}

        {coconutProjectiles.map(coconut => (
          <OptimizedProjectile
            key={coconut.id}
            coconut={coconut}
            onHit={handleCoconutHit}
            playerPosition={playerPosition}
          />
        ))}

        {explosions.map(explosion => (
          <OptimizedExplosion
            key={explosion.id}
            position={explosion.position}
            blastRadius={gameState.perks.blastRadius}
            onComplete={() => setExplosions(prev => prev.filter(e => e.id !== explosion.id))}
          />
        ))}

        {moneyDrops.map(money => (
          <OptimizedMoneyDrop
            key={money.id}
            money={money}
            playerPosition={playerPosition}
            onCollect={handleMoneyCollect}
          />
        ))}

        {knifeAttacks.map(attack => (
          <KnifeAttackComponent
            key={attack.id}
            attack={attack}
            onComplete={() => handleKnifeAttackComplete(attack.id)}
            onHit={(id, pos) => handleKnifeAttackHit(id, pos)}
          />
        ))}

        <OptimizedCamera 
          playerPosition={playerPosition} 
          cameraRotation={cameraRotation}
          onCameraReady={(cam) => { cameraRef.current = cam; }}
        />
        <PerformanceMonitor onPerformanceUpdate={handlePerformanceUpdate} />
        <Environment preset="forest" />
      </Canvas>
    </div>
  );
}
