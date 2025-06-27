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
  
  useFrame((state, delta) => {
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
            onHit(coconut.id, [...coconutPos.current]);
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
        onHit(coconut.id, [...coconutPos.current]);
        return;
      }
      
      ref.current.position.set(coconutPos.current[0], coconutPos.current[1], coconutPos.current[2]);
    }
  });

  // Get projectile appearance from object pool
  const getProjectileObject = useCallback(() => {
    const projectileType = coconut.projectileType || 'coconuts';
    return gameObjectPool.getObject('projectile', projectileType);
  }, [coconut.projectileType]);

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
  
  useFrame((state, delta) => {
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
  
  useFrame((state, delta) => {
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
      memoryManager.cleanup();
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
      if (window.gc) {
        window.gc();
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
    setGameState(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }));
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

  //
