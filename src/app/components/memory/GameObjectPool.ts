import { memoryManager } from './MemoryManager';

// Game entity interfaces
export interface Enemy {
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

export interface Projectile {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  explosive?: boolean;
  projectileType?: string;
}

export interface Explosion {
  id: string;
  position: [number, number, number];
  scale: number;
  life: number;
  maxLife: number;
}

export interface MoneyDrop {
  id: string;
  position: [number, number, number];
  value: number;
  collected: boolean;
  bobOffset: number;
  isBeingPulled: boolean;
}

export interface LootBox {
  id: string;
  position: [number, number, number];
  type: 'health' | 'speed' | 'damage' | 'coconuts' | 'money' | 'invincibility';
  collected: boolean;
  rotationSpeed: number;
}

export interface KnifeAttack {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  life: number;
  weaponType?: string;
}

// Pool configuration
interface PoolConfig {
  maxSize: number;
  preAllocate: number;
  cleanupThreshold: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxSize: 200,
  preAllocate: 50,
  cleanupThreshold: 150
};

export class GameObjectPool {
  private static instance: GameObjectPool;
  
  // Object pools
  private enemyPool = memoryManager.createObjectPool<Enemy>(
    () => this.createEnemy(),
    (enemy) => this.resetEnemy(enemy),
    DEFAULT_POOL_CONFIG.maxSize
  );
  
  private projectilePool = memoryManager.createObjectPool<Projectile>(
    () => this.createProjectile(),
    (projectile) => this.resetProjectile(projectile),
    DEFAULT_POOL_CONFIG.maxSize
  );
  
  private explosionPool = memoryManager.createObjectPool<Explosion>(
    () => this.createExplosion(),
    (explosion) => this.resetExplosion(explosion),
    100 // Explosions are short-lived
  );
  
  private moneyDropPool = memoryManager.createObjectPool<MoneyDrop>(
    () => this.createMoneyDrop(),
    (money) => this.resetMoneyDrop(money),
    150
  );
  
  private lootBoxPool = memoryManager.createObjectPool<LootBox>(
    () => this.createLootBox(),
    (lootBox) => this.resetLootBox(lootBox),
    50 // Fewer loot boxes
  );
  
  private knifeAttackPool = memoryManager.createObjectPool<KnifeAttack>(
    () => this.createKnifeAttack(),
    (attack) => this.resetKnifeAttack(attack),
    100
  );

  // Active object tracking
  private activeEnemies = new Map<string, Enemy>();
  private activeProjectiles = new Map<string, Projectile>();
  private activeExplosions = new Map<string, Explosion>();
  private activeMoneyDrops = new Map<string, MoneyDrop>();
  private activeLootBoxes = new Map<string, LootBox>();
  private activeKnifeAttacks = new Map<string, KnifeAttack>();

  // Performance tracking
  private lastCleanup = Date.now();
  private cleanupInterval = 10000; // 10 seconds
  private frameCounter = 0;

  private constructor() {
    // Register cleanup callback with memory manager
    memoryManager.registerCleanupCallback(() => this.performCleanup());
    
    // Register memory pressure callback
    memoryManager.registerMemoryPressureCallback((pressure) => {
      if (pressure > 0.7) {
        this.emergencyCleanup();
      }
    });

    // Pre-allocate some objects
    this.preAllocateObjects();
  }

  public static getInstance(): GameObjectPool {
    if (!GameObjectPool.instance) {
      GameObjectPool.instance = new GameObjectPool();
    }
    return GameObjectPool.instance;
  }

  // Pre-allocate objects to reduce runtime allocation
  private preAllocateObjects(): void {
    console.log('GameObjectPool: Pre-allocating objects...');
    
    // Pre-allocate and immediately release objects to populate pools
    const tempEnemies: Enemy[] = [];
    const tempProjectiles: Projectile[] = [];
    const tempExplosions: Explosion[] = [];
    
    for (let i = 0; i < DEFAULT_POOL_CONFIG.preAllocate; i++) {
      tempEnemies.push(this.enemyPool.get());
      tempProjectiles.push(this.projectilePool.get());
      tempExplosions.push(this.explosionPool.get());
    }
    
    // Release them back to pools
    tempEnemies.forEach(enemy => this.enemyPool.release(enemy));
    tempProjectiles.forEach(projectile => this.projectilePool.release(projectile));
    tempExplosions.forEach(explosion => this.explosionPool.release(explosion));
    
    console.log('GameObjectPool: Pre-allocation complete');
  }

