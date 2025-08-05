import { Connection } from '@solana/web3.js';
import {
  RollupInstance,
  RollupSession,
  ConnectionHealth,
  RollupConfig,
} from '@/types/magicblock.types';
import {
  IRollupConnectionManager,
  IRollupProvisioner,
  IHealthChecker,
} from '@/interfaces/rollup-connection.interface';
import {
  MAGICBLOCK_ROLLUP_ENDPOINT,
  ROLLUP_MAX_INSTANCES,
  ROLLUP_SESSION_TIMEOUT,
} from '@/constants';
import { ConnectionUtil } from './connection';

export class RollupConnectionManager
  implements IRollupConnectionManager, IRollupProvisioner, IHealthChecker
{
  private rollupInstances: Map<string, RollupInstance> = new Map();
  private rollupSessions: Map<string, RollupSession> = new Map();
  private connections: Map<string, Connection> = new Map();
  private healthStatus: Map<string, ConnectionHealth> = new Map();
  private config: RollupConfig;

  constructor() {
    this.config = {
      maxInstances: parseInt(ROLLUP_MAX_INSTANCES),
      sessionTimeout: parseInt(ROLLUP_SESSION_TIMEOUT),
      autoProvision: true,
      targetLatency: 50,
      maxConcurrentUsers: 1000,
    };
  }

  // IRollupConnectionManager implementation
  public async getConnection(gameId?: string): Promise<Connection> {
    if (!gameId) {
      return ConnectionUtil.getConnection();
    }

    // Check if we have an existing connection for this game
    const existingConnection = this.connections.get(gameId);
    if (
      existingConnection &&
      (await this.isEndpointHealthy(this.getRollupEndpoint(gameId)))
    ) {
      return existingConnection;
    }

    // Try to get or create a rollup instance
    let rollupInstance = this.rollupInstances.get(gameId);
    if (!rollupInstance) {
      rollupInstance = await this.provisionRollup(gameId);
    }

    // Create connection to the rollup
    const connection = new Connection(rollupInstance.endpoint, 'confirmed');
    this.connections.set(gameId, connection);

    return connection;
  }

  public async getRoutingDecision(): Promise<any> {
    // This will be implemented in the transaction router
    throw new Error('Method not implemented in this class');
  }

  public async createRollupSession(gameId: string): Promise<RollupSession> {
    const sessionId = `session_${gameId}_${Date.now()}`;

    // Get or create rollup instance
    let rollupInstance = this.rollupInstances.get(gameId);
    if (!rollupInstance) {
      rollupInstance = await this.provisionRollup(gameId);
    }

    const session: RollupSession = {
      id: sessionId,
      rollupId: rollupInstance.id,
      gameId,
      users: [],
      startTime: new Date(),
      status: 'active',
    };

    this.rollupSessions.set(sessionId, session);

    // Update rollup instance with game association
    rollupInstance.gameId = gameId;
    rollupInstance.lastUsed = new Date();

    console.log(
      `[RollupConnectionManager] Created rollup session ${sessionId} for game ${gameId}`,
    );
    return session;
  }

  public async terminateRollupSession(sessionId: string): Promise<void> {
    const session = this.rollupSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'ended';
    session.endTime = new Date();

    // Clean up associated rollup if no other sessions are using it
    const rollupInstance = this.rollupInstances.get(session.rollupId);
    if (rollupInstance) {
      const activeSessions = Array.from(this.rollupSessions.values()).filter(
        (s) => s.rollupId === session.rollupId && s.status === 'active',
      );

      if (activeSessions.length === 0) {
        await this.terminateRollup(session.rollupId);
      }
    }

    this.rollupSessions.delete(sessionId);
    console.log(
      `[RollupConnectionManager] Terminated rollup session ${sessionId}`,
    );
  }

  // IRollupProvisioner implementation
  public async provisionRollup(gameId: string): Promise<RollupInstance> {
    // Check if we've reached the maximum number of instances
    const activeOrProvisioningInstances = Array.from(this.rollupInstances.values()).filter(
      (instance) => instance.status === 'active' || instance.status === 'provisioning',
    );

    if (activeOrProvisioningInstances.length >= this.config.maxInstances) {
      throw new Error(
        `Maximum rollup instances (${this.config.maxInstances}) reached`,
      );
    }

    const rollupId = `rollup_${gameId}_${Date.now()}`;
    const rollupInstance: RollupInstance = {
      id: rollupId,
      endpoint: this.getRollupEndpoint(gameId),
      status: 'provisioning',
      createdAt: new Date(),
      lastUsed: new Date(),
      gameId,
      userCount: 0,
    };

    this.rollupInstances.set(rollupId, rollupInstance);

    // Simulate rollup provisioning (in real implementation, this would call MagicBlock API)
    setTimeout(() => {
      rollupInstance.status = 'active';
      console.log(`[RollupConnectionManager] Rollup ${rollupId} is now active`);
    }, 1000);

    console.log(
      `[RollupConnectionManager] Provisioning rollup ${rollupId} for game ${gameId}`,
    );
    return rollupInstance;
  }

  public async terminateRollup(rollupId: string): Promise<void> {
    const rollupInstance = this.rollupInstances.get(rollupId);
    if (!rollupInstance) {
      throw new Error(`Rollup ${rollupId} not found`);
    }

    rollupInstance.status = 'terminating';

    // Clean up connections
    if (rollupInstance.gameId) {
      this.connections.delete(rollupInstance.gameId);
      this.healthStatus.delete(rollupInstance.endpoint);
    }

    // Simulate termination delay
    setTimeout(() => {
      rollupInstance.status = 'terminated';
      this.rollupInstances.delete(rollupId);
      console.log(`[RollupConnectionManager] Rollup ${rollupId} terminated`);
    }, 2000);

    console.log(`[RollupConnectionManager] Terminating rollup ${rollupId}`);
  }

  public async scaleRollup(
    rollupId: string,
    targetUsers: number,
  ): Promise<void> {
    const rollupInstance = this.rollupInstances.get(rollupId);
    if (!rollupInstance) {
      throw new Error(`Rollup ${rollupId} not found`);
    }

    rollupInstance.userCount = targetUsers;
    rollupInstance.lastUsed = new Date();

    console.log(
      `[RollupConnectionManager] Scaled rollup ${rollupId} to ${targetUsers} users`,
    );
  }

  public async getRollupStatus(rollupId: string): Promise<RollupInstance> {
    const rollupInstance = this.rollupInstances.get(rollupId);
    if (!rollupInstance) {
      throw new Error(`Rollup ${rollupId} not found`);
    }
    return { ...rollupInstance };
  }

  public async listActiveRollups(): Promise<RollupInstance[]> {
    return Array.from(this.rollupInstances.values())
      .filter((instance) => instance.status === 'active')
      .map((instance) => ({ ...instance }));
  }

  // IHealthChecker implementation
  public async checkEndpointHealth(
    endpoint: string,
  ): Promise<ConnectionHealth> {
    const startTime = Date.now();
    let isHealthy = false;
    let errorCount = 0;

    try {
      const connection = new Connection(endpoint, 'confirmed');
      await connection.getLatestBlockhash();
      isHealthy = true;
    } catch (error) {
      console.error(
        `[RollupConnectionManager] Health check failed for ${endpoint}:`,
        error,
      );
      errorCount = 1;
    }

    const latency = Date.now() - startTime;
    const health: ConnectionHealth = {
      endpoint,
      isHealthy,
      latency,
      lastChecked: new Date(),
      errorCount,
    };

    this.healthStatus.set(endpoint, health);
    return health;
  }

  public monitorConnectionHealth(): void {
    const checkInterval = 30000; // 30 seconds

    setInterval(async () => {
      for (const rollupInstance of this.rollupInstances.values()) {
        if (rollupInstance.status === 'active') {
          await this.checkEndpointHealth(rollupInstance.endpoint);
        }
      }
    }, checkInterval);

    console.log(
      '[RollupConnectionManager] Started connection health monitoring',
    );
  }

  public async getHealthReport(): Promise<ConnectionHealth[]> {
    return Array.from(this.healthStatus.values());
  }

  public async isEndpointHealthy(endpoint: string): Promise<boolean> {
    const health = this.healthStatus.get(endpoint);
    if (!health) {
      const freshHealth = await this.checkEndpointHealth(endpoint);
      return freshHealth.isHealthy;
    }

    // Consider stale if older than 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    if (health.lastChecked < oneMinuteAgo) {
      const freshHealth = await this.checkEndpointHealth(endpoint);
      return freshHealth.isHealthy;
    }

    return health.isHealthy;
  }

  // Helper methods
  private getRollupEndpoint(gameId: string): string {
    // In a real implementation, this would be provided by MagicBlock
    return `${MAGICBLOCK_ROLLUP_ENDPOINT}/game/${gameId}`;
  }

  public async measurePerformance(): Promise<any> {
    // This will be implemented in the performance monitor class
    throw new Error('Method not implemented in this class');
  }

  public async getHealthStatus(): Promise<ConnectionHealth[]> {
    return this.getHealthReport();
  }
}
