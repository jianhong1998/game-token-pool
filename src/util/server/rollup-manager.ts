import {
  MAGICBLOCK_API_KEY,
  MAGICBLOCK_ROLLUP_ENDPOINT,
  ROLLUP_AUTO_PROVISION,
  ROLLUP_MAX_INSTANCES,
  ROLLUP_SESSION_TIMEOUT,
} from '@/constants';
import { EndpointManager } from './endpoint-manager';
import { HealthChecker } from './health-checker';
import { ConnectionPool } from './connection-pool';
import { EndpointType } from '@/types/enhanced-connection.types';

export interface RollupInstance {
  id: string;
  gameId: string;
  endpoint: string;
  status: 'provisioning' | 'active' | 'scaling' | 'terminating' | 'failed';
  createdAt: Date;
  lastActivity: Date;
  playerCount: number;
  maxPlayers: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  metadata: Record<string, unknown>;
}

export interface RollupProvisioningRequest {
  gameId: string;
  maxPlayers: number;
  gameType?: string;
  priority?: 'low' | 'medium' | 'high';
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface RollupScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetPlayerUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

export class RollupManager {
  private endpointManager: EndpointManager;
  private healthChecker: HealthChecker;
  private connectionPool: ConnectionPool;
  private rollupInstances: Map<string, RollupInstance> = new Map();
  private scalingConfig: RollupScalingConfig;
  private provisioningQueue: RollupProvisioningRequest[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private scalingInterval: NodeJS.Timeout | null = null;
  private static instance: RollupManager;

  private constructor(
    endpointManager: EndpointManager,
    healthChecker: HealthChecker,
    connectionPool: ConnectionPool,
  ) {
    this.endpointManager = endpointManager;
    this.healthChecker = healthChecker;
    this.connectionPool = connectionPool;
    
    this.scalingConfig = {
      minInstances: 1,
      maxInstances: parseInt(ROLLUP_MAX_INSTANCES) || 10,
      targetPlayerUtilization: 0.8,
      scaleUpThreshold: 0.9,
      scaleDownThreshold: 0.3,
      cooldownPeriod: 300000, // 5 minutes
    };

    this.startBackgroundProcesses();
  }

  public static getInstance(
    endpointManager: EndpointManager,
    healthChecker: HealthChecker,
    connectionPool: ConnectionPool,
  ): RollupManager {
    if (!RollupManager.instance) {
      RollupManager.instance = new RollupManager(endpointManager, healthChecker, connectionPool);
    }
    return RollupManager.instance;
  }

  private startBackgroundProcesses(): void {
    // Start cleanup process
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // Run every minute

    // Start scaling process
    this.scalingInterval = setInterval(() => {
      this.performAutoScaling();
    }, 30000); // Run every 30 seconds
  }

  public async provisionRollup(request: RollupProvisioningRequest): Promise<RollupInstance | null> {
    try {
      console.log(`[RollupManager] Provisioning rollup for game ${request.gameId}`);

      // Check if rollup already exists for this game
      const existingRollup = this.getRollupByGameId(request.gameId);
      if (existingRollup && existingRollup.status === 'active') {
        console.log(`[RollupManager] Rollup already exists for game ${request.gameId}`);
        return existingRollup;
      }

      // Check capacity limits
      if (!this.canProvisionNewRollup()) {
        console.warn(`[RollupManager] Cannot provision rollup - capacity limit reached`);
        this.provisioningQueue.push(request);
        return null;
      }

      // Create rollup instance
      const rollupInstance = await this.createRollupInstance(request);
      
      if (rollupInstance) {
        this.rollupInstances.set(rollupInstance.id, rollupInstance);
        
        // Register endpoint with endpoint manager
        const endpointId = this.endpointManager.addRollupEndpoint(
          request.gameId,
          rollupInstance.endpoint,
        );

        // Update instance metadata
        rollupInstance.metadata.endpointId = endpointId;
        
        console.log(`[RollupManager] Successfully provisioned rollup ${rollupInstance.id} for game ${request.gameId}`);
        return rollupInstance;
      }

      return null;
    } catch (error) {
      console.error(`[RollupManager] Failed to provision rollup for game ${request.gameId}:`, error);
      return null;
    }
  }

  private async createRollupInstance(request: RollupProvisioningRequest): Promise<RollupInstance | null> {
    // Generate unique rollup ID
    const rollupId = this.generateRollupId(request.gameId);
    
    // In a real implementation, this would make API calls to MagicBlock
    // For now, we create a mock rollup instance
    const mockEndpoint = this.generateMockEndpoint(request.gameId);
    
    const rollupInstance: RollupInstance = {
      id: rollupId,
      gameId: request.gameId,
      endpoint: mockEndpoint,
      status: 'provisioning',
      createdAt: new Date(),
      lastActivity: new Date(),
      playerCount: 0,
      maxPlayers: request.maxPlayers,
      resourceUsage: {
        cpu: 10, // Mock initial resource usage
        memory: 20,
        network: 5,
      },
      metadata: {
        gameType: request.gameType || 'unknown',
        priority: request.priority || 'medium',
        resources: request.resources || {},
        ...request.metadata,
      },
    };

    // Simulate provisioning delay
    setTimeout(() => {
      if (this.rollupInstances.has(rollupId)) {
        const instance = this.rollupInstances.get(rollupId)!;
        instance.status = 'active';
        this.rollupInstances.set(rollupId, instance);
        console.log(`[RollupManager] Rollup ${rollupId} is now active`);
      }
    }, 2000);

    return rollupInstance;
  }

  private generateRollupId(gameId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `rollup-${gameId}-${timestamp}-${random}`;
  }

  private generateMockEndpoint(gameId: string): string {
    // In production, this would be provided by MagicBlock API
    const baseEndpoint = MAGICBLOCK_ROLLUP_ENDPOINT || 'https://rollup.magicblock.app';
    return `${baseEndpoint}/game/${gameId}`;
  }

  private canProvisionNewRollup(): boolean {
    const activeRollups = Array.from(this.rollupInstances.values())
      .filter(r => r.status === 'active' || r.status === 'scaling');
    
    return activeRollups.length < this.scalingConfig.maxInstances;
  }

  public async terminateRollup(gameId: string): Promise<boolean> {
    try {
      const rollupInstance = this.getRollupByGameId(gameId);
      if (!rollupInstance) {
        console.warn(`[RollupManager] No rollup found for game ${gameId}`);
        return false;
      }

      console.log(`[RollupManager] Terminating rollup ${rollupInstance.id} for game ${gameId}`);

      // Mark as terminating
      rollupInstance.status = 'terminating';
      this.rollupInstances.set(rollupInstance.id, rollupInstance);

      // Remove from endpoint manager
      this.endpointManager.removeRollupEndpoint(gameId);

      // Clean up health checker
      if (rollupInstance.metadata.endpointId) {
        this.healthChecker.removeEndpoint(rollupInstance.metadata.endpointId as string);
      }

      // Close connections
      await this.connectionPool.closeAllConnections(`rollup-${gameId}`);

      // In a real implementation, this would make API calls to MagicBlock to terminate the rollup
      setTimeout(() => {
        this.rollupInstances.delete(rollupInstance.id);
        console.log(`[RollupManager] Rollup ${rollupInstance.id} terminated successfully`);
      }, 1000);

      return true;
    } catch (error) {
      console.error(`[RollupManager] Failed to terminate rollup for game ${gameId}:`, error);
      return false;
    }
  }

  public updatePlayerCount(gameId: string, playerCount: number): void {
    const rollupInstance = this.getRollupByGameId(gameId);
    if (rollupInstance) {
      rollupInstance.playerCount = playerCount;
      rollupInstance.lastActivity = new Date();
      this.rollupInstances.set(rollupInstance.id, rollupInstance);
    }
  }

  public getRollupByGameId(gameId: string): RollupInstance | null {
    for (const instance of this.rollupInstances.values()) {
      if (instance.gameId === gameId) {
        return instance;
      }
    }
    return null;
  }

  public getAllRollups(): RollupInstance[] {
    return Array.from(this.rollupInstances.values());
  }

  public getActiveRollups(): RollupInstance[] {
    return Array.from(this.rollupInstances.values())
      .filter(r => r.status === 'active');
  }

  private async performAutoScaling(): Promise<void> {
    if (!ROLLUP_AUTO_PROVISION || ROLLUP_AUTO_PROVISION !== 'true') {
      return;
    }

    try {
      const activeRollups = this.getActiveRollups();
      
      // Check if we need to scale up
      const overloadedRollups = activeRollups.filter(rollup => {
        const utilization = rollup.playerCount / rollup.maxPlayers;
        return utilization >= this.scalingConfig.scaleUpThreshold;
      });

      if (overloadedRollups.length > 0 && this.canProvisionNewRollup()) {
        console.log(`[RollupManager] Scaling up: ${overloadedRollups.length} rollups are overloaded`);
        // In a real implementation, we would provision additional rollups or scale existing ones
      }

      // Check if we need to scale down
      const underutilizedRollups = activeRollups.filter(rollup => {
        const utilization = rollup.playerCount / rollup.maxPlayers;
        const timeSinceActivity = Date.now() - rollup.lastActivity.getTime();
        return utilization <= this.scalingConfig.scaleDownThreshold && 
               timeSinceActivity > this.scalingConfig.cooldownPeriod;
      });

      if (underutilizedRollups.length > this.scalingConfig.minInstances) {
        console.log(`[RollupManager] Scaling down: ${underutilizedRollups.length} rollups are underutilized`);
        // In a real implementation, we would terminate excess rollups
      }
    } catch (error) {
      console.error('[RollupManager] Auto-scaling error:', error);
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      const now = new Date();
      const sessionTimeout = parseInt(ROLLUP_SESSION_TIMEOUT) || 3600000; // 1 hour default

      for (const [instanceId, rollup] of this.rollupInstances.entries()) {
        const timeSinceActivity = now.getTime() - rollup.lastActivity.getTime();

        // Clean up stale rollups
        if (timeSinceActivity > sessionTimeout) {
          console.log(`[RollupManager] Cleaning up stale rollup ${instanceId} (inactive for ${timeSinceActivity}ms)`);
          await this.terminateRollup(rollup.gameId);
        }

        // Clean up failed rollups
        if (rollup.status === 'failed') {
          console.log(`[RollupManager] Cleaning up failed rollup ${instanceId}`);
          this.rollupInstances.delete(instanceId);
        }
      }

      // Process provisioning queue
      await this.processProvisioningQueue();
    } catch (error) {
      console.error('[RollupManager] Cleanup error:', error);
    }
  }

  private async processProvisioningQueue(): Promise<void> {
    while (this.provisioningQueue.length > 0 && this.canProvisionNewRollup()) {
      const request = this.provisioningQueue.shift();
      if (request) {
        await this.provisionRollup(request);
      }
    }
  }

  public getStatistics(): {
    totalRollups: number;
    activeRollups: number;
    provisioningRollups: number;
    terminatingRollups: number;
    failedRollups: number;
    queuedRequests: number;
    totalPlayers: number;
    averageUtilization: number;
    resourceUsage: {
      totalCpu: number;
      totalMemory: number;
      totalNetwork: number;
    };
  } {
    const rollups = Array.from(this.rollupInstances.values());
    
    const byStatus = {
      active: rollups.filter(r => r.status === 'active').length,
      provisioning: rollups.filter(r => r.status === 'provisioning').length,
      terminating: rollups.filter(r => r.status === 'terminating').length,
      failed: rollups.filter(r => r.status === 'failed').length,
    };

    const totalPlayers = rollups.reduce((sum, r) => sum + r.playerCount, 0);
    const totalCapacity = rollups.reduce((sum, r) => sum + r.maxPlayers, 0);
    const averageUtilization = totalCapacity > 0 ? totalPlayers / totalCapacity : 0;

    const resourceUsage = rollups.reduce(
      (acc, r) => ({
        totalCpu: acc.totalCpu + r.resourceUsage.cpu,
        totalMemory: acc.totalMemory + r.resourceUsage.memory,
        totalNetwork: acc.totalNetwork + r.resourceUsage.network,
      }),
      { totalCpu: 0, totalMemory: 0, totalNetwork: 0 }
    );

    return {
      totalRollups: rollups.length,
      activeRollups: byStatus.active,
      provisioningRollups: byStatus.provisioning,
      terminatingRollups: byStatus.terminating,
      failedRollups: byStatus.failed,
      queuedRequests: this.provisioningQueue.length,
      totalPlayers,
      averageUtilization,
      resourceUsage,
    };
  }

  public updateScalingConfig(config: Partial<RollupScalingConfig>): void {
    this.scalingConfig = { ...this.scalingConfig, ...config };
  }

  public getScalingConfig(): RollupScalingConfig {
    return { ...this.scalingConfig };
  }

  public shutdown(): void {
    console.log('[RollupManager] Shutting down...');
    
    // Stop background processes
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }

    // Terminate all rollups (in production, this should be graceful)
    const activeRollups = this.getActiveRollups();
    Promise.all(
      activeRollups.map(rollup => this.terminateRollup(rollup.gameId))
    ).then(() => {
      console.log('[RollupManager] All rollups terminated');
    }).catch(error => {
      console.error('[RollupManager] Error during shutdown:', error);
    });
  }
}