  // Enemy management
  public createEnemyInstance(config: Partial<Enemy>): Enemy {
    const enemy = this.enemyPool.get();
    
    // Apply configuration
    Object.assign(enemy, {
      id: config.id || `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: config.position || [0, 0, 0],
      health: config.health || 100,
      type: config.type || 'ape',
      speed: config.speed || 5,
      alive: true,
      ...config
    });
    
    this.activeEnemies.set(enemy.id, enemy);
    return enemy;
  }

  public releaseEnemy(enemyId: string): void {
    const enemy = this.activeEnemies.get(enemyId);
    if (enemy) {
      this.activeEnemies.delete(enemyId);
      this.enemyPool.release(enemy);
    }
  }

  // Projectile management
  public createProjectileInstance(config: Partial<Projectile>): Projectile {
    const projectile = this.projectilePool.get();
    
    Object.assign(projectile, {
      id: config.id || `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: config.position || [0, 0, 0],
      velocity: config.velocity || [0, 0, 0],
      life: config.life || 3,
      explosive: config.explosive || false,
      projectileType: config.projectileType || 'coconuts',
      ...config
    });
    
    this.activeProjectiles.set(projectile.id, projectile);
    return projectile;
  }

  public releaseProjectile(projectileId: string): void {
    const projectile = this.activeProjectiles.get(projectileId);
    if (projectile) {
      this.activeProjectiles.delete(projectileId);
      this.projectilePool.release(projectile);
    }
  }

  // Explosion management
  public createExplosionInstance(config: Partial<Explosion>): Explosion {
    const explosion = this.explosionPool.get();
    
    Object.assign(explosion, {
      id: config.id || `explosion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: config.position || [0, 0, 0],
      scale: 0,
      life: config.life || 1,
      maxLife: config.life || 1,
      ...config
    });
    
    this.activeExplosions.set(explosion.id, explosion);
    return explosion;
  }

  public releaseExplosion(explosionId: string): void {
    const explosion = this.activeExplosions.get(explosionId);
    if (explosion) {
      this.activeExplosions.delete(explosionId);
      this.explosionPool.release(explosion);
    }
  }

  // Money drop management
  public createMoneyDropInstance(config: Partial<MoneyDrop>): MoneyDrop {
    const money = this.moneyDropPool.get();
    
    Object.assign(money, {
      id: config.id || `money_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: config.position || [0, 0, 0],
      value: config.value || 10,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      isBeingPulled: false,
      ...config
    });
    
    this.activeMoneyDrops.set(money.id, money);
    return money;
  }

  public releaseMoneyDrop(moneyId: string): void {
    const money = this.activeMoneyDrops.get(moneyId);
    if (money) {
      this.activeMoneyDrops.delete(moneyId);
      this.moneyDropPool.release(money);
    }
  }

  // Loot box management
  public createLootBoxInstance(config: Partial<LootBox>): LootBox {
    const lootBox = this.lootBoxPool.get();
    
    Object.assign(lootBox, {
      id: config.id || `lootbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: config.position || [0, 0, 0],
      type: config.type || 'health',
      collected: false,
      rotationSpeed: 1 + Math.random(),
      ...config
    });
    
    this.activeLootBoxes.set(lootBox.id, lootBox);
    return lootBox;
  }

  public releaseLootBox(lootBoxId: string): void {
    const lootBox = this.activeLootBoxes.get(lootBoxId);
    if (lootBox) {
      this.activeLootBoxes.delete(lootBoxId);
      this.lootBoxPool.release(lootBox);
    }
  }

  // Knife attack management
  public createKnifeAttackInstance(config: Partial<KnifeAttack>): KnifeAttack {
    const attack = this.knifeAttackPool.get();
    
    Object.assign(attack, {
      id: config.id || `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: config.position || [0, 0, 0],
      direction: config.direction || [0, 0, 1],
      life: config.life || 0.5,
      weaponType: config.weaponType || 'knife',
      ...config
    });
    
    this.activeKnifeAttacks.set(attack.id, attack);
    return attack;
  }

  public releaseKnifeAttack(attackId: string): void {
    const attack = this.activeKnifeAttacks.get(attackId);
    if (attack) {
      this.activeKnifeAttacks.delete(attackId);
      this.knifeAttackPool.release(attack);
    }
  }

  // Object factory methods
  private createEnemy(): Enemy {
    return {
      id: '',
      position: [0, 0, 0],
      health: 100,
      type: 'ape',
      speed: 5,
      alive: true
    };
  }

  private createProjectile(): Projectile {
    return {
      id: '',
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      life: 3
    };
  }

  private createExplosion(): Explosion {
    return {
      id: '',
      position: [0, 0, 0],
      scale: 0,
      life: 1,
      maxLife: 1
    };
  }

  private createMoneyDrop(): MoneyDrop {
    return {
      id: '',
      position: [0, 0, 0],
      value: 10,
      collected: false,
      bobOffset: 0,
      isBeingPulled: false
    };
  }

  private createLootBox(): LootBox {
    return {
      id: '',
      position: [0, 0, 0],
      type: 'health',
      collected: false,
      rotationSpeed: 1
    };
  }

  private createKnifeAttack(): KnifeAttack {
    return {
      id: '',
      position: [0, 0, 0],
      direction: [0, 0, 1],
      life: 0.5
    };
  }

  // Reset methods
  private resetEnemy(enemy: Enemy): void {
    enemy.id = '';
    enemy.position = [0, 0, 0];
    enemy.health = 100;
    enemy.type = 'ape';
    enemy.speed = 5;
    enemy.alive = true;
    enemy.lastSpecialAttack = undefined;
    enemy.isInvisible = undefined;
    enemy.chargeDirection = undefined;
    enemy.isCharging = undefined;
    enemy.targetPosition = undefined;
    enemy.healCooldown = undefined;
    enemy.jumpCooldown = undefined;
    enemy.climbHeight = undefined;
    enemy.sniperCooldown = undefined;
  }

  private resetProjectile(projectile: Projectile): void {
    projectile.id = '';
    projectile.position = [0, 0, 0];
    projectile.velocity = [0, 0, 0];
    projectile.life = 3;
    projectile.explosive = undefined;
    projectile.projectileType = undefined;
  }

  private resetExplosion(explosion: Explosion): void {
    explosion.id = '';
    explosion.position = [0, 0, 0];
    explosion.scale = 0;
    explosion.life = 1;
    explosion.maxLife = 1;
  }

  private resetMoneyDrop(money: MoneyDrop): void {
    money.id = '';
    money.position = [0, 0, 0];
    money.value = 10;
    money.collected = false;
    money.bobOffset = 0;
    money.isBeingPulled = false;
  }

  private resetLootBox(lootBox: LootBox): void {
    lootBox.id = '';
    lootBox.position = [0, 0, 0];
    lootBox.type = 'health';
    lootBox.collected = false;
    lootBox.rotationSpeed = 1;
  }

  private resetKnifeAttack(attack: KnifeAttack): void {
    attack.id = '';
    attack.position = [0, 0, 0];
    attack.direction = [0, 0, 1];
    attack.life = 0.5;
    attack.weaponType = undefined;
  }

  // Cleanup methods
  public performCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;

    console.log('GameObjectPool: Performing routine cleanup');
    
    // Clean up expired objects
    this.cleanupExpiredObjects();
    
    this.lastCleanup = now;
  }

  private cleanupExpiredObjects(): void {
    // Remove collected money drops
    for (const [id, money] of this.activeMoneyDrops) {
      if (money.collected) {
        this.releaseMoneyDrop(id);
      }
    }

    // Remove collected loot boxes
    for (const [id, lootBox] of this.activeLootBoxes) {
      if (lootBox.collected) {
        this.releaseLootBox(id);
      }
    }

    // Remove dead enemies
    for (const [id, enemy] of this.activeEnemies) {
      if (!enemy.alive) {
        this.releaseEnemy(id);
      }
    }
  }

  public emergencyCleanup(): void {
    console.warn('GameObjectPool: Emergency cleanup triggered due to memory pressure');
    
    // Aggressively clean up objects
    const maxActiveObjects = 50;
    
    // Limit active enemies
    if (this.activeEnemies.size > maxActiveObjects) {
      const enemyIds = Array.from(this.activeEnemies.keys());
      const toRemove = enemyIds.slice(maxActiveObjects);
      toRemove.forEach(id => this.releaseEnemy(id));
    }

    // Limit active projectiles
    if (this.activeProjectiles.size > maxActiveObjects) {
      const projectileIds = Array.from(this.activeProjectiles.keys());
      const toRemove = projectileIds.slice(maxActiveObjects);
      toRemove.forEach(id => this.releaseProjectile(id));
    }

    // Clear all explosions (they're short-lived anyway)
    for (const id of this.activeExplosions.keys()) {
      this.releaseExplosion(id);
    }
  }

  // Getters for active objects
  public getActiveEnemies(): Enemy[] {
    return Array.from(this.activeEnemies.values());
  }

  public getActiveProjectiles(): Projectile[] {
    return Array.from(this.activeProjectiles.values());
  }

  public getActiveExplosions(): Explosion[] {
    return Array.from(this.activeExplosions.values());
  }

  public getActiveMoneyDrops(): MoneyDrop[] {
    return Array.from(this.activeMoneyDrops.values());
  }

  public getActiveLootBoxes(): LootBox[] {
    return Array.from(this.activeLootBoxes.values());
  }

  public getActiveKnifeAttacks(): KnifeAttack[] {
    return Array.from(this.activeKnifeAttacks.values());
  }

  // Statistics
  public getStats(): {
    pools: Record<string, { total: number; available: number; inUse: number }>;
    active: Record<string, number>;
    memory: { totalObjects: number; memoryPressure: number };
  } {
    return {
      pools: {
        enemies: this.enemyPool.getStats(),
        projectiles: this.projectilePool.getStats(),
        explosions: this.explosionPool.getStats(),
        moneyDrops: this.moneyDropPool.getStats(),
        lootBoxes: this.lootBoxPool.getStats(),
        knifeAttacks: this.knifeAttackPool.getStats()
      },
      active: {
        enemies: this.activeEnemies.size,
        projectiles: this.activeProjectiles.size,
        explosions: this.activeExplosions.size,
        moneyDrops: this.activeMoneyDrops.size,
        lootBoxes: this.activeLootBoxes.size,
        knifeAttacks: this.activeKnifeAttacks.size
      },
      memory: {
        totalObjects: this.getTotalActiveObjects(),
        memoryPressure: memoryManager.getMemoryPressure()
      }
    };
  }

  private getTotalActiveObjects(): number {
    return this.activeEnemies.size + 
           this.activeProjectiles.size + 
           this.activeExplosions.size + 
           this.activeMoneyDrops.size + 
           this.activeLootBoxes.size + 
           this.activeKnifeAttacks.size;
  }

  // Dispose all pools
  public dispose(): void {
    this.enemyPool.dispose();
    this.projectilePool.dispose();
    this.explosionPool.dispose();
    this.moneyDropPool.dispose();
    this.lootBoxPool.dispose();
    this.knifeAttackPool.dispose();
    
    this.activeEnemies.clear();
    this.activeProjectiles.clear();
    this.activeExplosions.clear();
    this.activeMoneyDrops.clear();
    this.activeLootBoxes.clear();
    this.activeKnifeAttacks.clear();
  }
}

// Export singleton instance
export const gameObjectPool = GameObjectPool.getInstance();
